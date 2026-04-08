/**
 * Kaizen Dental Academy — Paymob Payment Intention Creator
 * Vercel Serverless Function: GET /api/create-payment
 *
 * 1. Validates the caller's JWT against Supabase
 * 2. Creates (or reuses) a pending enrollment row in Supabase
 * 3. Creates a Paymob payment intention
 * 4. Returns { payment_url } for the frontend to redirect to
 *
 * Required Vercel Environment Variables:
 *   PAYMOB_SECRET_KEY     - Secret key from Paymob Dashboard
 *   PAYMOB_PUBLIC_KEY     - Public key from Paymob Dashboard
 *   PAYMOB_INTEGRATION_ID - Integration ID for card payments
 *   SUPABASE_URL          - Supabase project URL
 *   SUPABASE_SERVICE_KEY  - Supabase service role key (NOT anon key)
 *   SITE_URL              - e.g. https://www.kaizendentalacademy.org
 */

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const PAYMOB_SECRET = process.env.PAYMOB_SECRET_KEY;
    const PAYMOB_PUBLIC_KEY = process.env.PAYMOB_PUBLIC_KEY;
    const INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
    const SB_URL = process.env.SUPABASE_URL;
    const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const SITE_URL = (process.env.SITE_URL || 'https://www.kaizendentalacademy.org').replace(/\/$/, '');

    // Validate all required env vars up front
    if (!PAYMOB_SECRET || !PAYMOB_PUBLIC_KEY || !INTEGRATION_ID) {
        console.error('Missing Paymob env vars');
        return res.status(500).json({ error: 'Payment gateway not configured' });
    }
    if (!SB_URL || !SB_SERVICE_KEY) {
        console.error('Missing Supabase env vars');
        return res.status(500).json({ error: 'Database not configured' });
    }

    try {
        // ── 1. Parse & validate inputs ──
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace('Bearer ', '').trim();
        const courseId = req.query.course_id || req.body?.course_id;
        const userId   = req.query.user_id   || req.body?.user_id;
        const selectedTier = req.query.tier  || req.body?.tier || null;

        if (!courseId || !userId) {
            return res.status(400).json({ error: 'Missing course_id or user_id' });
        }

        // ── 2. Verify JWT belongs to the claimed user ──
        if (!token) {
            return res.status(401).json({ error: 'Authorization token required' });
        }
        const userRes = await fetch(`${SB_URL}/auth/v1/user`, {
            headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${token}` }
        });
        if (!userRes.ok) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        const authUser = await userRes.json();
        if (!authUser?.id || authUser.id !== userId) {
            return res.status(403).json({ error: 'Unauthorized — user mismatch' });
        }

        // ── 3. Fetch course details & resolve price ──
        const courseRes = await fetch(
            `${SB_URL}/rest/v1/courses?id=eq.${courseId}&select=id,title,slug,pricing_tiers`,
            { headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` } }
        );
        const courses = await courseRes.json();
        const course = courses?.[0];
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        let priceEGP = 0;
        let tierName = 'Standard';
        if (Array.isArray(course.pricing_tiers) && course.pricing_tiers.length > 0) {
            let tier = course.pricing_tiers[0];
            if (selectedTier) {
                const match = course.pricing_tiers.find(t =>
                    t.name && t.name.toLowerCase().replace(/\s+/g, '_') === selectedTier.toLowerCase()
                );
                if (match) tier = match;
            }
            priceEGP = Number(tier.price) || 0;
            tierName = tier.name || 'Standard';
        }
        if (priceEGP <= 0) {
            return res.status(400).json({ error: 'Course has no price configured' });
        }

        // ── 4. Fetch user profile & email ──
        const [profileRes, authInfoRes] = await Promise.all([
            fetch(`${SB_URL}/rest/v1/profiles?id=eq.${userId}&select=first_name,last_name,phone`, {
                headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
            }),
            fetch(`${SB_URL}/auth/v1/admin/users/${userId}`, {
                headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
            })
        ]);
        const profiles = await profileRes.json();
        const profile = profiles?.[0] || {};
        const authInfo = await authInfoRes.json();
        const email = authInfo?.email || `student+${userId.slice(0,8)}@kaizendentalacademy.org`;

        // ── 5. Create or reuse pending enrollment row ──
        // Prevents duplicate payments: if a pending Paymob enrollment exists, reuse it.
        const existingRes = await fetch(
            `${SB_URL}/rest/v1/enrollments?user_id=eq.${userId}&course_id=eq.${courseId}&payment_method=eq.paymob&payment_status=eq.pending&select=id&limit=1`,
            { headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` } }
        );
        const existing = await existingRes.json();

        let enrollmentId;
        if (existing?.length > 0) {
            enrollmentId = existing[0].id;
        } else {
            const insertRes = await fetch(`${SB_URL}/rest/v1/enrollments`, {
                method: 'POST',
                headers: {
                    'apikey': SB_SERVICE_KEY,
                    'Authorization': `Bearer ${SB_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    user_id: userId,
                    course_id: courseId,
                    payment_method: 'paymob',
                    payment_status: 'pending',
                    pricing_tier: tierName,
                    amount_paid: priceEGP,
                    notes: `Paymob checkout initiated — tier: ${tierName}`
                })
            });
            if (!insertRes.ok) {
                const errText = await insertRes.text();
                console.error('Failed to create enrollment:', errText);
                return res.status(500).json({ error: 'Failed to create enrollment record' });
            }
            const inserted = await insertRes.json();
            enrollmentId = inserted?.[0]?.id;
        }

        // ── 6. Create Paymob payment intention ──
        const amountCents = Math.round(priceEGP * 100);

        const intentionRes = await fetch('https://accept.paymob.com/v1/intention/', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${PAYMOB_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amountCents,
                currency: 'EGP',
                payment_methods: [parseInt(INTEGRATION_ID)],
                items: [{
                    name: course.title || 'Kaizen Course',
                    amount: amountCents,
                    description: `${tierName} — ${course.title}`,
                    quantity: 1
                }],
                billing_data: {
                    first_name: profile.first_name || authInfo?.user_metadata?.full_name?.split(' ')[0] || 'Student',
                    last_name:  profile.last_name  || authInfo?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'Kaizen',
                    email:      email,
                    phone_number: profile.phone || '01000000000',
                    apartment: 'NA', floor: 'NA', street: 'NA', building: 'NA',
                    shipping_method: 'NA', postal_code: 'NA',
                    city: 'Cairo', country: 'EG', state: 'NA'
                },
                // extras are passed in both places for compatibility with classic & intention API webhooks
                extras: {
                    user_id:       userId,
                    course_id:     courseId,
                    enrollment_id: enrollmentId,
                    tier:          tierName
                },
                extra: {
                    user_id:       userId,
                    course_id:     courseId,
                    enrollment_id: enrollmentId,
                    tier:          tierName
                },
                redirection_url: `${SITE_URL}/payment-callback.html`,
                notification_url: `${SITE_URL}/api/paymob-webhook`
            })
        });

        const intention = await intentionRes.json();

        if (!intentionRes.ok || !intention.client_secret) {
            console.error('Paymob intention error:', JSON.stringify(intention));
            // Roll back the pending enrollment so user can retry cleanly
            if (enrollmentId) {
                await fetch(`${SB_URL}/rest/v1/enrollments?id=eq.${enrollmentId}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SB_SERVICE_KEY,
                        'Authorization': `Bearer ${SB_SERVICE_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ payment_status: 'failed', notes: 'Paymob intention creation failed' })
                });
            }
            return res.status(502).json({ error: 'Failed to create payment. Please try again or contact support.' });
        }

        // ── 7. Return checkout URL ──
        const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${PAYMOB_PUBLIC_KEY}&clientSecret=${intention.client_secret}`;
        return res.status(200).json({ payment_url: checkoutUrl });

    } catch (error) {
        console.error('Payment creation error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
