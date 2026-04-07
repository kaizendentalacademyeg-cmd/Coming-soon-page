/**
 * Kaizen Dental Academy — Preloader
 * Elegant frosted-glass overlay shown while the page loads.
 */
(function () {
    var css = [
        /* ── Backdrop ── */
        '#kzPre{',
        'position:fixed;inset:0;z-index:99999;',
        'display:flex;align-items:center;justify-content:center;',
        'background:radial-gradient(ellipse at 50% 40%,#1c1409 0%,#0a0804 60%,#060503 100%);',
        'transition:opacity .5s cubic-bezier(.4,0,.2,1),visibility .5s;',
        '}',
        '#kzPre.out{opacity:0;visibility:hidden;pointer-events:none}',

        /* ── Glass card ── */
        '#kzPreCard{',
        'position:relative;',
        'background:linear-gradient(135deg,rgba(255,255,255,0.055) 0%,rgba(255,255,255,0.02) 100%);',
        'backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);',
        'border:1px solid rgba(199,113,17,0.18);',
        'border-radius:28px;',
        'padding:2.75rem 3.5rem 2.5rem;',
        'text-align:center;',
        'box-shadow:0 0 0 1px rgba(255,255,255,0.04) inset,',
        '0 20px 60px rgba(0,0,0,0.6),',
        '0 0 80px rgba(199,113,17,0.06);',
        '}',

        /* ── Glow ring behind card ── */
        '#kzPreCard::before{',
        'content:"";position:absolute;inset:-1px;border-radius:29px;',
        'background:linear-gradient(135deg,rgba(199,113,17,0.25),transparent 50%,rgba(231,175,32,0.12));',
        'mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);',
        '-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);',
        'mask-composite:xor;-webkit-mask-composite:xor;',
        'padding:1px;pointer-events:none}',

        /* ── Logo ── */
        '#kzPreLogo{width:64px;height:64px;object-fit:contain;',
        'animation:kzBreath 2.4s ease-in-out infinite;',
        'filter:drop-shadow(0 0 12px rgba(199,113,17,0.35));',
        'margin-bottom:1.1rem}',

        /* ── Brand name ── */
        '#kzPreName{',
        'font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;',
        'font-size:.65rem;letter-spacing:4px;text-transform:uppercase;font-weight:700;',
        'background:linear-gradient(90deg,#c77111 0%,#e7af20 50%,#c77111 100%);',
        'background-size:200% auto;',
        '-webkit-background-clip:text;-webkit-text-fill-color:transparent;',
        'background-clip:text;',
        'animation:kzShine 3s linear infinite;',
        '}',
        '#kzPreSub{',
        'font-family:Inter,-apple-system,sans-serif;',
        'font-size:.55rem;letter-spacing:2.5px;text-transform:uppercase;',
        'color:rgba(255,255,255,0.25);margin-top:.2rem;font-weight:400',
        '}',

        /* ── Spinner ring ── */
        '#kzPreSpinner{',
        'width:32px;height:32px;margin:1.4rem auto 0;',
        'border-radius:50%;',
        'border:2px solid rgba(199,113,17,0.12);',
        'border-top-color:rgba(199,113,17,0.85);',
        'animation:kzSpin .9s linear infinite',
        '}',

        /* ── Keyframes ── */
        '@keyframes kzBreath{0%,100%{opacity:.75;transform:scale(.96)}50%{opacity:1;transform:scale(1)}}',
        '@keyframes kzShine{0%{background-position:0% center}100%{background-position:200% center}}',
        '@keyframes kzSpin{to{transform:rotate(360deg)}}',
    ].join('');

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var el = document.createElement('div');
    el.id = 'kzPre';
    el.innerHTML =
        '<div id="kzPreCard">' +
        '<img id="kzPreLogo" src="data:image/png;base64,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" alt="Kaizen">' +
        '<div id="kzPreName">Kaizen</div>' +
        '<div id="kzPreSub">Dental Academy</div>' +
        '<div id="kzPreSpinner"></div>' +
        '</div>';

    function inject() {
        if (document.body) document.body.insertBefore(el, document.body.firstChild);
        else requestAnimationFrame(inject);
    }

    function hide() {
        var pre = document.getElementById('kzPre');
        if (!pre) return;
        pre.classList.add('out');
        setTimeout(function () { if (pre.parentNode) pre.parentNode.removeChild(pre); }, 600);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hide);
    } else {
        setTimeout(hide, 100);
    }
    setTimeout(hide, 2500); // safety net

    inject();
})();
