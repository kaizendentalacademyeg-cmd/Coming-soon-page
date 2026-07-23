/* ==========================================================================
   The Restorative Scientific Day — Certificate search
   Forgiving (fuzzy) search so slightly-misspelled names still match.
   ========================================================================== */
(function () {
    'use strict';

    // ---- Auto-expiry -------------------------------------------------------
    // Page + files are meant to be temporary. After this date the search is
    // disabled and a polite message is shown. (Also remember to delete the
    // /certificates folder + these files from the repo to reclaim space.)
    var EXPIRES_ON = new Date('2026-08-23T23:59:59+02:00'); // one month after publish

    var DATA = (window.CERT_DATA || []).slice();

    // ---- Text normalisation ------------------------------------------------
    function normalize(s) {
        return (s || '')
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
            .replace(/\bdr\.?\b/g, ' ')                        // drop the "Dr." prefix
            .replace(/[^a-z0-9؀-ۿ]+/g, ' ')          // keep latin+arabic+digits
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Precompute normalized forms + tokens for each entry.
    DATA.forEach(function (d) {
        d._norm = normalize(d.name);
        d._tokens = d._norm.split(' ').filter(Boolean);
    });

    // ---- Levenshtein distance ---------------------------------------------
    function lev(a, b) {
        if (a === b) return 0;
        var m = a.length, n = b.length;
        if (!m) return n; if (!n) return m;
        var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
        for (j = 0; j <= n; j++) prev[j] = j;
        for (i = 1; i <= m; i++) {
            cur[0] = i;
            for (j = 1; j <= n; j++) {
                var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
                cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
            }
            var tmp = prev; prev = cur; cur = tmp;
        }
        return prev[n];
    }
    function sim(a, b) { // 0..1 similarity
        if (!a && !b) return 1;
        var d = lev(a, b), L = Math.max(a.length, b.length);
        return L ? 1 - d / L : 0;
    }

    // ---- Scoring -----------------------------------------------------------
    // Higher = better. Blends whole-string similarity, substring hits and a
    // greedy token-to-token match so partial / reordered / typo'd names rank.
    function score(qNorm, qTokens, d) {
        if (!qNorm) return 0;
        var s = 0;

        if (d._norm === qNorm) return 1000;                 // exact
        if (d._norm.indexOf(qNorm) !== -1) s += 200;        // full query is a substring
        s += sim(qNorm, d._norm) * 60;                      // overall closeness

        // token matching: each query token finds its best name token
        var tokenScore = 0, matched = 0;
        qTokens.forEach(function (qt) {
            var best = 0;
            d._tokens.forEach(function (nt) {
                var v = 0;
                if (nt === qt) v = 1;
                else if (nt.indexOf(qt) === 0) v = 0.9;      // prefix
                else if (nt.indexOf(qt) !== -1) v = 0.7;     // contains
                else v = sim(qt, nt) * 0.85;                 // fuzzy
                if (v > best) best = v;
            });
            if (best >= 0.55) matched++;
            tokenScore += best;
        });
        if (qTokens.length) {
            s += (tokenScore / qTokens.length) * 90;
            s += (matched / qTokens.length) * 60;            // reward covering all typed words
        }
        return s;
    }

    function initials(name) {
        var parts = normalize(name).split(' ').filter(Boolean);
        if (!parts.length) return '?';
        var a = parts[0][0] || '';
        var b = parts.length > 1 ? parts[parts.length - 1][0] : '';
        return (a + b).toUpperCase();
    }

    function highlight(name, qTokens) {
        if (!qTokens.length) return escapeHtml(name);
        var safe = escapeHtml(name);
        qTokens.forEach(function (qt) {
            if (qt.length < 2) return;
            try {
                var re = new RegExp('(' + qt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
                safe = safe.replace(re, '<mark>$1</mark>');
            } catch (e) {}
        });
        return safe;
    }
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // ---- DOM ---------------------------------------------------------------
    var input = document.getElementById('q');
    var wrapEl = document.getElementById('searchWrap');
    var results = document.getElementById('results');
    var hint = document.getElementById('hint');
    var clearBtn = document.getElementById('clear');
    var countEl = document.getElementById('count');

    if (countEl) countEl.textContent = DATA.length;

    var DL_SVG = '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>';

    function cardHtml(d, qTokens) {
        return '' +
            '<div class="card">' +
                '<div class="avatar">' + initials(d.name) + '</div>' +
                '<div class="who">' +
                    '<div class="name">' + highlight(d.name, qTokens) + '</div>' +
                    '<div class="role">Certificate of Attendance</div>' +
                '</div>' +
                '<a class="dl" href="' + encodeURI(d.file) + '" target="_blank" rel="noopener" ' +
                   'download aria-label="Download certificate for ' + escapeHtml(d.name) + '">' +
                    DL_SVG + 'Download' +
                '</a>' +
            '</div>';
    }

    function stateHtml(cls, em, title, body, extra) {
        return '<div class="state ' + (cls || '') + '">' +
            '<div class="em">' + em + '</div>' +
            '<h3>' + title + '</h3>' +
            '<p>' + body + '</p>' + (extra || '') + '</div>';
    }

    var WA = 'https://wa.me/201044490400?text=' + encodeURIComponent(
        'Hello, I could not find my certificate for The Restorative Scientific Day. My name is: ');

    function render() {
        var raw = input.value;
        wrapEl.classList.toggle('has-text', raw.trim().length > 0);
        var qNorm = normalize(raw);
        var qTokens = qNorm.split(' ').filter(Boolean);

        if (!qNorm) {
            results.innerHTML = '';
            hint.textContent = 'Type your name as it appears on the certificate';
            return;
        }

        var ranked = DATA
            .map(function (d) { return { d: d, sc: score(qNorm, qTokens, d) }; })
            .filter(function (x) { return x.sc >= 45; })
            .sort(function (a, b) { return b.sc - a.sc; });

        // Keep only results close to the best one, so a strong match isn't
        // buried under loose suggestions — but always keep near-ties.
        if (ranked.length) {
            var top = ranked[0].sc;
            var cutoff = Math.max(45, top * 0.62);
            ranked = ranked.filter(function (x) { return x.sc >= cutoff; }).slice(0, 6);
        }

        if (!ranked.length) {
            hint.textContent = '';
            results.innerHTML = stateHtml('', '🔎',
                'No match found',
                'Try a different spelling (your first name alone often works). Certificates are listed in English.',
                '<a class="wa" href="' + WA + '" target="_blank" rel="noopener">Contact us on WhatsApp</a>');
            return;
        }

        hint.textContent = ranked.length === 1
            ? 'Found your certificate'
            : 'Found ' + ranked.length + ' close matches — pick your name';
        results.innerHTML = ranked.map(function (x) { return cardHtml(x.d, qTokens); }).join('');
    }

    // ---- Expiry guard ------------------------------------------------------
    function expired() {
        if (input) { input.disabled = true; input.placeholder = ''; }
        if (hint) hint.textContent = '';
        results.innerHTML = stateHtml('', '📁',
            'Certificates are no longer available',
            'These certificates were available for a limited time and have now closed. If you still need yours, reach out to us.',
            '<a class="wa" href="' + WA + '" target="_blank" rel="noopener">Contact us on WhatsApp</a>');
    }

    // ---- Wire up -----------------------------------------------------------
    if (new Date() > EXPIRES_ON || !DATA.length) {
        expired();
    } else {
        var t;
        input.addEventListener('input', function () {
            clearTimeout(t); t = setTimeout(render, 90);
        });
        clearBtn.addEventListener('click', function () {
            input.value = ''; input.focus(); render();
        });
        render();
        input.focus();
    }
})();
