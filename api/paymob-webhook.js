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
            console.error('HMAC mismatch — rejecting webhook');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Extract transaction details
        const transactionId = obj.id;
        const success = obj.success === true || obj.success === 'true';
        const amountCents = obj.amount_cents;
        const orderId = obj.order?.id || obj.order;

        // Paymob Intention API stores extras as obj.extras OR obj.extra (singular) OR obj.order.extras
        // We pass both keys in create-payment.js for compatibility — read all possible locations
        const extras = obj.extras || obj.extra || obj.order?.extras || obj.order?.extra || {};
        const userId       = extras.user_id;
        const courseId     = extras.course_id;
        const enrollmentId = extras.enrollment_id;

        console.log(`Webhook: txn=${transactionId}, success=${success}, enrollment=${enrollmentId}, user=${userId}, course=${courseId}`);

        const paymentStatus = success ? 'paid' : 'failed';
        const patchBody = JSON.stringify({
            payment_status: paymentStatus,
            amount_paid: amountCents ? (amountCents / 100) : null,
            notes: `Paymob txn: ${transactionId} | Order: ${orderId} | Status: ${paymentStatus}`
        });
        const patchHeaders = {
            'apikey': SB_SERVICE_KEY,
            'Authorization': `Bearer ${SB_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };

        let updateRes;
        if (enrollmentId) {
            // Prefer direct lookup by enrollment_id — most reliable
            updateRes = await fetch(
                `${SB_URL}/rest/v1/enrollments?id=eq.${enrollmentId}`,
                { method: 'PATCH', headers: patchHeaders, body: patchBody }
            );
        } else if (userId && courseId) {
            // Fallback: find most recent pending Paymob enrollment for this user+course
            updateRes = await fetch(
                `${SB_URL}/rest/v1/enrollments?user_id=eq.${userId}&course_id=eq.${courseId}&payment_method=eq.paymob&payment_status=eq.pending&order=created_at.desc&limit=1`,
                { method: 'PATCH', headers: patchHeaders, body: patchBody }
            );
        } else {
            console.warn('Webhook missing enrollment_id, user_id, and course_id — cannot update enrollment');
            return res.status(200).json({ received: true, note: 'No enrollment mapping found' });
        }

        if (!updateRes.ok) {
            const errText = await updateRes.text();
            console.error('Supabase enrollment update failed:', errText);
        } else {
            const updated = await updateRes.json();
            console.log(`Enrollment updated: status=${paymentStatus}, rows=${updated?.length ?? 0}`);
        }

        // Always return 200 to Paymob so they don't retry
        return res.status(200).json({ received: true, status: paymentStatus });

    } catch (error) {
        console.error('Webhook error:', error);
        // Still return 200 to prevent Paymob retries
        return res.status(200).json({ received: true, error: error.message });
    }
}
