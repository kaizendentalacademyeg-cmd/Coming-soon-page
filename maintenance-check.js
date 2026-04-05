/**
 * Kaizen Dental Academy — Maintenance Mode Check
 * Add this script to all public pages to enable maintenance mode redirect.
 * Admin users who logged in via the maintenance page bypass are not redirected.
 */
(function() {
    'use strict';
    // Skip check on maintenance.html and admin.html
    var path = window.location.pathname;
    if (path.includes('maintenance.html') || path.includes('admin.html')) return;

    var SB_URL = 'https://cwkohmqprgcfyzcjcqsn.supabase.co';
    var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3a29obXFwcmdjZnl6Y2pjcXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4NjE5NTksImV4cCI6MjA1OTQzNzk1OX0.LDzMjFcOeGhdfPpOm9qJBA4bEgOLpqRKfE4HeN_7-Lk';

    async function checkMaintenance() {
        try {
            // Check if user is admin (bypass maintenance)
            var sessionRaw = localStorage.getItem('kaizen_session');
            if (sessionRaw) {
                try {
                    var session = JSON.parse(sessionRaw);
                    if (session && session.access_token && session.expires_at > Date.now()) {
                        var profileRes = await fetch(SB_URL + '/rest/v1/profiles?id=eq.' + session.user.id + '&select=role', {
                            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + session.access_token }
                        });
                        var profileData = await profileRes.json();
                        if (profileData && profileData[0] && (profileData[0].role === 'admin' || profileData[0].role === 'employee')) return;
                    }
                } catch(e) { /* ignore parse errors */ }
            }

            // Check maintenance mode setting
            var res = await fetch(SB_URL + '/rest/v1/site_settings?key=eq.maintenance_mode&select=value', {
                headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
            });
            var data = await res.json();

            if (data && data[0]) {
                var val = data[0].value;
                // Handle JSONB: value could be true, "true", '"true"', etc.
                var isEnabled = val === true || val === 'true' || val === '"true"';
                if (isEnabled) {
                    window.location.replace('maintenance.html');
                }
            }
        } catch (e) {
            console.warn('Maintenance check failed:', e);
        }
    }

    checkMaintenance();
})();
