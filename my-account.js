/**
 * Kaizen Dental Academy — Student Portal Logic
 * Uses KaizenAuth from supabase-auth.js
 */
(function () {
    'use strict';

    const SB_URL = SUPABASE_URL;
    const SB_KEY = SUPABASE_ANON_KEY;

    // ─── STATE ───
    let currentUser = null;
    let currentProfile = null;
    let siteSettings = {};

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    // ═══════════════════════════════════════════
    //  INIT
    // ═══════════════════════════════════════════
    async function init() {
        try {
            const session = await KaizenAuth.getSession();
            if (session?.access_token) {
                currentUser = session.user || await KaizenAuth.getUser();
                currentProfile = await KaizenAuth.getProfile();
                await loadSiteSettings();
                showDashboard();
            } else {
                showAuth();
            }
        } catch (e) {
            console.error('Init error:', e);
            showAuth();
        }
    }

    function showAuth() {
        $('#authScreen').style.display = '';
        $('#dashboard').style.display = 'none';
    }

    // ─── Course slug → ID map (add new courses here) ───
    const COURSE_SLUGS = {
        'ksc': '055b906f-0cec-4bdd-84d7-65a71c053d44',
        'simplified-veneers': '79b935da-077d-436e-9616-f8b0746c2e79',
        '3d-bioprinting': '6167a282-54b7-47f0-b92e-0c2490d431b0'
    };

    // Check if we arrived here with an enrollment intent from a course page
    async function checkEnrollmentIntent() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        if (action !== 'enroll') return false;

        const courseSlug = params.get('course');
        const courseId = COURSE_SLUGS[courseSlug];
        if (!courseId || !currentUser?.id) return false;

        // Show a "preparing payment" state
        showToast('Preparing secure payment gateway...', 'info');

        try {
            const res = await fetch(`/api/create-payment?course_id=${courseId}&user_id=${currentUser.id}`);
            const data = await res.json();

            if (res.ok && data.url) {
                // Smoothly transition to Paymob
                window.location.href = data.url;
                return true;
            } else {
                // If it's a redirect-style response from older version
                if (res.status === 302 || (res.type === 'opaqueredirect')) {
                     window.location.href = res.url;
                     return true;
                }
                throw new Error(data.error || 'Payment gateway currently unavailable');
            }
        } catch (error) {
            console.error('Enrollment error:', error);
            showToast(error.message, 'error');
            // Hide preloader if it's still hanging
            if (typeof window.KaizenPreloader !== 'undefined') {
                window.KaizenPreloader.hide();
            }
            return false; // Fall back to dashboard so user isn't stuck
        }
    }

    async function showDashboard() {
        // 1. Admin/Employee bypass
        if (currentProfile?.role === 'admin' || currentProfile?.role === 'employee') {
            window.location.replace('admin.html');
            return;
        }

        // 2. Clear the preloader immediately if we are staying here
        if (typeof window.KaizenPreloader !== 'undefined') {
            window.KaizenPreloader.hide();
        }

        // 3. Handle Enrollment Intent (The Secure AJAX Redirect)
        if (await checkEnrollmentIntent()) return;

        // 4. Force reveal of the student dashboard on my-account.html
        $('#authScreen').style.display = 'none';
        $('#dashboard').style.display = 'block'; // Ensure it's block
        
        const firstName = currentProfile?.first_name || '';
        const lastName = currentProfile?.last_name || '';
        const name = (firstName + ' ' + lastName).trim() || currentUser?.email?.split('@')[0] || 'Student';
        
        $('#userName').textContent = name;
        $('#userEmail').textContent = currentUser?.email || '';
        loadCourses();
    }

    // ═══════════════════════════════════════════
    //  AUTH VIEWS TOGGLE
    // ═══════════════════════════════════════════
    $('#showRegister')?.addEventListener('click', () => {
        $('#loginView').style.display = 'none';
        $('#registerView').style.display = '';
        $('#forgotView').style.display = 'none';
    });
    $('#showLogin')?.addEventListener('click', () => {
        $('#loginView').style.display = '';
        $('#registerView').style.display = 'none';
        $('#forgotView').style.display = 'none';
    });
    $('#forgotLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        $('#loginView').style.display = 'none';
        $('#forgotView').style.display = '';
    });
    $('#backToLogin')?.addEventListener('click', () => {
        $('#loginView').style.display = '';
        $('#forgotView').style.display = 'none';
    });

    // ═══════════════════════════════════════════
    //  LOGIN
    // ═══════════════════════════════════════════
    $('#loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('#loginBtn');
        const err = $('#loginError');
        err.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Signing in...';
        try {
            const data = await KaizenAuth.signIn(
                $('#loginEmail').value.trim(),
                $('#loginPassword').value
            );
            if (data.error) throw new Error(data.error.message || 'Login failed');
            const session = await KaizenAuth.getSession();
            if (session?.access_token) {
                currentUser = session.user || await KaizenAuth.getUser();
                currentProfile = await KaizenAuth.getProfile();
                await loadSiteSettings();
                showDashboard();
            } else {
                throw new Error('No session returned');
            }
        } catch (ex) {
            err.textContent = ex.message;
            err.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Sign In';
        }
    });

    // ═══════════════════════════════════════════
    //  REGISTER
    // ═══════════════════════════════════════════
    $('#registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('#regBtn');
        const err = $('#regError');
        err.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Creating account...';
        try {
            const email = $('#regEmail').value.trim();
            const password = $('#regPassword').value;
            const full_name = $('#regName').value.trim();
            const phone = $('#regPhone').value.trim();

            const data = await KaizenAuth.signUp(email, password, { full_name, phone });

            const session = await KaizenAuth.getSession();
            if (session?.access_token) {
                // Auto-signed in
                currentUser = session.user || await KaizenAuth.getUser();
                // Update profile with name & phone
                await sbFetch(`profiles?id=eq.${currentUser.id}`, {
                    method: 'PATCH',
                    body: { full_name, phone }
                });
                currentProfile = await KaizenAuth.getProfile();
                await loadSiteSettings();
                showDashboard();
                toast('Account created! Welcome to Kaizen Dental Academy 🎉', 'success');
            } else {
                // Email confirmation required
                err.textContent = 'Check your email for a confirmation link, then sign in.';
                err.style.display = 'block';
                err.style.color = '#22c55e';
            }
        } catch (ex) {
            err.textContent = ex.message;
            err.style.display = 'block';
            err.style.color = '';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    });

    // ═══════════════════════════════════════════
    //  FORGOT PASSWORD
    // ═══════════════════════════════════════════
    $('#forgotForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('#forgotBtn');
        const err = $('#forgotError');
        err.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Sending...';
        try {
            const email = $('#forgotEmail').value.trim();
            const res = await fetch(`${SB_URL}/auth/v1/recover`, {
                method: 'POST',
                headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (!res.ok) throw new Error('Failed to send reset email');
            err.textContent = 'If that email exists, a reset link has been sent. Check your inbox.';
            err.style.display = 'block';
            err.style.color = '#22c55e';
        } catch (ex) {
            err.textContent = ex.message;
            err.style.display = 'block';
            err.style.color = '';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Send Reset Link';
        }
    });

    // ═══════════════════════════════════════════
    //  GOOGLE LOGIN
    // ═══════════════════════════════════════════
    $('#googleLoginBtn')?.addEventListener('click', () => {
        try {
            KaizenAuth.signInWithGoogle(window.location.href);
        } catch (e) {
            toast('Google login unavailable', 'error');
        }
    });

    // ═══════════════════════════════════════════
    //  LOGOUT
    // ═══════════════════════════════════════════
    $('#logoutBtn')?.addEventListener('click', async () => {
        await KaizenAuth.signOut();
        currentUser = null;
        currentProfile = null;
        showAuth();
    });

    // ═══════════════════════════════════════════
    //  TABS
    // ═══════════════════════════════════════════
    $$('.sp-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            $$('.sp-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            $$('.sp-tab-panel').forEach(p => p.classList.remove('active'));
            $(`#panel-${target}`).classList.add('active');
            // Load data for tab
            if (target === 'courses') loadCourses();
            if (target === 'payments') loadPayments();
            if (target === 'profile') loadProfile();
        });
    });

    // ═══════════════════════════════════════════
    //  LOAD SITE SETTINGS (payment method, instapay link)
    // ═══════════════════════════════════════════
    async function loadSiteSettings() {
        try {
            const { data } = await sbFetch('site_settings', { params: { select: 'key,value' } });
            siteSettings = {};
            (data || []).forEach(s => siteSettings[s.key] = s.value);
        } catch (e) { console.warn('Settings load error:', e); }
    }

    // ═══════════════════════════════════════════
    //  MY COURSES
    // ═══════════════════════════════════════════
    async function loadCourses() {
        try {
            const { data: enrollments } = await sbFetch('enrollments', {
                params: { select: '*, courses(id,slug,title,subtitle,price_egp,batch_info,status)', user_id: `eq.${currentUser.id}`, order: 'created_at.desc' }
            });

            if (!enrollments?.length) {
                $('#coursesList').innerHTML = `
                    <div class="sp-empty" style="grid-column:1/-1">
                        <div class="sp-empty-icon">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                        </div>
                        <h3>No Courses Yet</h3>
                        <p>You haven't enrolled in any courses. Browse our programs to get started!</p>
                        <a href="index.html#courses">Browse Courses →</a>
                    </div>`;
                return;
            }

            $('#coursesList').innerHTML = enrollments.map(en => {
                const c = en.courses || {};
                return `
                <div class="sp-course-card">
                    <div class="sp-course-status">
                        <span class="sp-badge sp-badge-${payBadge(en.payment_status)}">${en.payment_status || 'pending'}</span>
                    </div>
                    <h3>${esc(c.title || 'Course')}</h3>
                    <p style="color:var(--sp-text-dim);font-size:0.85rem">${esc(c.subtitle || '')}</p>
                    <div class="sp-course-meta">
                        <span>📅 ${formatDate(en.created_at)}</span>
                        <span>💰 ${c.price_egp ? c.price_egp + ' EGP' : '—'}</span>
                        ${en.payment_method ? `<span>💳 ${en.payment_method}</span>` : ''}
                    </div>
                    <div class="sp-course-actions">
                        ${c.slug ? `<a href="course-${c.slug}.html" class="sp-course-action-btn gold">View Course →</a>` : ''}
                        ${en.payment_status === 'pending' ? `<button class="sp-course-action-btn outline" onclick="StudentPortal.retryPayment('${en.id}','${c.id}')">Update Payment</button>` : ''}
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            console.error('Load courses error:', e);
        }
    }

    // ═══════════════════════════════════════════
    //  PAYMENTS TAB
    // ═══════════════════════════════════════════
    async function loadPayments() {
        try {
            const { data } = await sbFetch('enrollments', {
                params: { select: '*, courses(title)', user_id: `eq.${currentUser.id}`, order: 'created_at.desc' }
            });
            const tbody = $('#paymentsBody');
            if (!data?.length) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.3);padding:3rem">No payment records</td></tr>';
                return;
            }
            tbody.innerHTML = data.map(r => `<tr>
                <td>${formatDate(r.created_at)}</td>
                <td>${esc(r.courses?.title || '—')}</td>
                <td>${r.amount_paid ? r.amount_paid + ' EGP' : '—'}</td>
                <td>${esc(r.payment_method || '—')}</td>
                <td><span class="sp-badge sp-badge-${payBadge(r.payment_status)}">${r.payment_status || 'pending'}</span></td>
            </tr>`).join('');
        } catch (e) {
            console.error('Load payments error:', e);
        }
    }

    // ═══════════════════════════════════════════
    //  PROFILE TAB
    // ═══════════════════════════════════════════
    function loadProfile() {
        if (!currentProfile) return;
        $('#profName').value = currentProfile.full_name || '';
        $('#profEmail').value = currentUser?.email || '';
        $('#profPhone').value = currentProfile.phone || '';
        $('#profRole').value = (currentProfile.role || 'student').charAt(0).toUpperCase() + (currentProfile.role || 'student').slice(1);
    }

    $('#profileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const full_name = $('#profName').value.trim();
            const phone = $('#profPhone').value.trim();
            await sbFetch(`profiles?id=eq.${currentUser.id}`, {
                method: 'PATCH',
                body: { full_name, phone }
            });
            currentProfile.full_name = full_name;
            currentProfile.phone = phone;
            $('#userName').textContent = full_name || currentUser.email;
            toast('Profile updated!', 'success');
        } catch (e) {
            toast('Failed to update profile', 'error');
        }
    });

    // Change password
    $('#passwordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwErr = $('#pwError');
        pwErr.style.display = 'none';
        const newPw = $('#newPassword').value;
        const confirmPw = $('#confirmPassword').value;
        if (newPw !== confirmPw) {
            pwErr.textContent = 'Passwords do not match';
            pwErr.style.display = 'block';
            return;
        }
        try {
            const session = await KaizenAuth.getSession();
            const res = await fetch(`${SB_URL}/auth/v1/user`, {
                method: 'PUT',
                headers: {
                    'apikey': SB_KEY,
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: newPw })
            });
            if (!res.ok) throw new Error('Failed to update password');
            toast('Password updated!', 'success');
            $('#newPassword').value = '';
            $('#confirmPassword').value = '';
        } catch (e) {
            pwErr.textContent = e.message;
            pwErr.style.display = 'block';
        }
    });

    // ═══════════════════════════════════════════
    //  ENROLLMENT MODAL
    // ═══════════════════════════════════════════
    function openEnrollModal(courseId) {
        // Determine payment method
        const method = siteSettings.payment_method || 'instapay';
        if (method === 'paymob' || method === '"paymob"') {
            $('#instapayLayout').style.display = 'none';
            $('#paymobLayout').style.display = '';
        } else {
            $('#instapayLayout').style.display = '';
            $('#paymobLayout').style.display = 'none';
            // Set InstaPay number
            let ipLink = siteSettings.instapay_link || '';
            if (ipLink.startsWith('"') && ipLink.endsWith('"')) ipLink = ipLink.slice(1, -1);
            $('#instapayNumber').textContent = ipLink || 'Contact admin for payment details';
        }
        $('#enrollModal').classList.add('show');
        // Store course ID
        $('#enrollModal').dataset.courseId = courseId;
    }

    // Close modal
    $('#closeModal')?.addEventListener('click', () => {
        $('#enrollModal').classList.remove('show');
    });
    $('#enrollModal')?.addEventListener('click', (e) => {
        if (e.target === $('#enrollModal')) $('#enrollModal').classList.remove('show');
    });

    // Copy InstaPay
    $('#copyInstapay')?.addEventListener('click', () => {
        const num = $('#instapayNumber').textContent;
        navigator.clipboard.writeText(num).then(() => toast('Copied!', 'success'));
    });

    // Upload area
    const uploadArea = $('#uploadArea');
    const proofFile = $('#proofFile');
    uploadArea?.addEventListener('click', () => proofFile.click());
    uploadArea?.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = 'var(--sp-accent)'; });
    uploadArea?.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
    uploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        if (e.dataTransfer.files.length) {
            proofFile.files = e.dataTransfer.files;
            $('#uploadLabel').textContent = e.dataTransfer.files[0].name;
        }
    });
    proofFile?.addEventListener('change', () => {
        if (proofFile.files.length) {
            $('#uploadLabel').textContent = proofFile.files[0].name;
        }
    });

    // Submit InstaPay enrollment
    $('#submitInstapay')?.addEventListener('click', async () => {
        const btn = $('#submitInstapay');
        const err = $('#enrollError');
        err.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Submitting...';
        try {
            const courseId = $('#enrollModal').dataset.courseId;
            const notes = $('#instapayNotes').value.trim();

            // Upload proof if provided
            let proofUrl = null;
            if (proofFile.files.length) {
                const file = proofFile.files[0];
                const session = await KaizenAuth.getSession();
                const filePath = `payment-proofs/${currentUser.id}/${Date.now()}_${file.name}`;
                const uploadRes = await fetch(`${SB_URL}/storage/v1/object/payment-proofs/${filePath}`, {
                    method: 'POST',
                    headers: {
                        'apikey': SB_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': file.type
                    },
                    body: file
                });
                if (uploadRes.ok) {
                    proofUrl = `${SB_URL}/storage/v1/object/public/payment-proofs/${filePath}`;
                }
            }

            // Create enrollment
            const { data, ok } = await sbFetch('enrollments', {
                method: 'POST',
                body: {
                    user_id: currentUser.id,
                    course_id: courseId,
                    status: 'enrolled',
                    payment_status: 'pending',
                    payment_method: 'instapay',
                    notes: [notes, proofUrl ? `Proof: ${proofUrl}` : ''].filter(Boolean).join(' | ')
                }
            });

            if (!ok) throw new Error('Failed to create enrollment');
            toast('Enrollment submitted! 🎉 Payment is being verified.', 'success');
            $('#enrollModal').classList.remove('show');
            loadCourses();
        } catch (e) {
            err.textContent = e.message;
            err.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Submit Enrollment';
        }
    });

    // Submit Paymob enrollment
    $('#submitPaymob')?.addEventListener('click', async () => {
        const btn = $('#submitPaymob');
        btn.disabled = true;
        btn.textContent = 'Redirecting...';
        try {
            const courseId = $('#enrollModal').dataset.courseId;
            // Create pending enrollment first
            await sbFetch('enrollments', {
                method: 'POST',
                body: {
                    user_id: currentUser.id,
                    course_id: courseId,
                    status: 'enrolled',
                    payment_status: 'pending',
                    payment_method: 'paymob'
                }
            });
            // Redirect to Paymob (via Vercel serverless function)
            window.location.href = `/api/create-payment?course_id=${courseId}&user_id=${currentUser.id}`;
        } catch (e) {
            toast('Payment initiation failed', 'error');
            btn.disabled = false;
            btn.textContent = 'Pay Now with Paymob';
        }
    });

    // ═══════════════════════════════════════════
    //  SUPABASE HELPER
    // ═══════════════════════════════════════════
    async function sbFetch(path, { method = 'GET', body = null, params = {} } = {}) {
        const session = await KaizenAuth.getSession();
        const token = session?.access_token || SB_KEY;
        const url = new URL(`${SB_URL}/rest/v1/${path}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const headers = {
            'apikey': SB_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': method === 'GET' ? '' : 'return=representation'
        };
        const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
        const data = await res.json().catch(() => null);
        return { data, ok: res.ok };
    }

    // ═══════════════════════════════════════════
    //  UTILITIES
    // ═══════════════════════════════════════════
    function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
    function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    function payBadge(s) { return { confirmed: 'confirmed', pending: 'pending', failed: 'failed', refunded: 'completed' }[s] || 'pending'; }

    function toast(msg, type = 'success') {
        const t = $('#spToast');
        $('#spToastMsg').textContent = msg;
        t.className = `sp-toast ${type} show`;
        setTimeout(() => t.classList.remove('show'), 3500);
    }

    // ═══════════════════════════════════════════
    //  PUBLIC API
    // ═══════════════════════════════════════════
    window.StudentPortal = {
        enroll(courseId, courseName, price, meta) {
            $('#modalCourseName').textContent = courseName || '—';
            $('#modalPrice').textContent = price ? price + ' EGP' : '—';
            $('#modalCourseMeta').textContent = meta || '';
            openEnrollModal(courseId);
        },
        retryPayment(enrollmentId, courseId) {
            // Re-open the modal for uploading proof
            openEnrollModal(courseId);
        }
    };

    // ─── BOOT ───
    init();
})();
