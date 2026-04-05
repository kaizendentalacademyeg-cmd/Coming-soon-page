/**
 * Kaizen Dental Academy — Maintenance Mode Check
 * Add this script to all public pages to enable maintenance mode redirect.
 * Admin users who logged in via the maintenance page bypass are not redirected.
 */
(function() {
    'use strict';
    // Skip check on maintenance.html and admin.html
    const path = window.location.pathname;
    if (path.includes('maintenance.html') || path.includes('admin.html')) return;

    const SUPABASE_URL = 'https://cwkohmqprgcfyzcjcqsn.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3a29obXFwcmdjZnl6Y2pjcXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NjE5NTksImV4cCI6MjA1OTQzNzk1OX0.LDzMjFcOeGhdfPpOm9qJBA4bEgOLpqRKfE4HeN_7-Lk';

    async function checkMaintenance() {
        try {
            // Check if user is admin (bypass maintenance)
            const sessionRaw = localStorage.getItem('kaizen_session');
            if (sessionRaw) {
                const session = JSON.parse(sessionRaw);
                if (session?.access_token && session.expires_at > Date.now()) {
                    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user?.id}&select=role`, {
                        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${session.access_token}` }
                    });
                    const data = await res.json();
                    if (data?.[0]?.role === 'admin') return; // Admin bypass
                }
            }

            // Check maintenance mode setting
            const res = await fetch(`${SUPABASE_URL}/rest/v1/site_settings?key=eq.maintenance_mode&select=value`, {
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            const data = await res.json();
            if (data?.[0]?.value === 'true' || data?.[0]?.value === true) {
                window.location.replace('maintenance.html');
            }
        } catch (e) {
            // On error, don't block the site — just log silently
            console.warn('Maintenance check failed:', e);
        }
    }

    checkMaintenance();
})();
