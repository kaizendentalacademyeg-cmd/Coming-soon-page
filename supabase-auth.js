// Kaizen Dental Academy - Supabase Auth Module
// Shared authentication module used by all pages

const SUPABASE_URL = 'https://cwkohmqprgcfyzcjcqsn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3a29obXFwcmdjZnl6Y2pjcXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzODM5NzEsImV4cCI6MjA5MDk1OTk3MX0.zpiIrHKCEjPy8baKUzY-kh9ALMrqeETcXzdC3lVIIcY';

// Lightweight Supabase client (no SDK dependency - direct REST API)
const KaizenAuth = {
    _session: null,
    _listeners: [],

    // ─── Headers ───
    _headers(includeAuth = true) {
        const h = {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
        };
        if (includeAuth && this._session?.access_token) {
            h['Authorization'] = `Bearer ${this._session.access_token}`;
        }
        return h;
    },

    // ─── Auth: Sign Up ───
    async signUp(email, password, metadata = {}) {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
            method: 'POST',
            headers: this._headers(false),
            body: JSON.stringify({
                email,
                password,
                data: metadata // first_name, last_name, phone, etc.
            })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || data.msg || 'Sign up failed');
        if (data.access_token) {
            this._setSession(data);
        }
        return data;
    },

    // ─── Auth: Sign In with Email/Password ───
    async signIn(email, password) {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: this._headers(false),
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message || data.msg || 'Sign in failed');
        this._setSession(data);
        return data;
    },

    // ─── Auth: Sign In with Google OAuth ───
    signInWithGoogle(redirectTo = window.location.href) {
        const params = new URLSearchParams({
            provider: 'google',
            redirect_to: redirectTo
        });
        window.location.href = `${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`;
    },

    // ─── Auth: Sign Out ───
    async signOut() {
        if (this._session?.access_token) {
            try {
                await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
                    method: 'POST',
                    headers: this._headers()
                });
            } catch (e) { /* ignore */ }
        }
        await this._clearSession();
        // Global redirect strictly on explicit logout
        window.location.href = 'index.html';
    },

    // ─── Auth: Get Current Session ───
    async getSession() {
        // Try to restore from localStorage
        if (!this._session) {
            const stored = localStorage.getItem('kda_session');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed.expires_at && parsed.expires_at * 1000 > Date.now()) {
                        // Double check with DB to prevent 'ghosting'
                        if (parsed.session_id) {
                            try {
                                const res = await fetch(`${SUPABASE_URL}/rest/v1/session_logs?session_id=eq.${parsed.session_id}&select=is_active`, {
                                    headers: {
                                        'apikey': SUPABASE_ANON_KEY,
                                        'Authorization': `Bearer ${parsed.access_token}`
                                    }
                                });
                                const logs = await res.json();
                                // Only revoke if the DB explicitly says is_active: false (admin revoked).
                                // If row is missing (heartbeat not yet written) or any other state,
                                // trust the local JWT — its expiry was already checked above.
                                if (Array.isArray(logs) && logs.length > 0 && logs[0].is_active === false) {
                                    await this._clearSession();
                                } else {
                                    this._session = parsed;
                                    this.startHeartbeat();
                                }
                            } catch (err) {
                                // Network error — trust local JWT
                                this._session = parsed;
                                this.startHeartbeat();
                            }
                        } else {
                            this._session = parsed;
                            this.startHeartbeat();
                        }
                    } else if (parsed.refresh_token) {
                        await this._refreshToken(parsed.refresh_token);
                    } else {
                        await this._clearSession();
                    }
                } catch (e) {
                    await this._clearSession();
                }
            }
        }

        // Check URL for OAuth callback tokens
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
            const params = new URLSearchParams(hash.substring(1));
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            const expires_in = parseInt(params.get('expires_in') || '3600');
            if (access_token) {
                this._setSession({
                    access_token,
                    refresh_token,
                    expires_in,
                    token_type: 'bearer'
                });
                // Clean URL
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
        }

        return this._session;
    },

    // ─── Auth: Get Current User ───
    async getUser() {
        const session = await this.getSession();
        if (!session?.access_token) return null;

        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: this._headers()
        });
        if (!res.ok) {
            if (res.status === 401) {
                this._clearSession();
                return null;
            }
            return null;
        }
        return await res.json();
    },

    // ─── Profile: Get Current User's Profile ───
    async getProfile() {
        const session = await this.getSession();
        if (!session?.access_token) return null;

        const user = await this.getUser();
        if (!user) return null;

        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=*`,
            { headers: this._headers() }
        );
        if (!res.ok) return null;
        const profiles = await res.json();
        return profiles[0] || null;
    },

    // ─── Profile: Update Profile ───
    async updateProfile(updates) {
        const user = await this.getUser();
        if (!user) throw new Error('Not authenticated');

        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
            {
                method: 'PATCH',
                headers: { ...this._headers(), 'Prefer': 'return=representation' },
                body: JSON.stringify(updates)
            }
        );
        if (!res.ok) throw new Error('Failed to update profile');
        const data = await res.json();
        return data[0];
    },

    // ─── Admin Check ───
    async isAdmin() {
        const profile = await this.getProfile();
        return profile?.role === 'admin';
    },

    // ─── DB: Query (SELECT) ───
    async query(table, params = '') {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`,
            { headers: this._headers() }
        );
        if (!res.ok) throw new Error(`Query failed: ${res.statusText}`);
        return await res.json();
    },

    // ─── DB: Insert ───
    async insert(table, data) {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${table}`,
            {
                method: 'POST',
                headers: { ...this._headers(), 'Prefer': 'return=representation' },
                body: JSON.stringify(data)
            }
        );
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Insert failed');
        }
        return await res.json();
    },

    // ─── DB: Update ───
    async update(table, match, data) {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${table}?${match}`,
            {
                method: 'PATCH',
                headers: { ...this._headers(), 'Prefer': 'return=representation' },
                body: JSON.stringify(data)
            }
        );
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Update failed');
        }
        return await res.json();
    },

    // ─── DB: Delete ───
    async remove(table, match) {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/${table}?${match}`,
            {
                method: 'DELETE',
                headers: this._headers()
            }
        );
        if (!res.ok) throw new Error('Delete failed');
        return true;
    },

    // ─── Settings: Get a setting ───
    async getSetting(key) {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/site_settings?key=eq.${key}&select=value`,
            { headers: this._headers(false) } // Public read
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data[0]?.value || null;
    },

    // ─── Settings: Update a setting (admin only) ───
    async updateSetting(key, value) {
        return await this.update('site_settings', `key=eq.${key}`, { value, updated_by: (await this.getUser())?.id });
    },

    // ─── Audit: Log admin action ───
    async logAction(action, entityType, entityId = null, details = null) {
        const user = await this.getUser();
        if (!user) return;
        try {
            await this.insert('admin_audit_log', {
                admin_id: user.id,
                action,
                entity_type: entityType,
                entity_id: entityId,
                details
            });
        } catch (e) { /* non-critical */ }
    },

    // ─── Enrollments ───
    async enrollInCourse(courseId, pricingTier) {
        const user = await this.getUser();
        if (!user) throw new Error('Not authenticated');
        return await this.insert('enrollments', {
            user_id: user.id,
            course_id: courseId,
            pricing_tier: pricingTier
        });
    },

    async getMyEnrollments() {
        const user = await this.getUser();
        if (!user) return [];
        return await this.query('enrollments', `user_id=eq.${user.id}&select=*,courses(*)`);
    },

    // ─── Maintenance Mode Check ───
    async checkMaintenance() {
        const setting = await this.getSetting('maintenance_mode');
        if (setting?.enabled) {
            // Check if user is admin — admins bypass maintenance
            const profile = await this.getProfile();
            if (profile?.role === 'admin') return false; // Admin bypasses
            return setting; // Returns { enabled: true, message: "..." }
        }
        return false;
    },

    // ─── Auth State Listener ───
    onAuthStateChange(callback) {
        this._listeners.push(callback);
    },

    // ─── Internal: Set Session ───
    _setSession(data) {
        this._session = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
            token_type: data.token_type || 'bearer',
            user: data.user,
            session_id: this._session?.session_id // Preserve ID if refreshing
        };
        localStorage.setItem('kda_session', JSON.stringify(this._session));
        
        // Start recording & heartbeat
        this.startHeartbeat();
        
        this._notifyListeners('SIGNED_IN', this._session);

        // Auto-refresh before expiry — cancel previous timer to prevent accumulation
        if (this._refreshTimer) clearTimeout(this._refreshTimer);
        if (data.expires_in) {
            this._refreshTimer = setTimeout(() => {
                if (this._session?.refresh_token) {
                    this._refreshToken(this._session.refresh_token);
                }
            }, (data.expires_in - 60) * 1000); // Refresh 60s before expiry
        }
    },

    // ─── Internal: Clear Session ───
    async _clearSession() {
        if (this._session?.session_id) {
            // Tell server this session is dead
            try {
                fetch(`${SUPABASE_URL}/rest/v1/session_logs?session_id=eq.${this._session.session_id}`, {
                    method: 'PATCH',
                    headers: this._headers(),
                    body: JSON.stringify({ is_active: false })
                });
            } catch (e) { /* ignore */ }
        }

        this.stopHeartbeat();
        this._session = null;
        localStorage.removeItem('kda_session');
        this._notifyListeners('SIGNED_OUT', null);
    },

    // ─── Internal: Refresh Token ───
    async _refreshToken(refreshToken) {
        try {
            const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                method: 'POST',
                headers: this._headers(false),
                body: JSON.stringify({ refresh_token: refreshToken })
            });
            if (!res.ok) throw new Error('Refresh failed');
            const data = await res.json();
            this._setSession(data);
        } catch (e) {
            this._clearSession();
        }
    },

    // ─── Internal: Notify Listeners ───
    _notifyListeners(event, session) {
        this._listeners.forEach(cb => {
            try { cb(event, session); } catch (e) { /* ignore */ }
        });
    },

    // ─── Internal: Log Session ───
    async _logSession() {
        if (!this._session?.user?.id) return;
        
        // Generate a persistent session ID for this browser if not exists
        if (!this._session.session_id) {
            this._session.session_id = Math.random().toString(36).substring(2, 15) + Date.now();
            localStorage.setItem('kda_session', JSON.stringify(this._session));
        }

        try {
            await fetch(`${SUPABASE_URL}/rest/v1/session_logs`, {
                method: 'POST',
                headers: {
                    ...this._headers(),
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    user_id: this._session.user.id,
                    session_id: this._session.session_id,
                    user_agent: navigator.userAgent,
                    last_active: new Date().toISOString(),
                    is_active: true
                })
            });
        } catch (e) { /* silent */ }
    },

    // ─── Internal: Heartbeat ───
    _heartbeatInterval: null,
    startHeartbeat() {
        if (this._heartbeatInterval) return;
        
        // Initial log
        this._logSession();

        this._heartbeatInterval = setInterval(() => {
            if (this._session) {
                this._logSession();
            } else {
                this.stopHeartbeat();
            }
        }, 5 * 60 * 1000); // 5 minutes
    },
    stopHeartbeat() {
        if (this._heartbeatInterval) {
            clearInterval(this._heartbeatInterval);
            this._heartbeatInterval = null;
        }
    }
};

// Auto-initialize session on load
(async () => {
    await KaizenAuth.getSession();
})();

// Export globally
window.KaizenAuth = KaizenAuth;
