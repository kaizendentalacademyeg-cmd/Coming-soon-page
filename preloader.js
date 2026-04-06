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
        '<img id="kzPreLogo" src="logo.png" alt="Kaizen">' +
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
