/**
 * Kaizen Dental Academy — Admin Panel Logic
 * Uses KaizenAuth from supabase-auth.js for all Supabase interactions
 */
(function() {
    'use strict';

    const SB_URL = SUPABASE_URL;
    const SB_KEY = SUPABASE_ANON_KEY;

    // ─── STATE ───
    let currentUser = null;
    let currentPanel = 'dashboard';
    let userPermissions = null; // null = admin (full), object = employee perms

    // ─── DOM REFS ───
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ─── INIT ───
    async function init() {
        try {
            const session = await KaizenAuth.getSession();
            if (session?.access_token) {
                await verifyAdmin();
            } else {
                showAuthGate();
            }
        } catch (e) {
            console.error('Init error:', e);
            showAuthGate();
        }
    }

    // ─── AUTH ───
    function hideLoading() {
        const el = $('#adminLoading');
        if (el) el.style.display = 'none';
    }

    function showAuthGate() {
        hideLoading();
        $('#authGate').style.display = '';
        $('#adminLayout').style.display = 'none';
        $('#accessDenied').style.display = 'none';
    }

    async function verifyAdmin() {
        const user = await KaizenAuth.getUser();
        if (!user) { showAuthGate(); return; }

        const profile = await KaizenAuth.getProfile();
        if (profile?.role === 'admin') {
            currentUser = { ...user, profile };
            userPermissions = null; // admin = all permissions
            showAdminPanel();
        } else if (profile?.role === 'employee') {
            // Load employee permissions — allow entry even if permissions row is missing (zero access)
            try {
                const { data: perms } = await sbFetch('permissions', { params: { select: '*', user_id: `eq.${user.id}` } });
                currentUser = { ...user, profile };
                userPermissions = perms?.[0] || {}; // Empty object = no permissions (can't see any section)
                showAdminPanel();
            } catch (e) {
                console.error('Permission load error:', e);
                currentUser = { ...user, profile };
                userPermissions = {};
                showAdminPanel();
            }
        } else {
            hideLoading();
            $('#authGate').style.display = 'none';
            $('#adminLayout').style.display = 'none';
            $('#accessDenied').style.display = '';
        }
    }

    function hasPerm(perm) {
        if (!userPermissions) return true; // admin
        return !!userPermissions[perm];
    }

    function showAdminPanel() {
        hideLoading();
        $('#authGate').style.display = 'none';
        $('#accessDenied').style.display = 'none';
        $('#adminLayout').style.display = '';
        const name = (currentUser.profile?.first_name || '') + ' ' + (currentUser.profile?.last_name || '') || currentUser.email;
        $('#adminName').textContent = name.trim();
        $('#adminAvatar').textContent = (name.trim() || 'A')[0].toUpperCase();
        const isAdmin = currentUser.profile?.role === 'admin';
        $('#sidebarRoleLabel').textContent = isAdmin ? 'Admin' : 'Staff';
        $('.admin-role').textContent = isAdmin ? 'Administrator' : 'Employee';
        // Hide sidebar items based on permissions
        $$('.sidebar-nav-item[data-perm]').forEach(btn => {
            const perm = btn.dataset.perm;
            if (perm === 'admin-only') {
                btn.style.display = isAdmin ? '' : 'none';
            } else {
                btn.style.display = hasPerm(perm) ? '' : 'none';
            }
        });
        loadDashboard();
    }

    // ─── LOGIN FORM (removed — login happens on my-account.html) ───
    // If not authenticated, the auth gate shows a link to my-account.html

    // ─── LOGOUT ───
    $('#logoutBtn')?.addEventListener('click', async () => {
        await KaizenAuth.signOut();
        currentUser = null;
        window.location.href = 'my-account.html';
    });

    // ─── SIDEBAR NAV ───
    $$('.sidebar-nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const panel = btn.dataset.panel;
            if (panel === currentPanel) return;
            $$('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            $$('.admin-panel').forEach(p => p.classList.remove('active'));
            $(`#panel-${panel}`).classList.add('active');
            $('#panelTitle').textContent = btn.textContent.trim();
            currentPanel = panel;
            // Stop courses auto-refresh when leaving courses panel
            if (panel !== 'courses' && typeof stopCoursesAutoRefresh === 'function') stopCoursesAutoRefresh();
            // Load data for new panel
            const loaders = { dashboard: loadDashboard, members: loadMembers, courses: loadCourses, enrollments: loadEnrollments, policies: loadPolicies, settings: loadSettings, maintenance: loadMaintenance, audit: loadAuditLog, team: loadTeam, blog: loadBlogPosts };
            loaders[panel]?.();
            // Close mobile sidebar
            $('#adminSidebar').classList.remove('open');
            $('#sidebarOverlay').classList.remove('show');
        });
    });

    // ─── MOBILE MENU ───
    $('#mobileMenuBtn')?.addEventListener('click', () => {
        $('#adminSidebar').classList.toggle('open');
        $('#sidebarOverlay').classList.toggle('show');
    });
    $('#sidebarOverlay')?.addEventListener('click', () => {
        $('#adminSidebar').classList.remove('open');
        $('#sidebarOverlay').classList.remove('show');
    });

    // ─── SUPABASE FETCH HELPER ───
    async function sbFetch(path, { method = 'GET', body = null, params = {} } = {}) {
        const session = await KaizenAuth.getSession();
        const token = session?.access_token || SB_KEY;
        const url = new URL(`${SB_URL}/rest/v1/${path}`);
        Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
        const headers = {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': method === 'GET' ? 'count=exact' : 'return=representation'
        };
        const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
        const count = res.headers.get('content-range')?.split('/')[1];
        const data = await res.json();
        return { data, count: count ? parseInt(count) : null, ok: res.ok };
    }

    // ─── DASHBOARD ───
    async function loadDashboard() {
        try {
            const [members, enrollments, courses] = await Promise.all([
                sbFetch('profiles', { params: { select: '*', limit: '0' } }),
                sbFetch('enrollments', { params: { select: '*', payment_status: 'eq.paid', limit: '0' } }),
                sbFetch('courses', { params: { select: '*', status: 'eq.active', limit: '0' } }),
            ]);
            $('#statMembers').textContent = members.count ?? '—';
            $('#statEnrollments').textContent = enrollments.count ?? '—';
            $('#statCourses').textContent = courses.count ?? '—';

            // Pending payments
            const pending = await sbFetch('enrollments', { params: { select: '*', payment_status: 'eq.pending', limit: '0' } });
            $('#statPending').textContent = pending.count ?? '—';

            // Recent signups
            const recent = await sbFetch('profiles', { params: { select: 'id,first_name,last_name,email,created_at,role', order: 'created_at.desc', limit: '10' } });
            renderRecentSignups(recent.data || []);
            $('#lastUpdated').textContent = `Updated ${new Date().toLocaleTimeString()}`;
        } catch (e) { console.error('Dashboard load error:', e); }
    }

    function renderRecentSignups(rows) {
        const tbody = $('#recentSignups');
        if (!rows.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,0.3);padding:2rem">No members yet</td></tr>'; return; }
        tbody.innerHTML = rows.map(r => `<tr>
            <td>${esc((r.first_name || '') + ' ' + (r.last_name || '') || '—')}</td>
            <td>${esc(r.email || '—')}</td>
            <td>${formatDate(r.created_at)}</td>
            <td><span class="badge badge-${r.role === 'admin' ? 'active' : 'completed'}">${r.role || 'student'}</span></td>
        </tr>`).join('');
    }

    // ─── MEMBERS ───
    async function loadMembers() {
        const { data } = await sbFetch('profiles', { params: { select: '*', order: 'created_at.desc' } });
        renderMembers(data || []);
    }

    function renderMembers(rows) {
        const tbody = $('#membersTableBody');
        if (!rows.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:rgba(255,255,255,0.3);padding:2rem">No members</td></tr>'; return; }
        tbody.innerHTML = rows.map(r => `<tr>
            <td><strong>${esc((r.first_name || '') + ' ' + (r.last_name || '') || '—')}</strong></td>
            <td>${esc(r.email || '—')}</td>
            <td>${esc(r.phone || '—')}</td>
            <td><span class="badge badge-${r.role === 'admin' ? 'active' : 'completed'}">${r.role || 'student'}</span></td>
            <td>${formatDate(r.created_at)}</td>
            <td><button class="btn btn-secondary btn-sm" onclick="AdminPanel.viewMember('${r.id}')">View</button></td>
        </tr>`).join('');
    }

    // Member search
    $('#memberSearch')?.addEventListener('input', debounce(async (e) => {
        const q = e.target.value.trim().toLowerCase();
        if (q.length < 2) { loadMembers(); return; }
        const { data } = await sbFetch('profiles', { params: { select: '*', or: `(first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%)`, order: 'created_at.desc' } });
        renderMembers(data || []);
    }, 300));

    // Export CSV
    $('#exportMembersBtn')?.addEventListener('click', async () => {
        const { data } = await sbFetch('profiles', { params: { select: 'first_name,last_name,email,phone,role,created_at', order: 'created_at.desc' } });
        if (!data?.length) { showToast('No data to export', 'error'); return; }
        const csv = 'Name,Email,Phone,Role,Joined\n' + data.map(r => `"${(r.first_name || '') + ' ' + (r.last_name || '')}","${r.email || ''}","${r.phone || ''}","${r.role || 'student'}","${r.created_at || ''}"`).join('\n');
        downloadCSV(csv, 'kaizen-members.csv');
        showToast('Members exported!', 'success');
        logAudit('export_members', 'Exported members CSV');
    });

    // ─── ENROLLMENTS ───
    async function loadEnrollments() {
        const { data } = await sbFetch('enrollments', { params: { select: '*, profiles(first_name,last_name,email), courses(title)', order: 'enrolled_at.desc' } });
        renderEnrollments(data || []);
    }

    function renderEnrollments(rows) {
        const tbody = $('#enrollmentsTableBody');
        if (!rows.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.3);padding:2rem">No enrollments</td></tr>'; return; }
        tbody.innerHTML = rows.map(r => `<tr>
            <td>${esc(r.profiles ? (r.profiles.first_name || '') + ' ' + (r.profiles.last_name || '') : '—')}</td>
            <td>${esc(r.courses?.title || '—')}</td>
            <td><span class="badge badge-${paymentBadge(r.payment_status)}">${r.payment_status}</span></td>
            <td>${formatDate(r.created_at)}</td>
            <td>
                <select class="form-control" style="width:auto;padding:0.3rem 0.5rem;font-size:0.8rem" onchange="AdminPanel.updatePaymentStatus('${r.id}', this.value)">
                    <option value="pending" ${r.payment_status==='pending'?'selected':''}>Pending</option>
                    <option value="paid" ${r.payment_status==='paid'?'selected':''}>Paid</option>
                    <option value="failed" ${r.payment_status==='failed'?'selected':''}>Failed</option>
                    <option value="refunded" ${r.payment_status==='refunded'?'selected':''}>Refunded</option>
                </select>
            </td>
        </tr>`).join('');
    }

    // ─── POLICIES ───
    async function loadPolicies() {
        const { data } = await sbFetch('policies', { params: { select: '*', order: 'updated_at.desc' } });
        renderPolicies(data || []);
        loadRefundPolicy();
    }

    // ─── COURSE REFUND POLICY ───
    async function loadRefundPolicy() {
        const { data } = await sbFetch('site_settings', { params: { select: 'value', key: 'eq.course_refund_policy' } });
        if (data?.length) {
            let rp = data[0].value;
            if (typeof rp === 'string') { try { rp = JSON.parse(rp); } catch(e) {} }
            if (typeof rp === 'object' && rp) {
                $('#refundRuleGreen').value = rp.rule_green || '';
                $('#refundRuleYellow').value = rp.rule_yellow || '';
                $('#refundRuleRed').value = rp.rule_red || '';
                $('#refundWarningText').value = rp.warning || '';
            }
        }
    }

    $('#saveRefundPolicyBtn')?.addEventListener('click', async () => {
        const rp = {
            rule_green: $('#refundRuleGreen').value,
            rule_yellow: $('#refundRuleYellow').value,
            rule_red: $('#refundRuleRed').value,
            warning: $('#refundWarningText').value
        };
        await upsertSetting('course_refund_policy', rp);
        showToast('Refund policy saved!', 'success');
        logAudit('update_refund_policy', 'Updated course refund policy');
    });

    function renderPolicies(policies) {
        const container = $('#policiesList');
        if (!policies.length) { container.innerHTML = '<p class="empty-state">No policies</p>'; return; }
        container.innerHTML = `<table class="admin-table">
            <thead><tr><th>Title</th><th>Slug</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>${policies.map(p => `<tr>
                <td><strong>${esc(p.title)}</strong></td>
                <td class="text-muted">${p.slug}</td>
                <td><span class="badge ${p.is_published ? 'badge-active' : 'badge-draft'}">${p.is_published ? 'Published' : 'Draft'}</span></td>
                <td><button class="btn btn-secondary btn-sm" onclick="AdminPanel.editPolicy('${p.id}')">Edit</button></td>
            </tr>`).join('')}</tbody>
        </table>`;
    }

    // ─── POLICY EDITOR ───
    async function openPolicyEditor(id) {
        const overlay = $('#policyEditorOverlay');
        if (!overlay) return;
        if (id) {
            // Edit existing
            const { data } = await sbFetch(`policies?id=eq.${id}`, { params: { select: '*' } });
            const p = data?.[0];
            if (!p) { showToast('Policy not found', 'error'); return; }
            $('#policyEditorTitle').textContent = 'Edit Policy';
            $('#policyEditId').value = p.id;
            $('#policyEditTitle').value = p.title;
            $('#policyEditSlug').value = p.slug;
            $('#policyEditContent').value = p.content || '';
            if (p.is_published) $('#policyEditPublished').classList.add('active');
            else $('#policyEditPublished').classList.remove('active');
            $('#deletePolicyBtn').style.display = '';
        } else {
            // New policy
            $('#policyEditorTitle').textContent = 'New Policy';
            $('#policyEditId').value = '';
            $('#policyEditTitle').value = '';
            $('#policyEditSlug').value = '';
            $('#policyEditContent').value = '';
            $('#policyEditPublished').classList.remove('active');
            $('#deletePolicyBtn').style.display = 'none';
        }
        overlay.style.display = '';
    }

    function closePolicyEditor() {
        const overlay = $('#policyEditorOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    $('#closePolicyEditor')?.addEventListener('click', closePolicyEditor);
    $('#policyEditPublished')?.addEventListener('click', function() { this.classList.toggle('active'); });
    $('#addPolicyBtn')?.addEventListener('click', () => openPolicyEditor(null));

    $('#savePolicyBtn')?.addEventListener('click', async () => {
        const id = $('#policyEditId').value;
        const title = $('#policyEditTitle').value.trim();
        const slug = $('#policyEditSlug').value.trim();
        const content = $('#policyEditContent').value;
        const is_published = $('#policyEditPublished').classList.contains('active');

        if (!title || !slug) { showToast('Title and slug are required', 'error'); return; }

        const body = { title, slug, content, is_published, updated_at: new Date().toISOString(), updated_by: currentUser?.id };

        if (id) {
            // Update
            await sbFetch(`policies?id=eq.${id}`, { method: 'PATCH', body });
            showToast('Policy updated!', 'success');
            logAudit('update_policy', `Updated policy: ${title}`);
        } else {
            // Insert
            await sbFetch('policies', { method: 'POST', body });
            showToast('Policy created!', 'success');
            logAudit('create_policy', `Created policy: ${title}`);
        }
        closePolicyEditor();
        loadPolicies();
    });

    $('#deletePolicyBtn')?.addEventListener('click', async () => {
        const id = $('#policyEditId').value;
        if (!id) return;
        const yes = await adminConfirm('Delete this policy?', 'This action cannot be undone.');
        if (!yes) return;
        await sbFetch(`policies?id=eq.${id}`, { method: 'DELETE' });
        showToast('Policy deleted', 'success');
        logAudit('delete_policy', `Deleted policy ${id}`);
        closePolicyEditor();
        loadPolicies();
    });

    // ─── SETTINGS ───
    async function loadSettings() {
        const { data } = await sbFetch('site_settings', { params: { select: '*' } });
        if (data?.length) {
            const map = {};
            data.forEach(s => map[s.key] = typeof s.value === 'string' ? s.value.replace(/^"|"$/g, '') : s.value);
            // Extract values - some are plain strings, some are objects
            const val = (key, prop) => {
                const v = map[key];
                if (!v) return '';
                if (typeof v === 'string') return v;
                if (prop && typeof v === 'object') return v[prop] || '';
                return '';
            };
            $('#settWhatsapp').value = val('whatsapp_number', 'number');
            $('#settEmail').value = val('contact_email', 'email');
            $('#settFacebook').value = typeof map.facebook_url === 'string' ? map.facebook_url : '';
            $('#settInstagram').value = typeof map.instagram_url === 'string' ? map.instagram_url : '';
            $('#settYoutube').value = typeof map.youtube_url === 'string' ? map.youtube_url : '';
            $('#settMaps').value = typeof map.google_maps_url === 'string' ? map.google_maps_url : val('google_maps', 'url');

            // Payment
            const pm = map.payment_method;
            const isPaymob = pm === 'paymob' || (typeof pm === 'object' && pm?.active === 'paymob');
            if (isPaymob) $('#paymentModeToggle')?.classList.add('active');
            else $('#paymentModeToggle')?.classList.remove('active');
            const ipLink = typeof map.instapay_link === 'string' ? map.instapay_link : (typeof map.instapay_link === 'object' ? '' : '');
            $('#instapayLink').value = ipLink;
        }
    }

    $('#saveSettingsBtn')?.addEventListener('click', async () => {
        const settings = {
            whatsapp_number: $('#settWhatsapp').value,
            contact_email: $('#settEmail').value,
            facebook_url: $('#settFacebook').value,
            instagram_url: $('#settInstagram').value,
            youtube_url: $('#settYoutube').value,
            google_maps_url: $('#settMaps').value,
        };
        for (const [key, value] of Object.entries(settings)) {
            await upsertSetting(key, value);
        }
        showToast('Settings saved!', 'success');
        logAudit('update_settings', 'Updated site settings');
    });

    // ─── MAINTENANCE ───
    async function loadMaintenance() {
        const { data } = await sbFetch('site_settings', { params: { select: '*', key: 'in.(maintenance_mode,maintenance_message)' } });
        const map = {};
        (data || []).forEach(s => map[s.key] = s.value);
        const isOn = map.maintenance_mode === 'true';
        const toggle = $('#maintenanceToggle');
        toggle.classList.toggle('active', isOn);
        $('#maintenanceStatus').textContent = isOn ? 'On' : 'Off';
        $('#maintenanceMsg').value = map.maintenance_message || '';
    }

    $('#maintenanceToggle')?.addEventListener('click', function() {
        this.classList.toggle('active');
        $('#maintenanceStatus').textContent = this.classList.contains('active') ? 'On' : 'Off';
    });

    $('#saveMaintenanceBtn')?.addEventListener('click', async () => {
        const isOn = $('#maintenanceToggle').classList.contains('active');
        const msg = $('#maintenanceMsg').value;
        await upsertSetting('maintenance_mode', isOn ? 'true' : 'false');
        await upsertSetting('maintenance_message', msg);
        showToast(`Maintenance mode ${isOn ? 'enabled' : 'disabled'}`, 'success');
        logAudit('toggle_maintenance', `Maintenance mode set to ${isOn}`);
    });

    // ─── PAYMENT SETTINGS ───
    $('#paymentModeToggle')?.addEventListener('click', function() {
        this.classList.toggle('active');
    });

    $('#savePaymentSettings')?.addEventListener('click', async () => {
        const isPaymob = $('#paymentModeToggle').classList.contains('active');
        const link = $('#instapayLink').value;
        await upsertSetting('payment_method', isPaymob ? 'paymob' : 'instapay');
        await upsertSetting('instapay_link', link);
        showToast('Payment settings saved!', 'success');
        logAudit('update_payment', `Payment method: ${isPaymob ? 'paymob' : 'instapay'}`);
    });

    // ─── PRICING SETTINGS ───
    $('#savePricingBtn')?.addEventListener('click', async () => {
        const earlyPrice = $('#settEarlyBirdPrice').value;
        const latePrice = $('#settLateOwlPrice').value;
        const gradPrice = $('#settGradPrice').value;
        const deadline = $('#settEarlyBirdDeadline').value;
        const startDate = $('#settKscStartDate').value;
        if (!earlyPrice || !latePrice || !gradPrice || !deadline) {
            showToast('Please fill all pricing fields', 'error');
            return;
        }
        await upsertSetting('ksc_early_bird_price', JSON.stringify(earlyPrice));
        await upsertSetting('ksc_late_owl_price', JSON.stringify(latePrice));
        await upsertSetting('ksc_graduate_price', JSON.stringify(gradPrice));
        await upsertSetting('ksc_early_bird_deadline', JSON.stringify(deadline));
        if (startDate) await upsertSetting('ksc_start_date', JSON.stringify(startDate));
        showToast('Pricing updated! Changes are live.', 'success');
        logAudit('update_pricing', `Early: ${earlyPrice}, Late: ${latePrice}, Grad: ${gradPrice}, Deadline: ${deadline}, Start: ${startDate}`);
    });

    // ─── AUDIT LOG ───
    async function loadAuditLog() {
        const { data } = await sbFetch('admin_audit_log', { params: { select: '*', order: 'created_at.desc', limit: '50' } });
        const tbody = $('#auditTableBody');
        if (!data?.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,0.3);padding:2rem">No audit entries</td></tr>'; return; }
        tbody.innerHTML = data.map(r => `<tr>
            <td><span class="badge badge-completed">${esc(r.action)}</span></td>
            <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis">${esc(r.details || '—')}</td>
            <td>${esc(r.admin_id?.substring(0,8) || '—')}</td>
            <td>${formatDate(r.created_at)}</td>
        </tr>`).join('');
    }

    // ─── HELPERS ───
    async function upsertSetting(key, value) {
        // Try update first, then insert
        const session = await KaizenAuth.getSession();
        const token = session?.access_token || SB_KEY;
        const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates,return=representation' };
        await fetch(`${SB_URL}/rest/v1/site_settings?on_conflict=key`, {
            method: 'POST', headers, body: JSON.stringify({ key, value })
        });
    }

    async function logAudit(action, details) {
        try {
            await sbFetch('admin_audit_log', { method: 'POST', body: { admin_id: currentUser?.id, action, details } });
        } catch(e) { /* silent */ }
    }

    let _toastTimer = null;
    function showToast(message, type = 'success') {
        const toast = $('#adminToast');
        clearTimeout(_toastTimer);
        $('#toastMessage').textContent = message;
        toast.className = `admin-toast ${type} show`;
        _toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
    function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    function normalizeAuthorName(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
    function parseBlogContent(content) {
        if (!content) return null;
        if (typeof content === 'object') return content;
        try { return JSON.parse(content); } catch (_) { return null; }
    }
    function getBlogMeta(content) {
        const parsed = parseBlogContent(content);
        return parsed && typeof parsed.meta === 'object' && parsed.meta ? parsed.meta : {};
    }
    function getStoredBlogAuthorName(content) {
        const parsed = parseBlogContent(content);
        const meta = getBlogMeta(content);
        return normalizeAuthorName(
            meta.authorName ||
            meta.author_name ||
            meta.author ||
            parsed?.authorName ||
            parsed?.author_name ||
            parsed?.author ||
            ''
        );
    }
    function getProfileDisplayName(profile) {
        if (!profile) return '';
        return normalizeAuthorName(`${profile.first_name || ''} ${profile.last_name || ''}`);
    }
    function getCurrentBlogAuthorName() {
        return getProfileDisplayName(currentUser?.profile) || currentUser?.email || 'Kaizen Team';
    }
    function getPostAuthorName(post, fallback = 'Kaizen Team') {
        const metaName = getStoredBlogAuthorName(post?.content);
        const directName = normalizeAuthorName(post?.authorName || post?.author_name || post?.author || '');
        return metaName || directName || getProfileDisplayName(post?.profiles) || fallback;
    }
    function mergeBlogMeta(outputData, meta = {}) {
        const next = outputData && typeof outputData === 'object' ? outputData : { blocks: [] };
        const merged = { ...(next.meta && typeof next.meta === 'object' ? next.meta : {}), ...meta };
        const authorName = normalizeAuthorName(merged.authorName || merged.author_name || merged.author || '');
        delete merged.author;
        delete merged.author_name;
        if (authorName) {
            merged.authorName = authorName;
            next.meta = merged;
        } else if (Object.keys(merged).filter(key => key !== 'authorName').length) {
            delete merged.authorName;
            next.meta = merged;
        } else {
            delete next.meta;
        }
        return next;
    }
    function statusBadge(s) { return { active:'active', confirmed:'active', completed:'completed', coming_soon:'pending', draft:'draft', pending:'pending', cancelled:'cancelled' }[s] || 'draft'; }
    function paymentBadge(s) { return { paid:'active', pending:'pending', failed:'cancelled', refunded:'completed' }[s] || 'draft'; }
    function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
    function downloadCSV(csv, filename) { const b = new Blob([csv], {type:'text/csv'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = filename; a.click(); URL.revokeObjectURL(u); }
    // ─── COURSE MANAGEMENT ───
    function buildAdminDateLabel(start, end) {
        if (!start) return '';
        const s = new Date(start + 'T00:00:00');
        const e = end ? new Date(end + 'T00:00:00') : null;
        if (isNaN(s)) return '';
        if (e && !isNaN(e)) {
            const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
            if (sameMonth) return s.toLocaleDateString('en-US', { month: 'long' }) + ' ' + s.getDate() + '\u2013' + e.getDate() + ', ' + s.getFullYear();
            return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' \u2013 ' + e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return 'Starts ' + s.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    let coursesRefreshTimer = null;
    function startCoursesAutoRefresh() {
        stopCoursesAutoRefresh();
        coursesRefreshTimer = setInterval(() => {
            // Skip refresh if any course is currently being edited (accordion open)
            if (currentPanel === 'courses' && !document.querySelector('.course-accord.open')) {
                loadCourses(true);
            }
        }, 15000);
    }
    function stopCoursesAutoRefresh() {
        if (coursesRefreshTimer) { clearInterval(coursesRefreshTimer); coursesRefreshTimer = null; }
    }
    async function loadCourses(silent = false) {
        const container = $('#coursesList');
        if (!container) return;
        if (!silent) container.innerHTML = '<div class="admin-loading"><div class="admin-spinner"></div></div>';
        try {
            const { data } = await sbFetch('courses', { params: { select: '*', order: 'sort_order.asc,created_at.desc' } });
            startCoursesAutoRefresh();
            if (!data?.length) {
                container.innerHTML = '<p class="empty-state">No courses found. Add courses via Supabase.</p>';
                return;
            }
            container.innerHTML = data.map(c => {
                const isActive = c.status === 'active';
                const statusLabels = { active: 'Active', completed: 'Completed', coming_soon: 'Coming Soon', draft: 'Draft' };
                const highlights = Array.isArray(c.highlights) ? c.highlights : [];
                const tiers = Array.isArray(c.pricing_tiers) ? c.pricing_tiers : [];
                const priceDisplay = tiers.length ? tiers.map(t => `${t.name}: ${Number(t.price).toLocaleString()} ${t.currency || 'EGP'}`).join(' · ') : 'No pricing set';
                // Extract Early Bird / Late Owl from tiers
                const earlyBird = tiers.find(t => t.name === 'Early Bird');
                const lateOwl  = tiers.find(t => t.name === 'Late Owl');
                const otherTiersHtml = tiers.filter(t => t.name !== 'Early Bird' && t.name !== 'Late Owl').map(t => `
                    <div class="tier-edit-row">
                        <div class="tier-field"><label>Name</label><input type="text" class="tier-name form-control" value="${esc(t.name||'')}" placeholder="e.g. Special"></div>
                        <div class="tier-field"><label>Price</label><input type="number" class="tier-price form-control" value="${t.price||''}"></div>
                        <div class="tier-field tier-field-sm"><label>Currency</label><select class="tier-currency form-control"><option value="EGP" ${(t.currency||'EGP')==='EGP'?'selected':''}>EGP</option><option value="USD" ${t.currency==='USD'?'selected':''}>USD</option></select></div>
                        <div class="tier-field"><label>Deadline</label><input type="date" class="tier-deadline form-control" value="${t.deadline||''}"></div>
                        <div class="tier-field" style="flex:1.5"><label>Note</label><input type="text" class="tier-condition form-control" value="${esc(t.condition||'')}"></div>
                        <button class="btn-remove-tier" type="button">✕</button>
                    </div>`).join('');

                return `
                <div class="course-accord" data-course-id="${c.id}">
                    <!-- ━━ SUMMARY ROW (always visible) ━━ -->
                    <div class="course-accord-summary">
                        <div class="course-accord-left">
                            <span class="course-accord-status-dot ${c.status}"></span>
                            <div class="course-accord-info">
                                <h3 class="course-accord-name">${esc(c.title)}</h3>
                                <span class="course-accord-meta">${esc(c.instructor || 'No instructor')} · ${priceDisplay}</span>
                            </div>
                        </div>
                        <div class="course-accord-right">
                            <span class="course-mgr-status-badge ${c.status}">${statusLabels[c.status] || c.status}</span>
                            <button class="course-accord-toggle" type="button">Edit ▾</button>
                        </div>
                    </div>

                    <!-- ━━ EXPANDED EDITOR (hidden by default) ━━ -->
                    <div class="course-accord-body">

                        <!-- Section: General -->
                        <div class="course-editor-section">
                            <div class="course-editor-section-title">General Information</div>
                            <div class="course-editor-grid">
                                <div class="ce-field">
                                    <label>Subtitle</label>
                                    <input type="text" class="course-subtitle form-control" value="${esc(c.subtitle || '')}" placeholder="Course subtitle...">
                                </div>
                                <div class="ce-field">
                                    <label>Instructor</label>
                                    <input type="text" class="course-instructor form-control" value="${esc(c.instructor || '')}" placeholder="Dr. Name">
                                </div>
                                <div class="ce-field">
                                    <label>Format</label>
                                    <select class="course-format-select form-control">
                                        <option value="online" ${c.format === 'online' ? 'selected' : ''}>🌐 Online</option>
                                        <option value="phygital" ${c.format === 'phygital' ? 'selected' : ''}>🏥 Phygital</option>
                                        <option value="physical" ${c.format === 'physical' ? 'selected' : ''}>📍 Physical</option>
                                    </select>
                                </div>
                                <div class="ce-field">
                                    <label>Status</label>
                                    <select class="course-status-select form-control">
                                        <option value="active" ${c.status === 'active' ? 'selected' : ''}>🟢 Active</option>
                                        <option value="coming_soon" ${c.status === 'coming_soon' ? 'selected' : ''}>🟡 Coming Soon</option>
                                        <option value="completed" ${c.status === 'completed' ? 'selected' : ''}>🔵 Completed</option>
                                        <option value="draft" ${c.status === 'draft' ? 'selected' : ''}>⚪ Draft</option>
                                    </select>
                                </div>
                                <div class="ce-field">
                                    <label>Card Badge Text</label>
                                    <input type="text" class="course-batch-info form-control" value="${esc(c.batch_info || '')}" placeholder="e.g. 1st Batch Completed, New Program">
                                    <span class="ce-hint">Shown on the homepage course card badge.</span>
                                </div>
                                <div class="ce-field">
                                    <label>Next Batch Label</label>
                                    <input type="text" class="course-next-batch form-control" value="${esc(c.next_batch_info || buildAdminDateLabel(c.start_date, c.end_date) || '')}" placeholder="e.g. Coming Soon, Q3 2026">
                                    <span class="ce-hint">What visitors see on the card and course page. Date pickers auto-suggest this.</span>
                                </div>
                                <div class="ce-field" style="grid-column:1/-1">
                                    <label>Next Batch Note <span style="color:rgba(255,255,255,0.3);font-weight:400">(tagline below the date)</span></label>
                                    <input type="text" class="course-next-batch-note form-control" value="${esc(c.next_batch_note || '')}" placeholder="e.g. Stay tuned for the 3rd batch announcement!">
                                    <span class="ce-hint">Leave empty to hide this line on the course page.</span>
                                </div>
                            </div>
                        </div>

                        <!-- Section: Registrations -->
                        <div class="course-editor-section">
                            <div class="course-editor-section-title">Registrations</div>

                            <!-- Early Bird -->
                            <div class="reg-tier-row">
                                <div class="reg-tier-header">
                                    <div class="toggle-track ${earlyBird ? 'active' : ''}" data-field="early_bird_enabled"></div>
                                    <span class="reg-tier-label">🐦 Early Bird <span class="ce-hint" style="display:inline;margin-left:0.4rem">Early registration</span></span>
                                </div>
                                <div class="reg-tier-fields ${earlyBird ? '' : 'reg-disabled'}">
                                    <div class="tier-field"><label>Price</label><input type="number" class="reg-early-price form-control" value="${earlyBird?.price || ''}" placeholder="5000"></div>
                                    <div class="tier-field tier-field-sm"><label>Currency</label><select class="reg-early-currency form-control"><option value="EGP" ${(earlyBird?.currency||'EGP')==='EGP'?'selected':''}>EGP</option><option value="USD" ${earlyBird?.currency==='USD'?'selected':''}>USD</option></select></div>
                                    <div class="tier-field"><label>Deadline</label><input type="date" class="reg-early-deadline form-control" value="${earlyBird?.deadline||''}"></div>
                                    <div class="tier-field" style="flex:1.5"><label>Note</label><input type="text" class="reg-early-note form-control" value="${esc(earlyBird?.condition||'')}" placeholder="e.g. Class of 2024"></div>
                                </div>
                            </div>

                            <!-- Late Owl -->
                            <div class="reg-tier-row" style="margin-top:0.75rem">
                                <div class="reg-tier-header">
                                    <div class="toggle-track ${lateOwl ? 'active' : ''}" data-field="late_owl_enabled"></div>
                                    <span class="reg-tier-label">🦉 Late Owl <span class="ce-hint" style="display:inline;margin-left:0.4rem">Late registration</span></span>
                                </div>
                                <div class="reg-tier-fields ${lateOwl ? '' : 'reg-disabled'}">
                                    <div class="tier-field"><label>Price</label><input type="number" class="reg-late-price form-control" value="${lateOwl?.price||''}" placeholder="6000"></div>
                                    <div class="tier-field tier-field-sm"><label>Currency</label><select class="reg-late-currency form-control"><option value="EGP" ${(lateOwl?.currency||'EGP')==='EGP'?'selected':''}>EGP</option><option value="USD" ${lateOwl?.currency==='USD'?'selected':''}>USD</option></select></div>
                                    <div class="tier-field"><label>Deadline</label><input type="date" class="reg-late-deadline form-control" value="${lateOwl?.deadline||''}"></div>
                                    <div class="tier-field" style="flex:1.5"><label>Note</label><input type="text" class="reg-late-note form-control" value="${esc(lateOwl?.condition||'')}" placeholder="Optional"></div>
                                </div>
                            </div>

                            <!-- Other custom tiers -->
                            <div class="course-tiers-list" style="margin-top:1rem">${otherTiersHtml}</div>
                            <button class="add-tier-btn" type="button">+ Add Custom Tier</button>
                        </div>

                        <!-- Section: Highlights -->
                        <div class="course-editor-section">
                            <div class="course-editor-section-title">Course Highlights</div>
                            <textarea class="course-highlights-text form-control" placeholder="One highlight per line...">${highlights.map(h => h.text || h).join('\n')}</textarea>
                        </div>

                        <!-- Section: Course PDF -->
                        <div class="course-editor-section">
                            <div class="course-editor-section-title">Course PDF</div>
                            <div class="course-pdf-manager" data-course-id="${c.id}">
                                ${c.pdf_url ? `
                                <div class="pdf-current">
                                    <span class="pdf-current-icon">📄</span>
                                    <a href="${esc(c.pdf_url)}" target="_blank" class="pdf-current-link">Current PDF — click to preview</a>
                                    <button class="btn btn-danger pdf-delete-btn" type="button">Delete PDF</button>
                                </div>` : `<p class="pdf-none-msg">No PDF uploaded yet for this course.</p>`}
                                <div class="pdf-upload-area">
                                    <button class="btn btn-outline pdf-choose-btn" type="button">${c.pdf_url ? 'Replace PDF' : 'Upload PDF'}</button>
                                    <input type="file" class="pdf-file-input" accept="application/pdf" style="display:none">
                                    <span class="pdf-chosen-name"></span>
                                    <button class="btn btn-primary pdf-upload-btn" type="button" style="display:none">Upload</button>
                                </div>
                            </div>
                        </div>

                        <!-- Section: Schedule -->
                        <div class="course-editor-section">
                            <div class="course-editor-section-title">Schedule & Visibility</div>
                            <div class="course-editor-grid">
                                <div class="ce-field">
                                    <label>Start Date</label>
                                    <input type="date" class="course-start-date form-control" value="${c.start_date || ''}">
                                </div>
                                <div class="ce-field">
                                    <label>End Date <span style="color:rgba(255,255,255,0.3);font-weight:400">(optional)</span></label>
                                    <input type="date" class="course-end-date form-control" value="${c.end_date || ''}">
                                </div>
                                <div class="ce-field" style="grid-column:1/-1">
                                    <span class="ce-hint">Sets the "Next Batch" label automatically — e.g. start+end = "May 14–16, 2026", start only = "Starts May 14, 2026". Override manually using the Next Batch Label field above.</span>
                                </div>
                                <div class="ce-field">
                                    <label>Visible on Site</label>
                                    <div class="course-mgr-toggle" style="margin-top:0.4rem">
                                        <div class="toggle-track ${c.is_visible ? 'active' : ''}" data-field="is_visible"></div>
                                        <span class="toggle-label-text">${c.is_visible ? 'Shown' : 'Hidden'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="course-editor-footer">
                            ${c.page_url && (c.page_url.startsWith('https://') || c.page_url.startsWith('/')) ? `<a href="${esc(c.page_url)}" target="_blank" class="course-mgr-page-link">View Live Page →</a>` : '<span></span>'}
                            <button class="btn btn-primary course-save-btn">Save Changes</button>
                        </div>
                    </div>
                </div>`;
            }).join('');

            // Bind accordion toggles
            container.querySelectorAll('.course-accord-toggle').forEach(btn => {
                btn.addEventListener('click', function() {
                    const accord = this.closest('.course-accord');
                    const isOpen = accord.classList.toggle('open');
                    this.textContent = isOpen ? 'Close ▴' : 'Edit ▾';
                });
            });

            // Bind toggle clicks (visibility)
            container.querySelectorAll('.toggle-track[data-field="is_visible"]').forEach(t => {
                t.addEventListener('click', function() {
                    this.classList.toggle('active');
                    const label = this.nextElementSibling;
                    label.textContent = this.classList.contains('active') ? 'Shown' : 'Hidden';
                });
            });

            // Bind status select change — update badge live
            container.querySelectorAll('.course-status-select').forEach(sel => {
                sel.addEventListener('change', function() {
                    const accord = this.closest('.course-accord');
                    const badge = accord.querySelector('.course-mgr-status-badge');
                    const dot = accord.querySelector('.course-accord-status-dot');
                    const labels = { active: 'Active', completed: 'Completed', coming_soon: 'Coming Soon', draft: 'Draft' };
                    badge.className = 'course-mgr-status-badge ' + this.value;
                    badge.textContent = labels[this.value] || this.value;
                    dot.className = 'course-accord-status-dot ' + this.value;
                });
            });

            // Bind save buttons
            container.querySelectorAll('.course-save-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.closest('.course-accord').dataset.courseId;
                    saveCourse(id);
                });
            });

            // Bind Add Tier buttons
            container.querySelectorAll('.add-tier-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const list = this.previousElementSibling;
                    const row = document.createElement('div');
                    row.className = 'tier-edit-row';
                    row.innerHTML = `
                        <div class="tier-field"><label>Name</label><input type="text" class="tier-name form-control" placeholder="Tier Name"></div>
                        <div class="tier-field"><label>Price</label><input type="number" class="tier-price form-control" placeholder="Price"></div>
                        <div class="tier-field tier-field-sm"><label>Currency</label>
                            <select class="tier-currency form-control">
                                <option value="EGP">EGP</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                        <div class="tier-field"><label>Deadline Date</label><input type="date" class="tier-deadline form-control"></div>
                        <div class="tier-field" style="flex: 1.5"><label>Extra Info</label><input type="text" class="tier-condition form-control" placeholder="Optional info (e.g. Class of 2024)"></div>
                        <button class="btn-remove-tier" title="Remove" type="button">✕</button>
                    `;
                    list.appendChild(row);
                });
            });

            // Delegate Remove Tier clicks
            container.addEventListener('click', function(e) {
                if (e.target.closest('.btn-remove-tier')) {
                    e.target.closest('.tier-edit-row').remove();
                }
            });

            // Bind registration tier toggles (Early Bird / Late Owl)
            container.querySelectorAll('.toggle-track[data-field="early_bird_enabled"], .toggle-track[data-field="late_owl_enabled"]').forEach(tog => {
                tog.addEventListener('click', function() {
                    this.classList.toggle('active');
                    const fields = this.closest('.reg-tier-row').querySelector('.reg-tier-fields');
                    if (fields) fields.classList.toggle('reg-disabled', !this.classList.contains('active'));
                });
            });

            // Live-update Next Batch Label when dates change
            container.querySelectorAll('.course-accord').forEach(accord => {
                const startEl = accord.querySelector('.course-start-date');
                const endEl = accord.querySelector('.course-end-date');
                const labelEl = accord.querySelector('.course-next-batch');
                function refreshLabel() {
                    const auto = buildAdminDateLabel(startEl.value, endEl.value);
                    if (auto) labelEl.value = auto;
                }
                startEl?.addEventListener('change', refreshLabel);
                endEl?.addEventListener('change', refreshLabel);
            });

            // Bind PDF managers
            container.querySelectorAll('.course-pdf-manager').forEach(m => bindPdfEvents(m));
        } catch (e) {
            console.error('Load courses error:', e);
            container.innerHTML = '<p class="empty-state">Failed to load courses.</p>';
        }
    }

    async function saveCourse(courseId) {
        const card = document.querySelector(`.course-accord[data-course-id="${courseId}"]`);
        if (!card) return;
        
        const status = card.querySelector('.course-status-select').value;
        const format = card.querySelector('.course-format-select').value;
        const startDate = card.querySelector('.course-start-date').value || null;
        const endDate = card.querySelector('.course-end-date').value || null;
        const subtitle = card.querySelector('.course-subtitle')?.value || '';
        const instructor = card.querySelector('.course-instructor')?.value || '';
        const batchInfo = card.querySelector('.course-batch-info')?.value?.trim() || null;
        const nextBatchManual = card.querySelector('.course-next-batch')?.value?.trim() || null;
        const nextBatchNote = card.querySelector('.course-next-batch-note')?.value?.trim() ?? null;

        // Save exactly what's in the label field — auto-fill in the UI is just a suggestion
        const nextBatch = nextBatchManual || null;
        const isVisible = card.querySelector('.toggle-track[data-field="is_visible"]').classList.contains('active');

        // Read Early Bird / Late Owl registration tiers
        const pricingTiers = [];
        const earlyEnabled = card.querySelector('.toggle-track[data-field="early_bird_enabled"]')?.classList.contains('active');
        if (earlyEnabled) pricingTiers.push({
            name: 'Early Bird',
            price: parseFloat(card.querySelector('.reg-early-price')?.value) || 0,
            currency: card.querySelector('.reg-early-currency')?.value || 'EGP',
            deadline: card.querySelector('.reg-early-deadline')?.value || '',
            condition: card.querySelector('.reg-early-note')?.value?.trim() || ''
        });
        const lateEnabled = card.querySelector('.toggle-track[data-field="late_owl_enabled"]')?.classList.contains('active');
        if (lateEnabled) pricingTiers.push({
            name: 'Late Owl',
            price: parseFloat(card.querySelector('.reg-late-price')?.value) || 0,
            currency: card.querySelector('.reg-late-currency')?.value || 'EGP',
            deadline: card.querySelector('.reg-late-deadline')?.value || '',
            condition: card.querySelector('.reg-late-note')?.value?.trim() || ''
        });
        // Add any other custom tiers
        card.querySelectorAll('.tier-edit-row').forEach(row => {
            const name = row.querySelector('.tier-name')?.value?.trim();
            const price = parseFloat(row.querySelector('.tier-price')?.value) || 0;
            if (name || price) pricingTiers.push({
                name, price,
                currency: row.querySelector('.tier-currency')?.value || 'EGP',
                deadline: row.querySelector('.tier-deadline')?.value || '',
                condition: row.querySelector('.tier-condition')?.value?.trim() || ''
            });
        });

        // Parse Highlights
        const highlightsText = card.querySelector('.course-highlights-text').value;
        const highlights = highlightsText.split('\n').filter(h => h.trim()).map(h => ({ text: h.trim() }));

        const btn = card.querySelector('.course-save-btn');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        const updateData = {
            status,
            format,
            start_date: startDate,
            end_date: endDate,
            next_batch_info: nextBatch,
            next_batch_note: nextBatchNote,
            batch_info: batchInfo,
            subtitle,
            instructor,
            pricing_tiers: pricingTiers,
            highlights,
            is_visible: isVisible,
            updated_at: new Date().toISOString()
        };

        try {
            const session = await KaizenAuth.getSession();
            const token = session?.access_token || SB_KEY;
            const res = await fetch(`${SB_URL}/rest/v1/courses?id=eq.${courseId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SB_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(updateData)
            });

            if (res.ok) {
                showToast(`Course updated successfully!`, 'success');
                logAudit('update_course', `Course ${courseId}: status=${status}, visible=${isVisible}, start_date=${startDate}`);
            } else {
                const err = await res.json();
                showToast(`Failed: ${err.message || 'Unknown error'}`, 'error');
            }
        } catch (e) {
            console.error('Save course error:', e);
            showToast('Failed to save course', 'error');
        } finally {
            btn.textContent = 'Save Changes';
            btn.disabled = false;
        }
    }

    // ─── COURSE PDF MANAGEMENT ───
    function bindPdfEvents(managerEl) {
        const fileInput = managerEl.querySelector('.pdf-file-input');
        const nameEl = managerEl.querySelector('.pdf-chosen-name');
        const uploadBtn = managerEl.querySelector('.pdf-upload-btn');
        const deleteBtn = managerEl.querySelector('.pdf-delete-btn');
        const chooseBtn = managerEl.querySelector('.pdf-choose-btn');

        chooseBtn?.addEventListener('click', () => fileInput?.click());

        fileInput?.addEventListener('change', function() {
            const name = this.files[0]?.name || '';
            if (name) {
                nameEl.textContent = name;
                uploadBtn.style.display = '';
            }
        });

        uploadBtn?.addEventListener('click', async function() {
            const file = fileInput?.files[0];
            if (!file) return;
            await uploadCoursePdf(managerEl.dataset.courseId, file, managerEl);
        });

        deleteBtn?.addEventListener('click', async function() {
            await deleteCoursePdf(managerEl.dataset.courseId, managerEl);
        });
    }

    async function uploadCoursePdf(courseId, file, managerEl) {
        const uploadBtn = managerEl.querySelector('.pdf-upload-btn');
        const orig = uploadBtn?.textContent;
        if (uploadBtn) { uploadBtn.textContent = 'Uploading...'; uploadBtn.disabled = true; }

        try {
            const session = await KaizenAuth.getSession();
            const token = session?.access_token || SB_KEY;
            // Store as {courseId}/{originalFilename} so the real name is preserved in the URL
            const storagePath = `${courseId}/${file.name}`;

            const uploadRes = await fetch(`${SB_URL}/storage/v1/object/course-pdfs/${encodeURIComponent(storagePath).replace('%2F', '/')}`, {
                method: 'POST',
                headers: {
                    'apikey': SB_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/pdf',
                    'x-upsert': 'true'
                },
                body: file
            });

            if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({}));
                throw new Error(err.message || `Upload failed (${uploadRes.status})`);
            }

            const pdfUrl = `${SB_URL}/storage/v1/object/public/course-pdfs/${courseId}/${encodeURIComponent(file.name)}`;

            const patchRes = await fetch(`${SB_URL}/rest/v1/courses?id=eq.${courseId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SB_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ pdf_url: pdfUrl, updated_at: new Date().toISOString() })
            });

            if (!patchRes.ok) throw new Error('Failed to save PDF URL to database');

            showToast('PDF uploaded!', 'success');
            logAudit('update_course', `Course ${courseId}: PDF uploaded`);
            renderPdfManager(managerEl, courseId, pdfUrl);
        } catch (e) {
            console.error('PDF upload error:', e);
            showToast(`PDF upload failed: ${e.message}`, 'error');
            if (uploadBtn) { uploadBtn.textContent = orig; uploadBtn.disabled = false; }
        }
    }

    async function deleteCoursePdf(courseId, managerEl) {
        if (!confirm('Delete the PDF for this course? This cannot be undone.')) return;
        const deleteBtn = managerEl.querySelector('.pdf-delete-btn');
        if (deleteBtn) { deleteBtn.textContent = 'Deleting...'; deleteBtn.disabled = true; }

        try {
            const session = await KaizenAuth.getSession();
            const token = session?.access_token || SB_KEY;

            // Extract storage path from the current pdf_url
            const currentUrl = managerEl.querySelector('.pdf-current-link')?.href || '';
            const marker = '/course-pdfs/';
            const storagePath = currentUrl.includes(marker)
                ? decodeURIComponent(currentUrl.split(marker)[1])
                : `${courseId}.pdf`;

            await fetch(`${SB_URL}/storage/v1/object/course-pdfs`, {
                method: 'DELETE',
                headers: {
                    'apikey': SB_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prefixes: [storagePath] })
            });

            const patchRes = await fetch(`${SB_URL}/rest/v1/courses?id=eq.${courseId}`, {
                method: 'PATCH',
                headers: {
                    'apikey': SB_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ pdf_url: '', updated_at: new Date().toISOString() })
            });

            if (!patchRes.ok) throw new Error('Failed to clear PDF URL');

            showToast('PDF deleted.', 'success');
            logAudit('update_course', `Course ${courseId}: PDF deleted`);
            renderPdfManager(managerEl, courseId, null);
        } catch (e) {
            console.error('PDF delete error:', e);
            showToast(`Delete failed: ${e.message}`, 'error');
            if (deleteBtn) { deleteBtn.textContent = 'Delete PDF'; deleteBtn.disabled = false; }
        }
    }

    function renderPdfManager(managerEl, courseId, pdfUrl) {
        managerEl.innerHTML = `
            ${pdfUrl ? `
            <div class="pdf-current">
                <span class="pdf-current-icon">📄</span>
                <a href="${esc(pdfUrl)}" target="_blank" class="pdf-current-link">Current PDF — click to preview</a>
                <button class="btn btn-danger pdf-delete-btn" type="button">Delete PDF</button>
            </div>` : `<p class="pdf-none-msg">No PDF uploaded yet for this course.</p>`}
            <div class="pdf-upload-area">
                <button class="btn btn-outline pdf-choose-btn" type="button">${pdfUrl ? 'Replace PDF' : 'Upload PDF'}</button>
                <input type="file" class="pdf-file-input" accept="application/pdf" style="display:none">
                <span class="pdf-chosen-name"></span>
                <button class="btn btn-primary pdf-upload-btn" type="button" style="display:none">Upload</button>
            </div>`;
        bindPdfEvents(managerEl);
    }

    // ─── TEAM MANAGEMENT ───
    async function loadTeam() {
        const { data } = await sbFetch('profiles', { params: { select: '*, permissions(*)', role: 'in.(admin,employee)', order: 'created_at.desc' } });
        renderTeam(data || []);
    }

    function renderTeam(members) {
        const container = $('#teamList');
        if (!members.length) { container.innerHTML = '<p class="empty-state">No team members</p>'; return; }
        const permLabels = { can_manage_blogs:'Blogs', can_manage_courses:'Courses', can_manage_members:'Members', can_manage_enrollments:'Enrollments', can_manage_policies:'Policies', can_manage_settings:'Settings', can_view_audit_log:'Audit' };
        container.innerHTML = `<table class="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Permissions</th><th>Actions</th></tr></thead>
            <tbody>${members.map(m => {
                const perms = m.permissions?.[0] || {};
                const permTags = m.role === 'admin' 
                    ? '<span class="perm-tag">All Access</span>'
                    : Object.entries(permLabels).filter(([k]) => perms[k]).map(([,v]) => `<span class="perm-tag">${v}</span>`).join('') || '<span class="text-muted">No permissions</span>';
                const actions = m.role !== 'admin' ? `<button class="btn btn-secondary btn-sm" onclick="AdminPanel.editPerms('${m.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger-text" onclick="AdminPanel.removeEmployee('${m.id}')">Remove</button>` : '—';
                return `<tr>
                    <td>${esc(m.first_name + ' ' + (m.last_name || ''))}</td>
                    <td>${esc(m.email)}</td>
                    <td><span class="badge badge-${m.role === 'admin' ? 'active' : 'pending'}">${m.role}</span></td>
                    <td><div class="perm-tags-inline">${permTags}</div></td>
                    <td>${actions}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
    }

    $('#createEmployeeBtn')?.addEventListener('click', async () => {
        const firstName = $('#empFirstName').value.trim();
        const lastName = $('#empLastName').value.trim();
        const email = $('#empEmail').value.trim();
        const password = $('#empPassword').value;
        if (!firstName || !email || !password) { showToast('Fill in all required fields', 'error'); return; }
        if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }

        const btn = $('#createEmployeeBtn');
        btn.disabled = true;
        btn.textContent = 'Creating...';

        try {
            const session = await KaizenAuth.getSession();
            const permissions = {
                can_manage_blogs: $('#empPermBlogs').checked,
                can_manage_courses: $('#empPermCourses').checked,
                can_manage_members: $('#empPermMembers').checked,
                can_manage_enrollments: $('#empPermEnrollments').checked,
                can_manage_policies: $('#empPermPolicies').checked,
                can_manage_settings: $('#empPermSettings').checked,
                can_view_audit_log: $('#empPermAudit').checked,
            };

            // Call Vercel API (uses service_role server-side)
            const res = await fetch(`/api/create-employee`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName, permissions })
            });
            const result = await res.json();
            if (!res.ok || result.error) {
                showToast(result.error || 'Failed to create employee', 'error');
                return;
            }

            showToast(`Employee ${email} created successfully!`, 'success');
            logAudit('create_employee', `Created ${email}`);
            // Reset form
            $('#empFirstName').value = '';
            $('#empLastName').value = '';
            $('#empEmail').value = '';
            $('#empPassword').value = '';
            $$('#newEmpPerms input[type=checkbox]').forEach(c => c.checked = false);
            loadTeam();
        } catch (e) {
            console.error('Create employee error:', e);
            showToast('Failed to create employee: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Employee';
        }
    });

    // ─── BLOG MANAGEMENT ───
    async function loadBlogPosts() {
        const { data } = await sbFetch('blog_posts', { params: { select: '*, profiles(first_name,last_name)', order: 'created_at.desc' } });
        renderBlogList(data || []);
    }

    function renderBlogList(posts) {
        const container = $('#blogPostsList');
        container.classList.remove('admin-loading');
        if (!posts.length) { container.innerHTML = '<p style="color:rgba(255,255,255,0.3);text-align:center;padding:3rem">No blog posts yet. Click <strong>+ New Post</strong> to create one.</p>'; return; }
        container.innerHTML = posts.map(p => {
            const author = getPostAuthorName(p, 'Unknown');
            const statusClass = p.status === 'published' ? 'active' : p.status === 'archived' ? 'cancelled' : 'draft';
            const statusIcon = p.status === 'published' ? '🟢' : p.status === 'archived' ? '🔴' : '⚪';
            const coverBg = p.cover_image_url ? `background-image:url('${esc(p.cover_image_url)}');background-size:cover;background-position:center;` : 'background:linear-gradient(135deg,var(--admin-surface-2),var(--admin-surface-3));display:flex;align-items:center;justify-content:center;';
            const coverFallback = p.cover_image_url ? '' : '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
            return `<div class="blog-mgr-card" onclick="AdminPanel.editBlogPost('${p.id}')">
                <div class="blog-mgr-cover" style="${coverBg}">${coverFallback}</div>
                <div class="blog-mgr-body">
                    <div class="blog-mgr-top">
                        <span class="badge badge-${statusClass}" style="font-size:0.65rem">${statusIcon} ${p.status}</span>
                        <span class="blog-mgr-category">${esc(p.category || 'General')}</span>
                    </div>
                    <h4 class="blog-mgr-title">${esc(p.title)}</h4>
                    <p class="blog-mgr-excerpt">${esc(p.excerpt || 'No excerpt added...')}</p>
                    <div class="blog-mgr-footer">
                        <span class="blog-mgr-author">by ${esc(author)}</span>
                        <span class="blog-mgr-date">${formatDate(p.published_at || p.created_at)}</span>
                        <span class="blog-mgr-views">${p.views_count || 0} views</span>
                    </div>
                    <div class="blog-mgr-actions">
                        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();AdminPanel.editBlogPost('${p.id}')">✏️ Edit</button>
                        ${p.status === 'published' 
                            ? `<button class="btn btn-sm" style="background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.1)" onclick="event.stopPropagation();AdminPanel.toggleBlogStatus('${p.id}', 'draft')">⏸ Set Draft</button>`
                            : `<button class="btn btn-sm" style="background:rgba(199,113,17,0.15);color:var(--admin-accent-light);border:1px solid rgba(199,113,17,0.3)" onclick="event.stopPropagation();AdminPanel.toggleBlogStatus('${p.id}', 'published')">🚀 Publish</button>`
                        }
                        <button class="btn btn-sm" style="background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.2)" onclick="event.stopPropagation();AdminPanel.deleteBlogPost('${p.id}')">🗑 Delete</button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // ─── BLOG BLOCK EDITOR ───
    let editorInstance = null;

    function openBlogEditor(post = null) {
        $('#blogListView').style.display = 'none';
        $('#blogEditorView').style.display = '';
        $('#blogPostId').value = post?.id || '';
        $('#blogTitle').value = post?.title || '';
        $('#blogAuthorName').value = post ? getPostAuthorName(post, getCurrentBlogAuthorName()) : getCurrentBlogAuthorName();
        $('#blogCategory').value = post?.category || 'General';
        $('#blogTags').value = post?.tags?.join(', ') || '';
        $('#blogExcerpt').value = post?.excerpt || '';
        $('#blogCoverUrl').value = post?.cover_image_url || '';
        $('#blogPostStatus').value = post?.status || 'draft';
        updateCoverPreview();

        const savedContent = post?.content || '';
        const mountEl = $('#editorjs');
        if (editorInstance) {
            editorInstance.destroy();
            editorInstance = null;
        }
        if (mountEl) mountEl.innerHTML = '';

        try {
            if (typeof window.KaizenBlogEditor !== 'function') {
                throw new Error('Local blog editor is unavailable.');
            }
            editorInstance = new window.KaizenBlogEditor({
                holder: mountEl,
                data: savedContent,
                uploadImage: uploadBlogImage,
                showToast
            });
        } catch (err) {
            console.error('Blog editor init failed:', err);
            showToast('Editor failed to load: ' + err.message, 'error');
        }
    }

    // Custom modal prompt (replaces ugly browser prompt)
    function adminPrompt(title, placeholder = '') {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'admin-modal-overlay';
            overlay.innerHTML = `
                <div class="admin-modal">
                    <h3>${title}</h3>
                    <input type="text" class="form-control" placeholder="${placeholder}" autofocus>
                    <div class="admin-modal-actions">
                        <button class="btn btn-secondary btn-sm admin-modal-cancel">Cancel</button>
                        <button class="btn btn-primary btn-sm admin-modal-ok">OK</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            const input = overlay.querySelector('input');
            const ok = () => { resolve(input.value.trim()); overlay.remove(); };
            const cancel = () => { resolve(null); overlay.remove(); };
            overlay.querySelector('.admin-modal-ok').onclick = ok;
            overlay.querySelector('.admin-modal-cancel').onclick = cancel;
            overlay.addEventListener('click', e => { if (e.target === overlay) cancel(); });
            input.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') cancel(); });
            requestAnimationFrame(() => input.focus());
        });
    }

    // Compress image before upload
    function compressImage(file, maxWidth = 1200, quality = 0.8) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (w > maxWidth) { h = (maxWidth / w) * h; w = maxWidth; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    canvas.toBlob(blob => resolve(blob), 'image/webp', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // Custom confirm dialog (replaces native confirm)
    function adminConfirm(title, message = '') {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'admin-modal-overlay';
            overlay.innerHTML = `
                <div class="admin-modal">
                    <h3>${title}</h3>
                    ${message ? `<p style="color:rgba(255,255,255,0.5);font-size:0.9rem;margin:0 0 1rem">${message}</p>` : ''}
                    <div class="admin-modal-actions">
                        <button class="btn btn-secondary btn-sm admin-modal-cancel">Cancel</button>
                        <button class="btn btn-primary btn-sm admin-modal-ok">Confirm</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.querySelector('.admin-modal-ok').onclick = () => { resolve(true); overlay.remove(); };
            overlay.querySelector('.admin-modal-cancel').onclick = () => { resolve(false); overlay.remove(); };
            overlay.addEventListener('click', e => { if (e.target === overlay) { resolve(false); overlay.remove(); } });
        });
    }

    // Permissions toggle modal (replaces 7 sequential confirm calls)
    function adminPermsModal(fields, labels, currentPerms) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'admin-modal-overlay';
            const checkboxes = fields.map(f =>
                `<label class="perm-checkbox"><input type="checkbox" data-field="${f}" ${currentPerms[f] ? 'checked' : ''}> <span>${labels[f]}</span></label>`
            ).join('');
            overlay.innerHTML = `
                <div class="admin-modal">
                    <h3>Edit Permissions</h3>
                    <div class="perm-modal-grid">${checkboxes}</div>
                    <div class="admin-modal-actions">
                        <button class="btn btn-secondary btn-sm admin-modal-cancel">Cancel</button>
                        <button class="btn btn-primary btn-sm admin-modal-ok">Save Permissions</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.querySelector('.admin-modal-ok').onclick = () => {
                const result = {};
                overlay.querySelectorAll('input[data-field]').forEach(cb => { result[cb.dataset.field] = cb.checked; });
                resolve(result);
                overlay.remove();
            };
            overlay.querySelector('.admin-modal-cancel').onclick = () => { resolve(null); overlay.remove(); };
            overlay.addEventListener('click', e => { if (e.target === overlay) { resolve(null); overlay.remove(); } });
        });
    }

    // Upload image to Supabase Storage (with compression + size limits)
    const MAX_INPUT_MB = 10;   // reject raw files larger than this
    const MAX_OUTPUT_MB = 2;   // reject compressed result larger than this

    async function uploadBlogImage(file) {
        // 1. Check raw file size
        if (file.size > MAX_INPUT_MB * 1024 * 1024) {
            throw new Error(`File too large (max ${MAX_INPUT_MB} MB). Please use a smaller image.`);
        }

        // 2. Compress
        const compressed = await compressImage(file);

        // 3. Check compressed size
        if (compressed.size > MAX_OUTPUT_MB * 1024 * 1024) {
            throw new Error(`Compressed image still exceeds ${MAX_OUTPUT_MB} MB. Try a smaller or simpler image.`);
        }

        const filename = `img-${Date.now()}-${Math.random().toString(36).slice(2,7)}.webp`;
        const session = await KaizenAuth.getSession();
        if (!session?.access_token) throw new Error('Not logged in — please refresh and try again.');

        const res = await fetch(`${SB_URL}/storage/v1/object/blog-images/${filename}`, {
            method: 'POST',
            headers: {
                'apikey': SB_KEY,
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'image/webp'
            },
            body: compressed
        });

        if (!res.ok) {
            let errMsg = `Upload failed (${res.status})`;
            try {
                const errBody = await res.json();
                errMsg = errBody.message || errBody.error || errMsg;
            } catch (_) {}
            throw new Error(errMsg);
        }

        return `${SB_URL}/storage/v1/object/public/blog-images/${filename}`;
    }

    function closeBlogEditor() {
        if (editorInstance) { editorInstance.destroy(); editorInstance = null; }
        $('#blogEditorView').style.display = 'none';
        $('#blogListView').style.display = '';
        loadBlogPosts();
    }

    $('#newPostBtn')?.addEventListener('click', () => openBlogEditor());
    $('#backToBlogList')?.addEventListener('click', closeBlogEditor);

    // Cover image upload (with compression)
    $('#uploadCoverBtn')?.addEventListener('click', () => $('#blogCoverFile').click());
    $('#blogCoverFile')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showToast('Compressing & uploading cover...', 'success');
        try {
            const url = await uploadBlogImage(file);
            $('#blogCoverUrl').value = url;
            updateCoverPreview();
            showToast('Cover image uploaded!', 'success');
        } catch (err) {
            showToast('Cover upload failed: ' + err.message, 'error');
        }
    });

    $('#blogCoverUrl')?.addEventListener('input', updateCoverPreview);
    function updateCoverPreview() {
        const url = $('#blogCoverUrl')?.value;
        const preview = $('#coverPreview');
        if (preview) preview.innerHTML = url ? `<img src="${url}" alt="Cover preview">` : '';
    }

    function slugify(text) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
    }

    // Save blog post
    $('#saveBlogPostBtn')?.addEventListener('click', async () => {
        const id = $('#blogPostId').value;
        const title = $('#blogTitle').value.trim();
        if (!title) { showToast('Title is required', 'error'); return; }
        if (!editorInstance) { showToast('Editor not ready', 'error'); return; }

        let outputData;
        try {
            outputData = mergeBlogMeta(await editorInstance.save(), {
                authorName: $('#blogAuthorName').value.trim() || getCurrentBlogAuthorName()
            });
        } catch (e) {
            showToast('Could not read editor content', 'error'); return;
        }

        const status = $('#blogPostStatus').value;
        const postData = {
            title,
            ...(!id && { slug: slugify(title) }),
            category: $('#blogCategory').value,
            tags: $('#blogTags').value.split(',').map(t => t.trim()).filter(Boolean),
            excerpt: $('#blogExcerpt').value.trim(),
            cover_image_url: $('#blogCoverUrl').value.trim(),
            content: JSON.stringify(outputData),
            status,
            updated_at: new Date().toISOString(),
        };
        if (status === 'published' && !id) postData.published_at = new Date().toISOString();
        if (!id) postData.author_id = currentUser.id;

        try {
            if (id) {
                await sbFetch(`blog_posts?id=eq.${id}`, { method: 'PATCH', body: postData });
                showToast('Post updated!', 'success');
            } else {
                const { data } = await sbFetch('blog_posts', { method: 'POST', body: postData });
                if (data?.[0]?.id) $('#blogPostId').value = data[0].id;
                showToast('Post created!', 'success');
            }
            logAudit(id ? 'update_blog_post' : 'create_blog_post', title);
        } catch (e) {
            showToast('Failed to save post: ' + e.message, 'error');
        }
    });

    // ─── PUBLIC API (for inline onclick handlers) ───
    window.AdminPanel = {
        async updateCourseStatus(id, status) {
            await sbFetch(`courses?id=eq.${id}`, { method: 'PATCH', body: { status } });
            showToast(`Course status → ${status}`, 'success');
            logAudit('update_course', `Course ${id} status: ${status}`);
            loadCourses();
        },
        async toggleCourseVisibility(id, visible) {
            await sbFetch(`courses?id=eq.${id}`, { method: 'PATCH', body: { is_visible: visible } });
            showToast(`Course visibility → ${visible ? 'visible' : 'hidden'}`, 'success');
            loadCourses();
        },
        async updatePaymentStatus(id, status) {
            await sbFetch(`enrollments?id=eq.${id}`, { method: 'PATCH', body: { payment_status: status } });
            showToast(`Payment → ${status}`, 'success');
            logAudit('update_payment', `Enrollment ${id} payment: ${status}`);
            loadEnrollments();
        },
        async viewMember(id) {
            const { data } = await sbFetch(`profiles?id=eq.${id}`, { params: { select: '*' } });
            const m = data?.[0];
            if (!m) { showToast('Member not found', 'error'); return; }

            const overlay = document.createElement('div');
            overlay.className = 'admin-modal-overlay';
            overlay.innerHTML = `
                <div class="admin-modal" style="max-width:480px;width:100%">
                    <h3 style="margin-bottom:1.25rem">Edit Member</h3>
                    <div style="display:flex;flex-direction:column;gap:0.85rem">
                        <div style="display:flex;gap:0.75rem">
                            <div style="flex:1"><label style="font-size:0.75rem;color:rgba(255,255,255,0.5);display:block;margin-bottom:0.3rem">First Name</label>
                                <input id="mEditFirst" class="form-control" value="${esc(m.first_name || '')}"></div>
                            <div style="flex:1"><label style="font-size:0.75rem;color:rgba(255,255,255,0.5);display:block;margin-bottom:0.3rem">Last Name</label>
                                <input id="mEditLast" class="form-control" value="${esc(m.last_name || '')}"></div>
                        </div>
                        <div><label style="font-size:0.75rem;color:rgba(255,255,255,0.5);display:block;margin-bottom:0.3rem">Email</label>
                            <input id="mEditEmail" class="form-control" value="${esc(m.email || '')}" readonly style="opacity:0.5;cursor:not-allowed" title="Email cannot be changed here"></div>
                        <div><label style="font-size:0.75rem;color:rgba(255,255,255,0.5);display:block;margin-bottom:0.3rem">Phone</label>
                            <input id="mEditPhone" class="form-control" value="${esc(m.phone || '')}"></div>
                        <div><label style="font-size:0.75rem;color:rgba(255,255,255,0.5);display:block;margin-bottom:0.3rem">Role</label>
                            <select id="mEditRole" class="form-control">
                                <option value="member" ${m.role === 'member' ? 'selected' : ''}>Member (Student)</option>
                                <option value="employee" ${m.role === 'employee' ? 'selected' : ''}>Employee (Staff)</option>
                                <option value="admin" ${m.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select></div>
                        <p style="font-size:0.72rem;color:rgba(255,255,255,0.3);margin:0">Joined: ${formatDate(m.created_at)}</p>
                    </div>
                    <div class="admin-modal-actions" style="margin-top:1.5rem;justify-content:space-between;display:flex;gap:0.5rem">
                        <button class="btn btn-sm" id="mEditDelete" style="background:rgba(239,68,68,0.1);color:#f87171;border:1px solid rgba(239,68,68,0.25);margin-right:auto">Delete Account</button>
                        <button class="btn btn-secondary btn-sm" id="mEditCancel">Cancel</button>
                        <button class="btn btn-primary btn-sm" id="mEditSave">Save Changes</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            overlay.querySelector('#mEditCancel').onclick = () => overlay.remove();
            overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
            overlay.querySelector('#mEditSave').onclick = async () => {
                const updates = {
                    first_name: overlay.querySelector('#mEditFirst').value.trim(),
                    last_name: overlay.querySelector('#mEditLast').value.trim(),
                    phone: overlay.querySelector('#mEditPhone').value.trim(),
                    role: overlay.querySelector('#mEditRole').value
                };
                try {
                    await sbFetch(`profiles?id=eq.${id}`, { method: 'PATCH', body: updates });
                    showToast('Member updated!', 'success');
                    logAudit('edit_member', `Updated member ${id}`);
                    overlay.remove();
                    loadMembers();
                } catch (e) {
                    showToast('Failed to save: ' + e.message, 'error');
                }
            };
            overlay.querySelector('#mEditDelete').onclick = async () => {
                const yes = await adminConfirm('Delete this account?', 'This permanently deletes the user and all their data. This cannot be undone.');
                if (!yes) return;
                try {
                    const session = await KaizenAuth.getSession();
                    const res = await fetch('/api/delete-user', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: id })
                    });
                    const result = await res.json();
                    if (!res.ok) { showToast(result.error || 'Failed to delete', 'error'); return; }
                    showToast('Account deleted', 'success');
                    logAudit('delete_member', `Deleted account ${id}`);
                    overlay.remove();
                    loadMembers();
                } catch (e) {
                    showToast('Failed to delete: ' + e.message, 'error');
                }
            };
        },
        editPolicy(id) { openPolicyEditor(id); },
        async editBlogPost(id) {
            const { data } = await sbFetch(`blog_posts?id=eq.${id}`, { params: { select: '*' } });
            if (data?.[0]) openBlogEditor(data[0]);
        },
        async toggleBlogStatus(id, newStatus) {
            const update = { status: newStatus };
            if (newStatus === 'published') update.published_at = new Date().toISOString();
            
            try {
                await sbFetch(`blog_posts?id=eq.${id}`, { method: 'PATCH', body: update });
                showToast(`Post ${newStatus === 'published' ? 'published! 🚀' : 'moved to drafts.'}`, 'success');
                logAudit('toggle_blog_status', `ID: ${id}, Status: ${newStatus}`);
                loadBlogPosts();
            } catch (e) {
                showToast('Failed to update status', 'error');
            }
        },
        async deleteBlogPost(id) {
            const yes = await adminConfirm('Delete this blog post?', 'This action cannot be undone.');
            if (!yes) return;
            await sbFetch(`blog_posts?id=eq.${id}`, { method: 'DELETE' });
            showToast('Post deleted', 'success');
            logAudit('delete_blog_post', `Deleted post ${id}`);
            closeBlogEditor();
        },
        async editPerms(userId) {
            const { data } = await sbFetch('permissions', { params: { select: '*', user_id: `eq.${userId}` } });
            const perms = data?.[0] || {};
            const fields = ['can_manage_blogs','can_manage_courses','can_manage_members','can_manage_enrollments','can_manage_policies','can_manage_settings','can_view_audit_log'];
            const labels = { can_manage_blogs:'Blogs', can_manage_courses:'Courses', can_manage_members:'Members', can_manage_enrollments:'Enrollments', can_manage_policies:'Policies', can_manage_settings:'Settings', can_view_audit_log:'Audit' };
            // Show permissions modal
            const result = await adminPermsModal(fields, labels, perms);
            if (!result) return;
            // Use upsert so it works whether a row already exists or not
            const session = await KaizenAuth.getSession();
            const token = session?.access_token || SB_KEY;
            await fetch(`${SB_URL}/rest/v1/permissions?on_conflict=user_id`, {
                method: 'POST',
                headers: {
                    'apikey': SB_KEY,
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates,return=minimal'
                },
                body: JSON.stringify({ user_id: userId, ...result, updated_at: new Date().toISOString() })
            });
            showToast('Permissions updated!', 'success');
            logAudit('update_permissions', `Updated perms for ${userId}`);
            loadTeam();
        },
        async removeEmployee(userId) {
            const yes = await adminConfirm('Remove this employee?', 'They will lose access to the admin panel.');
            if (!yes) return;
            await sbFetch(`profiles?id=eq.${userId}`, { method: 'PATCH', body: { role: 'member' } });
            await sbFetch(`permissions?user_id=eq.${userId}`, { method: 'DELETE' });
            showToast('Employee removed', 'success');
            logAudit('remove_employee', `Removed employee ${userId}`);
            loadTeam();
        },
    };

    // ─── BOOT ───
    init();
})();









