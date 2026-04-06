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
            // Load employee permissions
            try {
                const { data: perms } = await sbFetch('permissions', { params: { select: '*', user_id: `eq.${user.id}` } });
                if (perms?.length) {
                    currentUser = { ...user, profile };
                    userPermissions = perms[0];
                    showAdminPanel();
                } else {
                    hideLoading();
                    $('#authGate').style.display = 'none';
                    $('#adminLayout').style.display = 'none';
                    $('#accessDenied').style.display = '';
                }
            } catch (e) {
                console.error('Permission load error:', e);
                hideLoading();
                $('#authGate').style.display = 'none';
                $('#adminLayout').style.display = 'none';
                $('#accessDenied').style.display = '';
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

    // ─── COURSES ───
    async function loadCourses() {
        const { data } = await sbFetch('courses', { params: { select: '*', order: 'sort_order.asc' } });
        renderCourses(data || []);
    }

    function renderCourses(courses) {
        const container = $('#coursesList');
        if (!courses.length) { container.innerHTML = '<p class="empty-state">No courses found</p>'; return; }
        container.innerHTML = `<table class="admin-table">
            <thead><tr><th>Course</th><th>Status</th><th>Visible</th><th>Pricing</th><th>Batch</th><th>Order</th></tr></thead>
            <tbody>${courses.map(c => `<tr>
                <td><strong>${esc(c.title)}</strong>${c.subtitle ? '<br><span class="text-muted">' + esc(c.subtitle) + '</span>' : ''}</td>
                <td><select class="form-control form-control-sm" onchange="AdminPanel.updateCourseStatus('${c.id}', this.value)">
                    <option value="active" ${c.status==='active'?'selected':''}>Active</option>
                    <option value="coming_soon" ${c.status==='coming_soon'?'selected':''}>Coming Soon</option>
                    <option value="completed" ${c.status==='completed'?'selected':''}>Completed</option>
                    <option value="draft" ${c.status==='draft'?'selected':''}>Draft</option>
                </select></td>
                <td><div class="toggle-track ${c.is_visible ? 'active' : ''}" onclick="AdminPanel.toggleCourseVisibility('${c.id}', ${!c.is_visible})"></div></td>
                <td class="text-muted">${c.pricing_tiers?.length ? c.pricing_tiers.map(t => t.name + ': ' + t.price + ' ' + (t.currency || 'EGP')).join('<br>') : '—'}</td>
                <td class="text-muted">${esc(c.batch_info || '—')}</td>
                <td class="text-muted">${c.sort_order ?? '—'}</td>
            </tr>`).join('')}</tbody>
        </table>`;
    }

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
    }

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

    function showToast(message, type = 'success') {
        const toast = $('#adminToast');
        $('#toastMessage').textContent = message;
        toast.className = `admin-toast ${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
    function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    function statusBadge(s) { return { active:'active', confirmed:'active', completed:'completed', coming_soon:'pending', draft:'draft', pending:'pending', cancelled:'cancelled' }[s] || 'draft'; }
    function paymentBadge(s) { return { paid:'active', pending:'pending', failed:'cancelled', refunded:'completed' }[s] || 'draft'; }
    function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
    function downloadCSV(csv, filename) { const b = new Blob([csv], {type:'text/csv'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = filename; a.click(); URL.revokeObjectURL(u); }
    // ─── COURSE MANAGEMENT ───
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
                            </div>
                        </div>

                        <!-- Section: Pricing -->
                        <div class="course-editor-section">
                            <div class="course-editor-section-title">Pricing Tiers</div>
                            <div class="course-tiers-list">
                                ${tiers.map((t, idx) => `
                                <div class="tier-edit-row">
                                    <div class="tier-field"><label>Name</label><input type="text" class="tier-name form-control" value="${esc(t.name || '')}" placeholder="e.g. Early Bird"></div>
                                    <div class="tier-field"><label>Price</label><input type="number" class="tier-price form-control" value="${t.price || ''}" placeholder="5000"></div>
                                    <div class="tier-field tier-field-sm"><label>Currency</label>
                                        <select class="tier-currency form-control">
                                            <option value="EGP" ${(t.currency||'EGP') === 'EGP' ? 'selected' : ''}>EGP</option>
                                            <option value="USD" ${t.currency === 'USD' ? 'selected' : ''}>USD</option>
                                        </select>
                                    </div>
                                    <div class="tier-field"><label>Deadline Date</label>
                                        <input type="date" class="tier-deadline form-control" value="${t.deadline || ''}">
                                    </div>
                                    <div class="tier-field" style="flex: 1.5"><label>Extra Info</label>
                                        <input type="text" class="tier-condition form-control" value="${esc(t.condition || '')}" placeholder="Optional info (e.g. Class of 2024)">
                                    </div>
                                    <button class="btn-remove-tier" title="Remove tier" type="button">✕</button>
                                </div>`).join('')}
                            </div>
                            <button class="add-tier-btn" type="button">+ Add Pricing Tier</button>
                        </div>

                        <!-- Section: Highlights -->
                        <div class="course-editor-section">
                            <div class="course-editor-section-title">Course Highlights</div>
                            <textarea class="course-highlights-text form-control" placeholder="One highlight per line...">${highlights.map(h => h.text || h).join('\n')}</textarea>
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
                                    <label>Next Batch</label>
                                    <input type="text" class="course-next-batch form-control" value="${esc(c.next_batch_info || '')}" placeholder="e.g. Starts June 6, 2026">
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
        const nextBatch = card.querySelector('.course-next-batch')?.value || null;
        const subtitle = card.querySelector('.course-subtitle')?.value || '';
        const instructor = card.querySelector('.course-instructor')?.value || '';
        const isVisible = card.querySelector('.toggle-track[data-field="is_visible"]').classList.contains('active');

        // Parse Prices (Row-based)
        const tierRows = card.querySelectorAll('.tier-edit-row');
        const pricingTiers = Array.from(tierRows).map(row => ({
            name: row.querySelector('.tier-name').value.trim(),
            price: parseFloat(row.querySelector('.tier-price').value) || 0,
            currency: row.querySelector('.tier-currency').value,
            deadline: row.querySelector('.tier-deadline') ? row.querySelector('.tier-deadline').value : '',
            condition: row.querySelector('.tier-condition') ? row.querySelector('.tier-condition').value.trim() : ''
        })).filter(t => t.name || t.price);

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
            next_batch_info: nextBatch, 
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

            // Call Edge Function (uses service_role server-side)
            const res = await fetch(`${SB_URL}/functions/v1/create-employee`, {
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
            const author = p.profiles ? `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.trim() : 'Unknown';
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

    // Blog editor
    function openBlogEditor(post = null) {
        $('#blogListView').style.display = 'none';
        $('#blogEditorView').style.display = '';
        $('#blogPostId').value = post?.id || '';
        $('#blogTitle').value = post?.title || '';
        $('#blogCategory').value = post?.category || 'General';
        $('#blogTags').value = post?.tags?.join(', ') || '';
        $('#blogExcerpt').value = post?.excerpt || '';
        $('#blogCoverUrl').value = post?.cover_image_url || '';
        $('#blogPostStatus').value = post?.status || 'draft';
        $('#blogContentEditor').innerHTML = post?.content || '';
        updateCoverPreview();
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

    // Upload image to Supabase Storage (with compression)
    async function uploadBlogImage(file) {
        const compressed = await compressImage(file);
        const filename = `img-${Date.now()}.webp`;
        const session = await KaizenAuth.getSession();
        const res = await fetch(`${SB_URL}/storage/v1/object/blog-images/${filename}`, {
            method: 'POST',
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'image/webp' },
            body: compressed
        });
        if (!res.ok) throw new Error('Upload failed');
        return `${SB_URL}/storage/v1/object/public/blog-images/${filename}`;
    }

    // Rich text toolbar
    $$('.toolbar-btn[data-cmd]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const cmd = btn.dataset.cmd;
            const val = btn.dataset.val || null;
            if (cmd === 'createLink') {
                const url = await adminPrompt('Insert Link', 'https://example.com');
                if (url) document.execCommand(cmd, false, url);
            } else {
                document.execCommand(cmd, false, val);
            }
            $('#blogContentEditor').focus();
        });
    });

    // Insert YouTube embed
    $('#insertYoutubeBtn')?.addEventListener('click', async () => {
        const url = await adminPrompt('Embed YouTube Video', 'https://www.youtube.com/watch?v=...');
        if (!url) return;
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\\w-]{11})/);
        if (match) {
            const iframe = `<div class="embed-responsive"><iframe src="https://www.youtube.com/embed/${match[1]}" allowfullscreen></iframe></div><p><br></p>`;
            document.execCommand('insertHTML', false, iframe);
        } else {
            showToast('Invalid YouTube URL', 'error');
        }
    });

    // Insert Facebook video embed
    $('#insertFbVideoBtn')?.addEventListener('click', async () => {
        const url = await adminPrompt('Embed Facebook Video', 'https://www.facebook.com/...');
        if (!url) return;
        const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
        const iframe = `<div class="embed-responsive"><iframe src="${embedUrl}" scrolling="no" allowfullscreen="true"></iframe></div><p><br></p>`;
        document.execCommand('insertHTML', false, iframe);
    });

    // Insert image — choose file upload or URL
    $('#insertImageBtn')?.addEventListener('click', () => {
        // Show a choice: upload file or paste URL
        const overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay';
        overlay.innerHTML = `
            <div class="admin-modal">
                <h3>Insert Image</h3>
                <div class="image-insert-options">
                    <button class="btn btn-primary btn-sm" id="imgUploadChoice">📁 Upload from device</button>
                    <button class="btn btn-secondary btn-sm" id="imgUrlChoice">🔗 Paste URL</button>
                </div>
                <div class="admin-modal-actions">
                    <button class="btn btn-secondary btn-sm admin-modal-cancel">Cancel</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('.admin-modal-cancel').onclick = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        overlay.querySelector('#imgUploadChoice').onclick = () => {
            overlay.remove();
            const input = document.createElement('input');
            input.type = 'file'; input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                showToast('Compressing & uploading...', 'success');
                try {
                    const url = await uploadBlogImage(file);
                    document.execCommand('insertHTML', false, `<img src="${url}" alt="Blog image"><p><br></p>`);
                    showToast('Image inserted!', 'success');
                } catch (err) {
                    showToast('Image upload failed: ' + err.message, 'error');
                }
            };
            input.click();
        };

        overlay.querySelector('#imgUrlChoice').onclick = async () => {
            overlay.remove();
            const url = await adminPrompt('Paste Image URL', 'https://...');
            if (url) {
                document.execCommand('insertHTML', false, `<img src="${url}" alt="Blog image"><p><br></p>`);
            }
        };
    });

    function closeBlogEditor() {
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
        const status = $('#blogPostStatus').value;
        const postData = {
            title,
            slug: slugify(title),
            category: $('#blogCategory').value,
            tags: $('#blogTags').value.split(',').map(t => t.trim()).filter(Boolean),
            excerpt: $('#blogExcerpt').value.trim(),
            cover_image_url: $('#blogCoverUrl').value.trim(),
            content: $('#blogContentEditor').innerHTML,
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
        viewMember(id) { showToast('Member detail view coming soon', 'success'); },
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
            await sbFetch(`permissions?user_id=eq.${userId}`, { method: 'PATCH', body: { ...result, updated_at: new Date().toISOString() } });
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

    // Wire up global logout button
    $('#logoutBtn')?.addEventListener('click', () => KaizenAuth.signOut());
})();
