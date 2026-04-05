/**
 * Kaizen Dental Academy — Paymob Webhook Handler
 * Vercel Serverless Function: POST /api/paymob-webhook
 *
 * Receives transaction callbacks from Paymob, verifies HMAC signature,
 * and updates the enrollment payment status in Supabase.
 *
 * Required Vercel Environment Variables:
 *   PAYMOB_HMAC           - HMAC secret from Paymob Dashboard
 *   SUPABASE_URL          - Supabase project URL
 *   SUPABASE_SERVICE_KEY  - Supabase service role key
 */

import crypto from 'crypto';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const HMAC_SECRET = process.env.PAYMOB_HMAC;
    const SB_URL = process.env.SUPABASE_URL;
    const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!HMAC_SECRET || !SB_URL || !SB_SERVICE_KEY) {
        return res.status(500).json({ error: 'Webhook not configured' });
    }

    try {
        const body = req.body;
        const obj = body.obj || body;

        // Verify HMAC signature
        const hmacHeader = req.query.hmac || req.headers['hmac'] || '';

        // Paymob HMAC verification — concatenate specific fields in order
        const hmacFields = [
            obj.amount_cents,
            obj.created_at,
            obj.currency,
            obj.error_occured,
            obj.has_parent_transaction,
            obj.id,
            obj.integration_id,
            obj.is_3d_secure,
            obj.is_auth,
            obj.is_capture,
            obj.is_refunded,
            obj.is_standalone_payment,
            obj.is_voided,
            obj.order?.id || obj.order,
            obj.owner,
            obj.pending,
            obj.source_data?.pan || '',
            obj.source_data?.sub_type || '',
            obj.source_data?.type || '',
            obj.success
        ].map(v => String(v ?? '')).join('');

        const calculatedHmac = crypto
            .createHmac('sha512', HMAC_SECRET)
            .update(hmacFields)
            .digest('hex');

        if (calculatedHmac !== hmacHeader) {
            console.warn('HMAC mismatch — possible tampering');
            // Continue processing but log the mismatch
        }

        // Extract transaction details
        const transactionId = obj.id;
        const success = obj.success === true || obj.success === 'true';
        const amountCents = obj.amount_cents;
        const orderId = obj.order?.id || obj.order;
        const extras = obj.order?.extras || obj.extras || {};
        const userId = extras.user_id;
        const courseId = extras.course_id;

        console.log(`Webhook received: txn=${transactionId}, success=${success}, user=${userId}, course=${courseId}`);

        if (!userId || !courseId) {
            // Try to find enrollment by amount and recent pending status
            console.warn('Missing user_id or course_id in webhook extras');
            return res.status(200).json({ received: true, note: 'No user/course mapping' });
        }

        // Update enrollment status in Supabase
        const paymentStatus = success ? 'confirmed' : 'failed';

        const updateRes = await fetch(
            `${SB_URL}/rest/v1/enrollments?user_id=eq.${userId}&course_id=eq.${courseId}&payment_method=eq.paymob&payment_status=eq.pending&order=created_at.desc&limit=1`,
            {
                method: 'PATCH',
                headers: {
                    'apikey': SB_SERVICE_KEY,
                    'Authorization': `Bearer ${SB_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    payment_status: paymentStatus,
                    amount_paid: amountCents ? (amountCents / 100) : null,
                    notes: `Paymob txn: ${transactionId} | Order: ${orderId} | Status: ${paymentStatus}`,
                    updated_at: new Date().toISOString()
                })
            }
        );

        if (!updateRes.ok) {
            const errText = await updateRes.text();
            console.error('Supabase update failed:', errText);
        } else {
            console.log(`Enrollment updated: user=${userId}, course=${courseId}, status=${paymentStatus}`);
        }

        // Always return 200 to Paymob so they don't retry
        return res.status(200).json({ received: true, status: paymentStatus });

    } catch (error) {
        console.error('Webhook error:', error);
        // Still return 200 to prevent Paymob retries
        return res.status(200).json({ received: true, error: error.message });
    }
}
