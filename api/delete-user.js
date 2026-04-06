/**
 * Kaizen Dental Academy — Delete User Account
 * Vercel Serverless Function: POST /api/delete-user
 *
 * Permanently deletes a user from Supabase Auth (and cascades to profiles).
 * Requires admin JWT to call.
 *
 * Required Vercel Environment Variables:
 *   SUPABASE_URL         - Supabase project URL
 *   SUPABASE_SERVICE_KEY - Supabase service role key (NOT anon key)
 */

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const SB_URL = process.env.SUPABASE_URL;
    const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SB_URL || !SB_SERVICE_KEY) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // ── Verify caller is admin ──
    const authHeader = req.headers.authorization || '';
    const callerToken = authHeader.replace('Bearer ', '').trim();
    if (!callerToken) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const userRes = await fetch(`${SB_URL}/auth/v1/user`, {
            headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${callerToken}` }
        });
        if (!userRes.ok) return res.status(401).json({ error: 'Invalid session' });
        const caller = await userRes.json();

        const profileRes = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${caller.id}&select=role`, {
            headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
        });
        const profiles = await profileRes.json();
        if (!profiles?.[0] || profiles[0].role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: 'user_id required' });

        // Prevent self-deletion
        if (user_id === caller.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Delete from Supabase Auth (cascades to profiles via FK)
        const deleteRes = await fetch(`${SB_URL}/auth/v1/admin/users/${user_id}`, {
            method: 'DELETE',
            headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
        });

        if (!deleteRes.ok && deleteRes.status !== 404) {
            const err = await deleteRes.text();
            console.error('Delete user error:', err);
            return res.status(500).json({ error: 'Failed to delete user' });
        }

        // Also clean up permissions row if exists
        await fetch(`${SB_URL}/rest/v1/permissions?user_id=eq.${user_id}`, {
            method: 'DELETE',
            headers: { 'apikey': SB_SERVICE_KEY, 'Authorization': `Bearer ${SB_SERVICE_KEY}` }
        });

        return res.status(200).json({ success: true });

    } catch (e) {
        console.error('delete-user error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
