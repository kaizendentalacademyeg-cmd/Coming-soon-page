/**
 * Kaizen Dental Academy — Paymob Payment Intention Creator
 * Vercel Serverless Function: POST /api/create-payment
 *
 * Creates a Paymob payment intention and redirects the user to the checkout page.
 *
 * Required Vercel Environment Variables:
 *   PAYMOB_SECRET_KEY     - Secret key from Paymob Dashboard
 *   PAYMOB_INTEGRATION_ID - Integration ID for card payments
 *   SUPABASE_URL          - Supabase project URL
 *   SUPABASE_SERVICE_KEY  - Supabase service role key (NOT anon key)
 */

export default async function handler(req, res) {
    // Only allow GET (redirect flow) or POST
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const PAYMOB_SECRET = process.env.PAYMOB_SECRET_KEY;
    const INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID;
    const SB_URL = process.env.SUPABASE_URL;
    const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    const SITE_URL = process.env.SITE_URL || 'https://kaizendentalacademy.org';

    if (!PAYMOB_SECRET || !INTEGRATION_ID) {
        return res.status(500).json({ error: 'Paymob not configured' });
    }

    try {
        // ── Verify caller's identity via JWT ──
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace('Bearer ', '');
        const courseId = req.query.course_id || req.body?.course_id;
        const userId = req.query.user_id || req.body?.user_id;
        const selectedTier = req.query.tier || req.body?.tier || null;

        if (!courseId || !userId) {
            return res.status(400).json({ error: 'Missing course_id or user_id' });
        }

        // Validate the JWT belongs to the claimed user
        if (token && SB_URL) {
            const userRes = await fetch(`${SB_URL}/auth/v1/user`, {
                headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${token}` }
            });
            const authUser = await userRes.json();
            if (!authUser?.id || authUser.id !== userId) {
                return res.status(403).json({ error: 'Unauthorized — user mismatch' });
            }
        }

        // Fetch course details from Supabase
        const courseRes = await fetch(`${SB_URL}/rest/v1/courses?id=eq.${courseId}&select=id,title,slug,pricing_tiers`, {
            headers: {
                'apikey': SB_SERVICE_KEY,
                'Authorization': `Bearer ${SB_SERVICE_KEY}`
            }
        });
        const courses = await courseRes.json();
        const course = courses?.[0];

        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }

        // Determine price from pricing_tiers — use selected tier if provided, else first
        let priceEGP = 0;
        let tierName = 'Standard';
        if (Array.isArray(course.pricing_tiers) && course.pricing_tiers.length > 0) {
            let tier = course.pricing_tiers[0]; // default to first
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

        // Fetch user profile from Supabase
        const profileRes = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${userId}&select=first_name,last_name,phone`, {
            headers: {
                'apikey': SB_SERVICE_KEY,
                'Authorization': `Bearer ${SB_SERVICE_KEY}`
            }
        });
        const profiles = await profileRes.json();
        const profile = profiles?.[0] || {};

        // Fetch user email from auth
        const authRes = await fetch(`${SB_URL}/auth/v1/admin/users/${userId}`, {
            headers: {
                'apikey': SB_SERVICE_KEY,
                'Authorization': `Bearer ${SB_SERVICE_KEY}`
            }
        });
        const authUser = await authRes.json();
        const email = authUser?.email || 'student@kaizendentalacademy.org';

        // Amount in cents (Paymob requires smallest currency unit)
        const amountCents = Math.round(priceEGP * 100);

        // Create Paymob Payment Intention
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
                    description: `${tierName} - ${course.title}`,
                    quantity: 1
                }],
                billing_data: {
                    first_name: profile.first_name || 'Student',
                    last_name: profile.last_name || 'Kaizen',
                    email: email,
                    phone_number: profile.phone || '01000000000',
                    apartment: 'NA',
                    floor: 'NA',
                    street: 'NA',
                    building: 'NA',
                    shipping_method: 'NA',
                    postal_code: 'NA',
                    city: 'Cairo',
                    country: 'EG',
                    state: 'NA'
                },
                extras: {
                    user_id: userId,
                    course_id: courseId,
                    tier: tierName
                },
                redirection_url: `${SITE_URL}/payment-callback.html`,
                notification_url: `${SITE_URL}/api/paymob-webhook`
            })
        });

        const intention = await intentionRes.json();

        if (!intentionRes.ok || !intention.client_secret) {
            console.error('Paymob intention error:', JSON.stringify(intention));
            return res.status(502).json({ error: 'Failed to create payment. Please try again or contact support.' });
        }

        // Return the checkout URL as JSON so the frontend can redirect
        const checkoutUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${process.env.PAYMOB_PUBLIC_KEY}&clientSecret=${intention.client_secret}`;

        return res.status(200).json({ payment_url: checkoutUrl });

    } catch (error) {
        console.error('Payment creation error:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}
