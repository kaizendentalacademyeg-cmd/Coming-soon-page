/**
 * Kaizen Dental Academy — Blog Logic
 * Handles both listing page (blog.html) and single post (blog-post.html)
 * Uses same auth module and visual identity as main site
 */
(function() {
    'use strict';

    const SB_URL = SUPABASE_URL;
    const SB_KEY = SUPABASE_ANON_KEY;
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const isPostPage = window.location.pathname.includes('blog-post');

    // ─── SUPABASE FETCH ───
    async function sbFetch(path, params = {}) {
        const url = new URL(`${SB_URL}/rest/v1/${path}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const res = await fetch(url, {
            headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
        });
        if (!res.ok) return [];
        return res.json();
    }

    // ─── NAVBAR (same behavior as main site) ───
    const navbar = $('#navbar');
    const mobileToggle = $('#mobileMenuToggle');
    const navLinks = document.querySelector('.nav-links');

    if (navbar) {
        // Scroll effect
        function updateScroll() {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }
        updateScroll();
        window.addEventListener('scroll', updateScroll, { passive: true });
    }

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileToggle.classList.toggle('active');
        });
        // Close on link click
        navLinks.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileToggle.classList.remove('active');
            });
        });
    }

    // ─── AUTH-AWARE NAVBAR ───
    (async function updateNavUser() {
        try {
            if (typeof KaizenAuth === 'undefined') return;
            const session = await KaizenAuth.getSession();
            const btn = $('#navAccountBtn');
            const signoutBtn = $('#navSignOutBtn');
            const text = $('#navAccountText');
            if (!btn || !text) return;

            if (session) {
                const profile = await KaizenAuth.getProfile();
                if (profile) {
                    const name = (profile.first_name || '').trim();
                    if (name) {
                        text.textContent = name;
                        btn.classList.add('logged-in');
                        if (signoutBtn) signoutBtn.style.display = 'flex';
                    }
                    if (profile.role === 'admin' || profile.role === 'employee') {
                        btn.href = 'admin.html';
                    }
                }
            }
        } catch (e) { /* silent */ }
    })();

    // ═══════════════════════════
    //  BLOG LISTING PAGE
    // ═══════════════════════════
    if (!isPostPage) {
        let allPosts = [];
        let activeCategory = 'all';

        async function loadPosts() {
            try {
                const posts = await sbFetch('blog_posts', {
                    select: 'id,slug,title,excerpt,cover_image_url,category,tags,author_id,status,published_at,created_at,views_count,is_featured,profiles(first_name,last_name)',
                    status: 'eq.published',
                    order: 'published_at.desc'
                });
                allPosts = Array.isArray(posts) ? posts : [];
                renderPosts();
            } catch (e) {
                console.error('Failed to load blog posts:', e);
                const grid = $('#blogGrid');
                if (grid) grid.innerHTML = '<p class="blog-loading">Failed to load posts. Please try again later.</p>';
            }
        }

        function renderPosts() {
            const filtered = activeCategory === 'all'
                ? allPosts
                : allPosts.filter(p => p.category === activeCategory);

            const grid = $('#blogGrid');
            const empty = $('#blogEmpty');

            if (!filtered.length) {
                if (grid) grid.innerHTML = '';
                if (empty) empty.style.display = '';
                return;
            }
            if (empty) empty.style.display = 'none';

            grid.innerHTML = filtered.map(p => {
                const author = p.profiles ? `${p.profiles.first_name || ''} ${p.profiles.last_name || ''}`.trim() : 'Kaizen Team';
                const date = p.published_at ? new Date(p.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                const image = p.cover_image_url
                    ? `<div class="blog-card-image-wrap"><img class="blog-card-image" src="${esc(p.cover_image_url)}" alt="${esc(p.title)}" loading="lazy"></div>`
                    : `<div class="blog-card-image-wrap"><div class="blog-card-image-placeholder">🦷</div></div>`;
                const featured = p.is_featured ? '<span class="featured-badge">Featured</span>' : '';

                return `<a href="blog-post.html?slug=${esc(p.slug)}" class="blog-post-card">
                    <div style="position:relative;overflow:hidden">
                        ${image}
                        ${featured}
                    </div>
                    <div class="blog-card-content">
                        <span class="blog-card-category">${esc(p.category || 'General')}</span>
                        <h3 class="blog-card-title">${esc(p.title)}</h3>
                        <p class="blog-card-excerpt">${esc(p.excerpt || '')}</p>
                        <div class="blog-card-footer">
                            <span class="author">${esc(author)}</span>
                            <span>${date}</span>
                        </div>
                    </div>
                </a>`;
            }).join('');
        }

        // Category filter pills
        $$('.filter-pill').forEach(pill => {
            pill.addEventListener('click', () => {
                $$('.filter-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                activeCategory = pill.dataset.category;
                renderPosts();
            });
        });

        loadPosts();
    }

    // ═══════════════════════════
    //  SINGLE POST PAGE
    // ═══════════════════════════
    if (isPostPage) {
        const slug = new URLSearchParams(window.location.search).get('slug');

        async function loadPost() {
            if (!slug) {
                $('#postContent').innerHTML = '<p>Post not found.</p>';
                return;
            }

            try {
                const posts = await sbFetch('blog_posts', {
                    select: '*,profiles(first_name,last_name)',
                    slug: `eq.${slug}`,
                    status: 'eq.published'
                });

                const post = Array.isArray(posts) ? posts[0] : null;
                if (!post) {
                    $('#postContent').innerHTML = '<p>Post not found or not yet published.</p>';
                    return;
                }

                // Update page metadata
                document.title = `${post.title} - Kaizen Dental Academy Blog`;
                const metaDesc = $('meta[name="description"]');
                if (metaDesc) metaDesc.content = post.excerpt || post.title;

                // Cover image
                const cover = $('#postCover');
                if (cover && post.cover_image_url) {
                    cover.style.backgroundImage = `url(${post.cover_image_url})`;
                }

                // Post info
                const author = post.profiles ? `${post.profiles.first_name || ''} ${post.profiles.last_name || ''}`.trim() : 'Kaizen Team';
                const date = post.published_at ? new Date(post.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

                if ($('#postCategory')) $('#postCategory').textContent = post.category || 'General';
                if ($('#postHeading')) $('#postHeading').textContent = post.title;
                if ($('#postAuthor')) $('#postAuthor').textContent = `By ${author}`;
                if ($('#postDate')) $('#postDate').textContent = date;
                if ($('#postViews')) $('#postViews').textContent = `${post.views_count || 0} views`;

                // Content — Editor.js JSON or legacy HTML
                if ($('#postContent')) {
                    let rendered = '<p>No content.</p>';
                    if (post.content) {
                        try {
                            const parsed = JSON.parse(post.content);
                            if (parsed?.blocks) rendered = renderEditorJsBlocks(parsed.blocks);
                            else rendered = post.content;
                        } catch (_) { rendered = post.content; }
                    }
                    $('#postContent').innerHTML = rendered;
                }

                // Increment views (fire and forget)
                incrementViews(post.id, post.views_count || 0);

                // Share buttons
                const url = window.location.href;
                $('#shareWhatsApp')?.addEventListener('click', () => window.open(`https://wa.me/?text=${encodeURIComponent(post.title + ' ' + url)}`, '_blank'));
                $('#shareFacebook')?.addEventListener('click', () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'));
                $('#shareCopy')?.addEventListener('click', () => {
                    navigator.clipboard.writeText(url);
                    const btn = $('#shareCopy');
                    btn.innerHTML = '✓';
                    setTimeout(() => { btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>'; }, 2000);
                });

                // Load related posts
                loadRelated(post.category, post.id);

                // ═══ LOAD COMMENTS ═══
                loadComments(post.id);

            } catch (e) {
                console.error('Failed to load post:', e);
                $('#postContent').innerHTML = '<p>Failed to load post.</p>';
            }
        }

        async function loadComments(postId) {
            try {
                const list = $('#commentsList');
                if (!list) return;

                const comments = await sbFetch('blog_comments', {
                    select: '*,profiles(first_name,last_name)',
                    post_id: `eq.${postId}`,
                    is_approved: 'eq.true',
                    order: 'created_at.desc'
                });

                renderComments(comments);
                
                // Show form based on auth
                const session = await KaizenAuth.getSession();
                setupCommentForm(postId, session);
            } catch (e) {
                console.error('Failed to load comments:', e);
                const list = $('#commentsList');
                if (list) list.innerHTML = '<p class="blog-loading">Comments system temporarily offline.</p>';
            }
        }

        function renderComments(comments) {
            const list = $('#commentsList');
            const count = $('#commentsCount');
            if (!list || !count) return;

            if (!Array.isArray(comments) || !comments.length) {
                list.innerHTML = '<p class="blog-loading">No comments yet. Be the first to start the conversation!</p>';
                count.textContent = '0 Comments';
                return;
            }

            count.textContent = `${comments.length} Comment${comments.length === 1 ? '' : 's'}`;
            list.innerHTML = comments.map(c => {
                const name = c.profiles ? `${c.profiles.first_name || ''} ${c.profiles.last_name || ''}`.trim() : 'Academy Student';
                const date = new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                return `
                    <div class="comment-card">
                        <div class="comment-meta">
                            <span class="comment-user">${esc(name)}</span>
                            <span class="comment-date">${date}</span>
                        </div>
                        <div class="comment-body">${esc(c.content)}</div>
                    </div>
                `;
            }).join('');
        }

        async function setupCommentForm(postId, session) {
            const container = $('#commentFormContainer');
            if (!container) return;

            if (!session) {
                container.innerHTML = `
                    <div class="login-to-comment">
                        <p>Join the discussion! <a href="my-account.html">Log in to your account</a> to post a comment.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="comment-form-wrap">
                    <h4 class="comment-form-title">Post a Comment</h4>
                    <textarea class="comment-textarea" id="commentText" placeholder="What are your thoughts on this?"></textarea>
                    <button class="submit-comment-btn" id="submitComment">
                        <span>Post Comment</span>
                    </button>
                    <div id="commentError" style="color:#ff4d4d; margin-top:1rem; display:none; font-size:0.85rem;"></div>
                </div>
            `;

            const btn = $('#submitComment');
            const text = $('#commentText');
            const err = $('#commentError');

            btn?.addEventListener('click', async () => {
                const content = text.value.trim();
                if (!content) return;

                btn.disabled = true;
                btn.innerHTML = '<span>Posting...</span>';
                err.style.display = 'none';

                try {
                    const profile = await KaizenAuth.getProfile();
                    if (!profile) throw new Error('Could not verify account identity.');

                    const res = await fetch(`${SB_URL}/rest/v1/blog_comments`, {
                        method: 'POST',
                        headers: {
                            'apikey': SB_KEY,
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({
                            post_id: postId,
                            user_id: profile.id,
                            content: content
                            // is_approved is NOT set here — must be managed by admin or DB default
                        })
                    });

                    if (!res.ok) throw new Error('Failed to save comment. Please try again.');

                    text.value = '';
                    await loadComments(postId); // Refresh list
                    if (typeof showToast !== 'undefined') showToast('Comment posted! ✓', 'success');
                } catch (e) {
                    err.textContent = e.message;
                    err.style.display = 'block';
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = '<span>Post Comment</span>';
                }
            });
        }

        async function incrementViews(id, current) {
            try {
                await fetch(`${SB_URL}/rest/v1/blog_posts?id=eq.${id}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SB_KEY,
                        'Authorization': `Bearer ${SB_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ views_count: (current || 0) + 1 })
                });
            } catch (e) { /* silent */ }
        }

        async function loadRelated(category, excludeId) {
            try {
                const posts = await sbFetch('blog_posts', {
                    select: 'id,slug,title,published_at,category',
                    status: 'eq.published',
                    category: `eq.${category}`,
                    id: `neq.${excludeId}`,
                    order: 'published_at.desc',
                    limit: '3'
                });

                const container = $('#relatedPosts');
                if (!container || !Array.isArray(posts) || !posts.length) return;

                container.innerHTML = `<h3>Related Posts</h3>
                    <div class="related-grid">
                        ${posts.map(p => {
                            const date = p.published_at ? new Date(p.published_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
                            return `<a href="blog-post.html?slug=${esc(p.slug)}" class="related-card">
                                <h4>${esc(p.title)}</h4>
                                <p>${date}</p>
                            </a>`;
                        }).join('')}
                    </div>`;
            } catch (e) { /* silent */ }
        }

        loadPost();
    }

    function esc(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

    // ─── EDITOR.JS BLOCK RENDERER ───
    function renderEditorJsBlocks(blocks) {
        if (!Array.isArray(blocks)) return '';
        return blocks.map(block => {
            const d = block.data || {};
            switch (block.type) {
                case 'paragraph':
                    return `<p>${d.text || ''}</p>`;

                case 'header': {
                    const lvl = Math.min(Math.max(d.level || 2, 2), 6);
                    return `<h${lvl} class="post-heading">${d.text || ''}</h${lvl}>`;
                }

                case 'list': {
                    const tag = d.style === 'ordered' ? 'ol' : 'ul';
                    const items = (d.items || []).map(item => {
                        const text = typeof item === 'string' ? item : (item.content || '');
                        return `<li>${text}</li>`;
                    }).join('');
                    return `<${tag} class="post-list">${items}</${tag}>`;
                }

                case 'image': {
                    const url = d.file?.url || d.url || '';
                    if (!url) return '';
                    const size = ['small', 'medium', 'large', 'full'].includes(d.size)
                        ? d.size
                        : (d.stretched ? 'full' : 'large');
                    const cls = ['post-image',
                        `post-image--size-${size}`,
                        d.withBorder ? 'post-image--border' : '',
                        d.withBackground ? 'post-image--bg' : '',
                        d.stretched || size === 'full' ? 'post-image--stretched' : ''
                    ].filter(Boolean).join(' ');
                    const cap = d.caption ? `<figcaption class="post-image-caption">${d.caption}</figcaption>` : '';
                    return `<figure class="${cls}"><img src="${esc(url)}" alt="${esc(d.caption || '')}" loading="lazy">${cap}</figure>`;
                }

                case 'quote':
                    return `<blockquote class="post-quote"><p>${d.text || ''}</p>${d.caption ? `<cite>— ${esc(d.caption)}</cite>` : ''}</blockquote>`;

                case 'delimiter':
                    return `<div class="post-delimiter"><span>✦ ✦ ✦</span></div>`;

                case 'embed': {
                    const src = d.embed || '';
                    if (!src) return '';
                    const cap = d.caption ? `<p class="post-embed-caption">${esc(d.caption)}</p>` : '';
                    return `<div class="post-embed"><iframe src="${esc(src)}" loading="lazy" allowfullscreen allow="autoplay; encrypted-media"></iframe>${cap}</div>`;
                }

                case 'code':
                    return `<pre class="post-code"><code>${esc(d.code || '')}</code></pre>`;

                default:
                    return '';
            }
        }).join('\n');
    }
})();



