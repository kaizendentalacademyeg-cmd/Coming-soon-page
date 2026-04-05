/**
 * Kaizen Dental Academy — Preloader
 * Lightweight branded splash that hides immediately when DOM is interactive.
 */
(function() {
    var s = document.createElement('style');
    s.textContent = '.kz-pre{position:fixed;inset:0;z-index:99999;background:#0a0a0f;display:flex;align-items:center;justify-content:center;transition:opacity .35s ease,visibility .35s ease}.kz-pre.out{opacity:0;visibility:hidden}.kz-pre-inner{text-align:center}.kz-pre img{width:56px;height:56px;animation:kzP 1.2s ease-in-out infinite}@keyframes kzP{0%,100%{opacity:.5;transform:scale(.95)}50%{opacity:1;transform:scale(1.02)}}';
    document.head.appendChild(s);

    var d = document.createElement('div');
    d.className = 'kz-pre';
    d.id = 'kzPre';
    d.innerHTML = '<div class="kz-pre-inner"><img src="favicon.png" alt=""></div>';

    function inject() {
        if (document.body) {
            document.body.insertBefore(d, document.body.firstChild);
        } else {
            requestAnimationFrame(inject);
        }
    }

    function hide() {
        var el = document.getElementById('kzPre');
        if (el) {
            el.classList.add('out');
            setTimeout(function() { el.remove(); }, 400);
        }
    }

    // Dismiss as soon as DOM content is loaded (fast!)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hide);
    } else {
        // Already loaded, hide after a brief flash
        setTimeout(hide, 200);
    }

    // Safety: max 2 seconds
    setTimeout(hide, 2000);

    inject();
})();
