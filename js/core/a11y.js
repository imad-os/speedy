// === Accessibility (Samsung Voice Guide / TTS) ===
// The TV screen reader announces the focused element and ARIA live regions.
// - Decorative SVG icons and images are hidden from it, otherwise it reads
//   sprite ids, image URLs or base64 placeholders ("TTS announce garbage").
// - announce() speaks state changes that do not move focus (play, pause, stop...).

const A11y = (function() {
    let announcer = null;
    let clearTimer = null;

    function _hideDecorative(root) {
        if (!root || root.nodeType !== 1) return;
        const mark = (el) => {
            if (el.tagName === 'svg' || el.tagName === 'SVG') {
                el.setAttribute('aria-hidden', 'true');
                el.setAttribute('focusable', 'false');
            } else if (el.tagName === 'IMG' && !el.hasAttribute('alt')) {
                el.setAttribute('alt', '');
            }
        };
        mark(root);
        root.querySelectorAll('svg, img:not([alt])').forEach(mark);
    }

    function init() {
        announcer = document.getElementById('a11y-announcer');
        _hideDecorative(document.body);

        // Dynamically rendered lists (channels, categories, cards) add icons later.
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver((mutations) => {
                for (let i = 0; i < mutations.length; i++) {
                    const added = mutations[i].addedNodes;
                    for (let j = 0; j < added.length; j++) _hideDecorative(added[j]);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    function announce(text) {
        if (!text) return;
        if (!announcer) announcer = document.getElementById('a11y-announcer');
        if (!announcer) return;
        // Clear first so repeating the same message is announced again.
        announcer.textContent = '';
        if (clearTimer) clearTimeout(clearTimer);
        setTimeout(() => { announcer.textContent = text; }, 50);
        clearTimer = setTimeout(() => { announcer.textContent = ''; }, 3000);
    }

    return { init, announce };
})();
