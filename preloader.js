/**
 * Kaizen Dental Academy — Premium Preloader
 * Auto-injects a branded loading screen that fades out when the page is ready.
 * Include this script in <head> with no defer/async for best results.
 */
(function() {
    'use strict';

    // Inject preloader CSS + HTML immediately (before DOM ready)
    var css = document.createElement('style');
    css.textContent = `
        .kaizen-preloader {
            position: fixed; inset: 0; z-index: 99999;
            background: #0a0a0f;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            transition: opacity 0.5s ease, visibility 0.5s ease;
        }
        .kaizen-preloader.fade-out {
            opacity: 0; visibility: hidden;
        }
        .kaizen-preloader-logo {
            width: 80px; height: 80px;
            animation: kzPreloaderPulse 1.8s ease-in-out infinite;
        }
        .kaizen-preloader-bar-wrap {
            width: 160px; height: 3px;
            background: rgba(255,255,255,0.06);
            border-radius: 3px;
            margin-top: 2rem;
            overflow: hidden;
        }
        .kaizen-preloader-bar {
            width: 0%; height: 100%;
            background: linear-gradient(90deg, #c77111, #e7af20);
            border-radius: 3px;
            transition: width 0.3s ease;
        }
        .kaizen-preloader-text {
            margin-top: 1rem;
            font-family: 'Inter', -apple-system, sans-serif;
            font-size: 0.7rem;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: rgba(255,255,255,0.2);
        }
        @keyframes kzPreloaderPulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
        }
    `;
    document.head.appendChild(css);

    // Create preloader element
    var el = document.createElement('div');
    el.className = 'kaizen-preloader';
    el.id = 'kaizenPreloader';
    el.innerHTML =
        '<img class="kaizen-preloader-logo" src="favicon.png" alt="Kaizen">' +
        '<div class="kaizen-preloader-bar-wrap"><div class="kaizen-preloader-bar" id="kzPreloaderBar"></div></div>' +
        '<div class="kaizen-preloader-text">Loading</div>';

    // Insert as first child of body (or wait for body)
    function inject() {
        if (document.body) {
            document.body.insertBefore(el, document.body.firstChild);
            animateBar();
        } else {
            requestAnimationFrame(inject);
        }
    }

    // Animate progress bar
    var progress = 0;
    function animateBar() {
        var bar = document.getElementById('kzPreloaderBar');
        if (!bar) return;
        var interval = setInterval(function() {
            if (progress < 70) {
                progress += Math.random() * 8 + 2;
            } else if (progress < 90) {
                progress += Math.random() * 2;
            }
            progress = Math.min(progress, 92);
            bar.style.width = progress + '%';
        }, 150);

        // Store interval for cleanup
        window._kzPreloaderInterval = interval;
    }

    // Fade out when page is fully loaded
    function dismiss() {
        clearInterval(window._kzPreloaderInterval);
        var bar = document.getElementById('kzPreloaderBar');
        if (bar) bar.style.width = '100%';

        setTimeout(function() {
            var pre = document.getElementById('kaizenPreloader');
            if (pre) {
                pre.classList.add('fade-out');
                setTimeout(function() { pre.remove(); }, 600);
            }
        }, 300);
    }

    // Fire on window load (all assets ready)
    window.addEventListener('load', dismiss);

    // Safety net: dismiss after 4 seconds max
    setTimeout(dismiss, 4000);

    inject();
})();
