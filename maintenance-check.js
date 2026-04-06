/**
 * Kaizen Dental Academy — Maintenance Mode Check
 * Hides page immediately, checks Supabase, redirects or reveals.
 */
(function() {
    'use strict';
    var path = window.location.pathname;
    if (path.includes('maintenance.html') || path.includes('admin.html') || path.includes('my-account.html')) return;

    // Hide page instantly to prevent ghosting
    document.documentElement.style.visibility = 'hidden';

    var SB_URL = 'https://cwkohmqprgcfyzcjcqsn.supabase.co';
    var SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3a29obXFwcmdjZnl6Y2pjcXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODM5NzEsImV4cCI6MjA5MDk1OTk3MX0.zpiIrHKCEjPy8baKUzY-kh9ALMrqeETcXzdC3lVIIcY';

    function reveal() {
        document.documentElement.style.visibility = '';
    }

    async function checkMaintenance() {
        try {
            // Admin bypass
            var sessionRaw = localStorage.getItem('kda_session');
            if (sessionRaw) {
                try {
                    var session = JSON.parse(sessionRaw);
                    if (session && session.access_token && session.expires_at > Date.now()) {
                        var profileRes = await fetch(SB_URL + '/rest/v1/profiles?id=eq.' + session.user.id + '&select=role', {
                            headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + session.access_token }
                        });
                        var profileData = await profileRes.json();
                        if (profileData && profileData[0] && (profileData[0].role === 'admin' || profileData[0].role === 'employee')) {
                            reveal();
                            return;
                        }
                    }
                } catch(e) { /* ignore */ }
            }

            // Check maintenance mode
            var res = await fetch(SB_URL + '/rest/v1/site_settings?key=eq.maintenance_mode&select=value', {
                headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
            });

            if (!res.ok) { reveal(); return; }

            var data = await res.json();

            if (data && data[0]) {
                var val = data[0].value;
                var str = typeof val === 'string' ? val.replace(/"/g, '') : String(val);
                if (str === 'true') {
                    window.location.replace('maintenance.html');
                    return; // Don't reveal — we're redirecting
                }
            }

            reveal();
        } catch (e) {
            reveal(); // On error, show the site
        }
    }

    // Safety: always reveal after 3s even if check hangs
    setTimeout(reveal, 3000);

    checkMaintenance();
})();
