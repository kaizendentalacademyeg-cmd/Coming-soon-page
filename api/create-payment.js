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

// ── Security: UUID format validator ──
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Security: In-memory rate limiter (per serverless instance) ──
const rateMap = new Map();
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT = 60; // max requests per window per IP

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateMap.get(ip);
    if (!entry || now - entry.start > RATE_WINDOW_MS) {
        rateMap.set(ip, { start: now, count: 1 });
        return true;
    }
    entry.count++;
    if (entry.count > RATE_LIMIT) return false;
    return true;
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateMap) {
        if (now - entry.start > RATE_WINDOW_MS) rateMap.delete(ip);
    }
}, 5 * 60 * 1000).unref?.();

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // ── Security: Rate limiting ──
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Too many payment requests. Please wait a few minutes.' });
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

        // ── Security: Validate UUID format to prevent injection ──
        if (!UUID_RE.test(courseId) || !UUID_RE.test(userId)) {
            return res.status(400).json({ error: 'Invalid course or user identifier' });
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

        // ── 4. Fetch user profile ──
        const profileRes = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${userId}&select=first_name,last_name,phone`, {
            headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
        });
        const profiles = profileRes.ok ? await profileRes.json() : [];
        const profile = profiles?.[0] || {};
        
        const email = authUser?.email || `student+${userId.slice(0, 8)}@kaizendentalacademy.org`;
        
        // Clean up name and phone fields to comply with Paymob validation requirements
        const cleanFirstName = (profile.first_name || authUser?.user_metadata?.full_name?.split(' ')[0] || authUser?.user_metadata?.first_name || 'Student').trim() || 'Student';
        const cleanLastName  = (profile.last_name  || authUser?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || authUser?.user_metadata?.last_name || 'Kaizen').trim() || 'Kaizen';
        let cleanPhone = (profile.phone || authUser?.phone || '01000000000').trim().replace(/[^\d+]/g, '');
        if (!cleanPhone) cleanPhone = '01000000000';

        // ── 5. Create or reuse pending enrollment row ──
        // Check if user already has an enrollment for this course
        const existingRes = await fetch(
            `${SB_URL}/rest/v1/enrollments?user_id=eq.${userId}&course_id=eq.${courseId}&select=id,payment_status`,
            { headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` } }
        );
        
        if (!existingRes.ok) {
            const errText = await existingRes.text();
            console.error('Failed to check existing enrollment:', errText);
            return res.status(500).json({ error: 'Failed to verify enrollment status' });
        }
        
        const enrollments = await existingRes.json();
        const existingEnrollment = enrollments?.[0];

        let enrollmentId;
        if (existingEnrollment) {
            if (existingEnrollment.payment_status === 'paid') {
                return res.status(400).json({ error: 'You are already enrolled in this course' });
            }
            
            // Reuse existing enrollment and update it to pending Paymob status
            enrollmentId = existingEnrollment.id;
            const updateRes = await fetch(`${SB_URL}/rest/v1/enrollments?id=eq.${enrollmentId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SB_SERVICE_KEY,
                    'Authorization': `Bearer ${SB_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    payment_method: 'paymob',
                    payment_status: 'pending',
                    pricing_tier: tierName,
                    amount_paid: priceEGP,
                    notes: `Paymob checkout re-initiated — tier: ${tierName}`
                })
            });
            if (!updateRes.ok) {
                const errText = await updateRes.text();
                console.error('Failed to update enrollment:', errText);
                return res.status(500).json({ error: 'Failed to update enrollment record' });
            }
        } else {
            // Create new enrollment row
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

        const intentionBody = {
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
                    first_name: cleanFirstName,
                    last_name:  cleanLastName,
                    email:      email,
                    phone_number: cleanPhone,
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
        };

        console.log('Paymob intention request:', JSON.stringify({ amount: amountCents, tier: tierName, courseId }));

        const intentionRes = await fetch('https://accept.paymob.com/v1/intention/', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${PAYMOB_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(intentionBody)
        });

        const intention = await intentionRes.json();

        if (!intentionRes.ok || !intention.client_secret) {
            console.error('Paymob intention failed:', intentionRes.status, JSON.stringify(intention));
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
            // Security: only log details server-side, never expose to frontend
            return res.status(502).json({ error: 'Failed to create payment. Please try again or contact support.' });
        }

        // ── 7. Return checkout URL ──
        const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${PAYMOB_PUBLIC_KEY}&clientSecret=${intention.client_secret}`;
        return res.status(200).json({ payment_url: checkoutUrl });

    } catch (error) {
        console.error('Payment creation error:', error);
        // Security: never expose stack traces or error internals to the client
        return res.status(500).json({ error: 'Internal server error' });
    }
}
