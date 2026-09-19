'use strict';

const STYLE_ID = 'playpoint-back-to-top-style';
let backToTopButton = null;
let scrollBound = false;

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
.back-to-top{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:42;width:48px;height:48px;margin:0;padding:0;border:1px solid rgba(118,196,255,.34);border-radius:50%;background:radial-gradient(circle at 38% 28%,#1d6fa8 0%,#123f68 42%,#0b2139 100%);color:#eaf7ff;box-shadow:0 8px 22px rgba(5,27,48,.26),inset 0 1px 0 rgba(255,255,255,.18);display:grid;place-items:center;line-height:1;opacity:0;transform:translateY(10px) scale(.92);pointer-events:none;transition:opacity .16s ease,transform .16s ease,box-shadow .16s ease;overflow:visible}
.back-to-top[data-visible="true"]{opacity:1;transform:none;pointer-events:auto}
.back-to-top:hover{box-shadow:0 10px 25px rgba(5,27,48,.32),0 0 0 3px rgba(88,166,255,.09),inset 0 1px 0 rgba(255,255,255,.2)}
.back-to-top:focus-visible{outline:3px solid var(--input-focus-border-color,#7cc4ff);outline-offset:3px}
.back-to-top__mark{position:relative;display:block;width:18px;height:22px}
.back-to-top__mark::before{content:"";position:absolute;left:8px;top:5px;width:2px;height:15px;border-radius:999px;background:linear-gradient(180deg,#fff,#83d7ff);box-shadow:0 0 8px rgba(131,215,255,.75)}
.back-to-top__mark::after{content:"";position:absolute;left:4px;top:4px;width:9px;height:9px;border-left:2px solid #fff;border-top:2px solid #fff;transform:rotate(45deg);filter:drop-shadow(0 0 4px rgba(131,215,255,.7))}
.back-to-top.is-warping .back-to-top__mark{animation:pp-launch-mark .34s cubic-bezier(.2,.8,.2,1)}
.back-to-top-warp-layer{position:fixed;inset:0;z-index:41;pointer-events:none;overflow:hidden;background:radial-gradient(circle at 50% 4%,rgba(124,210,255,.08),transparent 42%)}
.back-to-top-warp-streak{position:absolute;top:-24vh;width:2px;height:22vh;border-radius:999px;background:linear-gradient(180deg,transparent,rgba(169,226,255,.82),transparent);opacity:0;filter:drop-shadow(0 0 5px rgba(100,194,255,.65));animation:pp-warp-streak .38s cubic-bezier(.16,.72,.22,1) forwards;animation-delay:var(--pp-warp-delay,0ms)}
@keyframes pp-launch-mark{0%{transform:translateY(0);opacity:1}45%{transform:translateY(-12px) scaleY(1.25);opacity:1}100%{transform:translateY(-28px) scaleY(.72);opacity:0}}
@keyframes pp-warp-streak{0%{opacity:0;transform:translateY(-10vh) scaleY(.25)}20%{opacity:.72}100%{opacity:0;transform:translateY(145vh) scaleY(3.1)}}
@media(prefers-reduced-motion:reduce){.back-to-top{transition:none}.back-to-top.is-warping .back-to-top__mark,.back-to-top-warp-streak{animation:none}}
`;
    document.head.appendChild(style);
}

function removeWarpLayer(layer) {
    if (layer?.parentNode) layer.parentNode.removeChild(layer);
}

function createWarpLayer() {
    const layer = document.createElement('div');
    layer.className = 'back-to-top-warp-layer';
    const positions = [9, 18, 31, 44, 59, 72, 85, 94];
    positions.forEach((left, index) => {
        const streak = document.createElement('span');
        streak.className = 'back-to-top-warp-streak';
        streak.style.left = left + '%';
        streak.style.setProperty('--pp-warp-delay', ((index % 4) * 18) + 'ms');
        streak.style.height = (15 + (index % 3) * 5) + 'vh';
        layer.appendChild(streak);
    });
    document.body.appendChild(layer);
    return layer;
}

function warpToTop(button, reducedMotion) {
    const startY = window.scrollY || window.pageYOffset || 0;
    if (startY <= 0) return;
    if (reducedMotion || typeof window.requestAnimationFrame !== 'function') {
        window.scrollTo(0, 0);
        return;
    }

    const layer = createWarpLayer();
    button.classList.add('is-warping');
    const duration = Math.min(390, Math.max(285, 285 + Math.log10(Math.max(10, startY)) * 26));
    const startAt = performance.now();

    const frame = (now) => {
        const progress = Math.min(1, (now - startAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 4);
        window.scrollTo(0, Math.round(startY * (1 - eased)));
        if (progress < 1) {
            window.requestAnimationFrame(frame);
            return;
        }
        window.scrollTo(0, 0);
        window.setTimeout(() => {
            button.classList.remove('is-warping');
            removeWarpLayer(layer);
        }, 80);
    };
    window.requestAnimationFrame(frame);
}

export function ensureBackToTop(label) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return;
    ensureStyles();

    if (!backToTopButton) {
        backToTopButton = document.createElement('button');
        backToTopButton.type = 'button';
        backToTopButton.id = 'back-to-top';
        backToTopButton.className = 'back-to-top';
        backToTopButton.innerHTML = '<span class="back-to-top__mark" aria-hidden="true"></span>';
        backToTopButton.dataset.visible = 'false';
        document.body.appendChild(backToTopButton);

        const reduced = typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        backToTopButton.addEventListener('click', () => {
            warpToTop(backToTopButton, reduced);
        });
    }

    backToTopButton.setAttribute('aria-label', label);
    backToTopButton.title = label;

    const updateVisibility = () => {
        const threshold = Math.max(520, window.innerHeight * 0.85);
        backToTopButton.dataset.visible = window.scrollY > threshold ? 'true' : 'false';
    };
    if (!scrollBound) {
        scrollBound = true;
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                ticking = false;
                updateVisibility();
            });
        }, { passive: true });
    }
    updateVisibility();
}
