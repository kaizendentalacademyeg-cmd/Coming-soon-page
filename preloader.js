/**
 * Kaizen Dental Academy — Premium Preloader
 * Dark warm tones + glass effect matching site identity
 */
(function() {
    var s = document.createElement('style');
    s.textContent = [
        '.kz-pre{position:fixed;inset:0;z-index:99999;',
        'background:linear-gradient(135deg,#0f0c08 0%,#1a1410 40%,#0d0b07 100%);',
        'display:flex;align-items:center;justify-content:center;',
        'transition:opacity .4s ease,visibility .4s ease}',
        '.kz-pre.out{opacity:0;visibility:hidden;pointer-events:none}',
        /* Glass card */
        '.kz-pre-card{',
        'background:rgba(255,255,255,0.03);',
        'backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);',
        'border:1px solid rgba(255,255,255,0.06);',
        'border-radius:24px;padding:2.5rem 3rem;text-align:center;',
        'box-shadow:0 8px 32px rgba(0,0,0,0.4)}',
        /* Logo */
        '.kz-pre-card img{width:48px;height:48px;margin-bottom:1rem;',
        'animation:kzFade 1.4s ease-in-out infinite}',
        /* Brand text */
        '.kz-pre-brand{font-family:Inter,-apple-system,sans-serif;',
        'font-size:.7rem;letter-spacing:3px;text-transform:uppercase;',
        'background:linear-gradient(90deg,#c77111,#e7af20);',
        '-webkit-background-clip:text;-webkit-text-fill-color:transparent;',
        'background-clip:text;margin-top:.25rem;font-weight:600}',
        /* Dots */
        '.kz-pre-dots{display:flex;gap:6px;justify-content:center;margin-top:1.25rem}',
        '.kz-pre-dots span{width:5px;height:5px;border-radius:50%;',
        'background:rgba(199,113,17,0.4);animation:kzDot 1.2s ease-in-out infinite}',
        '.kz-pre-dots span:nth-child(2){animation-delay:.2s}',
        '.kz-pre-dots span:nth-child(3){animation-delay:.4s}',
        /* Animations */
        '@keyframes kzFade{0%,100%{opacity:.5;transform:scale(.97)}50%{opacity:1;transform:scale(1)}}',
        '@keyframes kzDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2);background:#c77111}}'
    ].join('');
    document.head.appendChild(s);

    var d = document.createElement('div');
    d.className = 'kz-pre';
    d.id = 'kzPre';
    d.innerHTML = '<div class="kz-pre-card">' +
        '<img src="favicon.png" alt="">' +
        '<div class="kz-pre-brand">Kaizen</div>' +
        '<div class="kz-pre-dots"><span></span><span></span><span></span></div>' +
        '</div>';

    function inject() {
        if (document.body) document.body.insertBefore(d, document.body.firstChild);
        else requestAnimationFrame(inject);
    }

    function hide() {
        var el = document.getElementById('kzPre');
        if (!el) return;
        el.classList.add('out');
        setTimeout(function() { el.remove(); }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hide);
    } else {
        setTimeout(hide, 150);
    }

    // Safety net
    setTimeout(hide, 2500);
    inject();
})();
