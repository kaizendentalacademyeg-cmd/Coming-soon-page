/**
 * Kaizen Dental Academy — Create Employee Account
 * Vercel Serverless Function: POST /api/create-employee
 *
 * Creates a new employee auth user, sets their profile role to 'employee',
 * and inserts their permissions row. Requires admin JWT to call.
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

    // ── Verify caller is an admin ──
    const authHeader = req.headers.authorization || '';
    const callerToken = authHeader.replace('Bearer ', '').trim();
    if (!callerToken) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Verify the caller's token and check admin role
        const userRes = await fetch(`${SB_URL}/auth/v1/user`, {
            headers: {
                'apikey': SB_SERVICE_KEY,
                'Authorization': `Bearer ${callerToken}`
            }
        });
        if (!userRes.ok) return res.status(401).json({ error: 'Invalid session' });
        const caller = await userRes.json();

        const profileRes = await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${caller.id}&select=role`, {
            headers: {
                'apikey': SB_SERVICE_KEY,
                'Authorization': `Bearer ${SB_SERVICE_KEY}`
            }
        });
        const profiles = await profileRes.json();
        if (!profiles?.[0] || profiles[0].role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // ── Parse request body ──
        const { email, password, first_name, last_name, permissions = {} } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // ── Create auth user (service role) ──
        const createRes = await fetch(`${SB_URL}/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
                'apikey': SB_SERVICE_KEY,
                'Authorization': `Bearer ${SB_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                email_confirm: true, // auto-confirm so employee can log in immediately
                user_metadata: { first_name, last_name }
            })
        });

        const createData = await createRes.json();
        if (!createRes.ok || createData.error) {
            const msg = createData.message || createData.error || 'Failed to create user';
            return res.status(400).json({ error: msg });
        }

        const newUserId = createData.id;

        // ── Set role to 'employee' in profiles (upsert) ──
        await fetch(`${SB_URL}/rest/v1/profiles?id=eq.${newUserId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SB_SERVICE_KEY,
                'Authorization': `Bearer ${SB_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                role: 'employee',
                first_name: first_name || '',
                last_name: last_name || ''
            })
        });

        // ── Insert permissions row ──
        const permRow = {
            user_id: newUserId,
            can_manage_blogs: !!permissions.can_manage_blogs,
            can_manage_courses: !!permissions.can_manage_courses,
            can_manage_members: !!permissions.can_manage_members,
            can_manage_enrollments: !!permissions.can_manage_enrollments,
            can_manage_policies: !!permissions.can_manage_policies,
            can_manage_settings: !!permissions.can_manage_settings,
            can_view_audit_log: !!permissions.can_view_audit_log
        };

        const permRes = await fetch(`${SB_URL}/rest/v1/permissions`, {
            method: 'POST',
            headers: {
                'apikey': SB_SERVICE_KEY,
                'Authorization': `Bearer ${SB_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(permRow)
        });

        if (!permRes.ok) {
            // Non-fatal: user exists, permissions can be added later
            console.warn('Permissions insert failed:', await permRes.text());
        }

        return res.status(200).json({ success: true, user_id: newUserId });

    } catch (e) {
        console.error('create-employee error:', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
