// Remove Arabic translations from course page
document.addEventListener('DOMContentLoaded', () => {
    if (document.documentElement.getAttribute('data-no-arabic') === 'true') {
        // Remove all data-ar attributes and keep only English text
        document.querySelectorAll('[data-en]').forEach(el => {
            const enText = el.getAttribute('data-en');
            if (enText) {
                el.textContent = enText;
                el.removeAttribute('data-en');
                el.removeAttribute('data-ar');
            }
        });
    }
});

