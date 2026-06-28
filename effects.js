/* =============================================================
   effects.js  —  Dynamic Background + Smooth Custom Cursor
   ============================================================= */

/* ─────────────────────────────────────────────
   1.  DYNAMIC PARTICLE / CONSTELLATION BACKGROUND
   ───────────────────────────────────────────── */
(function () {
    /* Create canvas and place it behind everything */
    const canvas = document.createElement('canvas');
    canvas.id = 'bgCanvas';
    Object.assign(canvas.style, {
        position : 'fixed',
        top      : '0',
        left     : '0',
        width    : '100%',
        height   : '100%',
        zIndex   : '-1',
        pointerEvents : 'none',
        display  : 'block',
    });
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');

    /* ── Config ── */
    const CFG = {
        particleCount   : 110,
        connectionDist  : 140,
        mouseRadius     : 160,
        baseSpeed       : 0.35,
        particleRadius  : 2,
        colorBase       : '161,121,216',   /* purple to match #a179d8 */
        colorAccent     : '10,102,194',    /* blue to match #0A66C2   */
        bgColor         : '#0F0F0F',
    };

    let W, H, mouse = { x: -9999, y: -9999 };

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    /* Track mouse position */
    window.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    /* On mobile / touch reset */
    window.addEventListener('touchmove', e => {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }, { passive: true });

    /* ── Particle class ── */
    class Particle {
        constructor() { this.reset(true); }

        reset(init = false) {
            this.x  = Math.random() * (W || window.innerWidth);
            this.y  = init
                ? Math.random() * (H || window.innerHeight)
                : -10;
            const angle = Math.random() * Math.PI * 2;
            const speed = CFG.baseSpeed * (0.5 + Math.random());
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.r  = CFG.particleRadius * (0.5 + Math.random() * 0.8);
            /* alternate color families */
            this.color = Math.random() > 0.5 ? CFG.colorBase : CFG.colorAccent;
            this.alpha = 0.4 + Math.random() * 0.5;
            this.pulse = Math.random() * Math.PI * 2;   /* phase for pulsing */
        }

        update(dt) {
            /* gentle pulse */
            this.pulse += 0.02;
            const scale = 1 + 0.25 * Math.sin(this.pulse);

            /* mouse repulsion */
            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CFG.mouseRadius && dist > 0) {
                const force = (CFG.mouseRadius - dist) / CFG.mouseRadius;
                this.vx += (dx / dist) * force * 0.8;
                this.vy += (dy / dist) * force * 0.8;
            }

            /* drag to keep speed stable */
            this.vx *= 0.99;
            this.vy *= 0.99;

            /* clamp speed */
            const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            const max = CFG.baseSpeed * 3;
            if (spd > max) {
                this.vx = (this.vx / spd) * max;
                this.vy = (this.vy / spd) * max;
            }

            this.x += this.vx;
            this.y += this.vy;

            /* wrap around edges */
            if (this.x < -20) this.x = W + 20;
            if (this.x > W + 20) this.x = -20;
            if (this.y < -20) this.y = H + 20;
            if (this.y > H + 20) this.y = -20;

            this.displayR = this.r * scale;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.displayR || this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color},${this.alpha})`;
            ctx.fill();
        }
    }

    /* ── Init particles ── */
    const particles = Array.from({ length: CFG.particleCount }, () => new Particle());

    /* ── Draw connections ── */
    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const a = particles[i], b = particles[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CFG.connectionDist) {
                    const opacity = (1 - dist / CFG.connectionDist) * 0.35;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(${a.color},${opacity})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }
    }

    /* ── Draw mouse glow ── */
    function drawMouseGlow() {
        if (mouse.x < 0) return;
        const r = CFG.mouseRadius * 1.2;
        const grd = ctx.createRadialGradient(
            mouse.x, mouse.y, 0,
            mouse.x, mouse.y, r
        );
        grd.addColorStop(0,   `rgba(${CFG.colorBase},0.22)`);
        grd.addColorStop(0.4, `rgba(${CFG.colorBase},0.10)`);
        grd.addColorStop(1,   `rgba(${CFG.colorBase},0)`);
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, r, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        /* Inner bright core */
        const core = ctx.createRadialGradient(
            mouse.x, mouse.y, 0,
            mouse.x, mouse.y, 28
        );
        core.addColorStop(0, `rgba(${CFG.colorBase},0.35)`);
        core.addColorStop(1, `rgba(${CFG.colorBase},0)`);
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 28, 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.fill();
    }

    /* ── Animation loop ── */
    let last = 0;
    function loop(ts) {
        const dt = ts - last;
        last = ts;

        ctx.clearRect(0, 0, W, H);

        drawMouseGlow();
        drawConnections();
        particles.forEach(p => { p.update(dt); p.draw(); });

        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
})();


/* =============================================================
   2.  SMOOTH CUSTOM CURSOR  (always visible, never disappears)
   ============================================================= */
(function () {
    /* Hide the native cursor site-wide */
    const style = document.createElement('style');
    style.textContent = `
        * { cursor: none !important; }

        #customCursorOuter {
            position: fixed;
            width: 36px;
            height: 36px;
            border: 2px solid rgba(161,121,216,0.7);
            border-radius: 50%;
            pointer-events: none;
            z-index: 999999;
            transform: translate(-50%, -50%);
            transition: width .2s, height .2s, border-color .2s, background .2s;
            will-change: transform;
        }
        #customCursorDot {
            position: fixed;
            width: 7px;
            height: 7px;
            background: #a179d8;
            border-radius: 50%;
            pointer-events: none;
            z-index: 999999;
            transform: translate(-50%, -50%);
            will-change: transform;
        }

        /* Hover state — triggered via JS class */
        #customCursorOuter.is-hovering {
            width: 52px;
            height: 52px;
            border-color: rgba(10,102,194,0.8);
            background: rgba(10,102,194,0.08);
        }
        #customCursorOuter.is-clicking {
            width: 24px;
            height: 24px;
            background: rgba(161,121,216,0.2);
        }
    `;
    document.head.appendChild(style);

    /* Create cursor elements */
    const outer = document.createElement('div');
    outer.id = 'customCursorOuter';
    const dot = document.createElement('div');
    dot.id = 'customCursorDot';
    document.body.appendChild(outer);
    document.body.appendChild(dot);

    /* Positions */
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;   /* real mouse */
    let ox = mx, oy = my;                                           /* outer (lagged) */

    /* Track real mouse */
    window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

    /* Dot follows instantly; outer lags smoothly */
    const LERP = 0.14;   /* lower = more lag, higher = tighter */

    function animCursor() {
        /* Dot — snap to mouse */
        dot.style.left = mx + 'px';
        dot.style.top  = my + 'px';

        /* Outer — smooth lerp */
        ox += (mx - ox) * LERP;
        oy += (my - oy) * LERP;
        outer.style.left = ox + 'px';
        outer.style.top  = oy + 'px';

        requestAnimationFrame(animCursor);
    }
    animCursor();

    /* Hover effect on interactive elements */
    const hoverTargets = 'a, button, [role="button"], input, textarea, select, label, .navbar ul li, .connect button, .project-type button, .certificate-type';
    document.addEventListener('mouseover', e => {
        if (e.target.closest(hoverTargets)) outer.classList.add('is-hovering');
    });
    document.addEventListener('mouseout', e => {
        if (e.target.closest(hoverTargets)) outer.classList.remove('is-hovering');
    });

    /* Click ripple */
    document.addEventListener('mousedown', () => outer.classList.add('is-clicking'));
    document.addEventListener('mouseup',   () => outer.classList.remove('is-clicking'));

    /* On mobile — hide cursor elements (touch devices don't have cursors) */
    if ('ontouchstart' in window) {
        outer.style.display = 'none';
        dot.style.display   = 'none';
        /* Restore native cursor on touch */
        style.textContent = '';
    }
})();


/* =============================================================
   3.  TYPEWRITER EFFECT  — Home section h1, bio1, bio2
   ============================================================= */
(function () {
    /* Blinking cursor style */
    const twStyle = document.createElement('style');
    twStyle.textContent = `
        #home .bio2 {
            font-size: 2rem;
            font-weight: 900;
            color: #c9a8ff;
            letter-spacing: 2px;
            min-height: 2.5rem;
            text-shadow: 0 0 12px rgba(161,121,216,0.8), 0 0 30px rgba(161,121,216,0.4);
        }
        .tw-cursor {
            display: inline-block;
            width: 2px;
            background: #a179d8;
            margin-left: 2px;
            animation: twBlink 0.7s step-end infinite;
            vertical-align: baseline;
        }
        @keyframes twBlink {
            0%, 100% { opacity: 1; }
            50%       { opacity: 0; }
        }
    `;
    document.head.appendChild(twStyle);

    function typeElement(el, text, speed, done) {
        el.textContent = '';
        const cursor = document.createElement('span');
        cursor.className = 'tw-cursor';
        cursor.style.height = window.getComputedStyle(el).fontSize;
        el.appendChild(cursor);

        let i = 0;
        function tick() {
            if (i < text.length) {
                el.insertBefore(document.createTextNode(text[i]), cursor);
                i++;
                setTimeout(tick, speed + Math.random() * 30);
            } else {
                cursor.remove();
                if (done) done();
            }
        }
        tick();
    }

    function startTypewriter() {
        const h1   = document.querySelector('#home h1');
        const bio1 = document.querySelector('#home .bio1');
        const bio2 = document.querySelector('#home .bio2');
        if (!h1 || !bio1 || !bio2) return;

        const h1Text   = h1.textContent.trim();
        const bio1Text = bio1.textContent.trim();
        const roles = [
            'Competitive Programmer',
            'Problem Solver',
            'Aspiring Software Engineer',
        ];

        h1.textContent   = '';
        bio1.textContent = '';
        bio2.textContent = '';

        /* Step 1: type h1 */
        typeElement(h1, h1Text, 60, function () {
            /* Step 2: type bio1 */
            setTimeout(function () {
                typeElement(bio1, bio1Text, 22, function () {
                    /* Step 3: cycling roles in bio2 */
                    let roleIdx = 0;
                    const permCursor = document.createElement('span');
                    permCursor.className = 'tw-cursor';
                    permCursor.style.height = window.getComputedStyle(bio2).fontSize;
                    bio2.appendChild(permCursor);

                    function typeRole() {
                        const role = roles[roleIdx % roles.length];
                        let i = 0;

                        function typeChar() {
                            if (i < role.length) {
                                bio2.insertBefore(document.createTextNode(role[i]), permCursor);
                                i++;
                                setTimeout(typeChar, 55 + Math.random() * 25);
                            } else {
                                setTimeout(eraseChar, 1800);
                            }
                        }

                        function eraseChar() {
                            const nodes = Array.from(bio2.childNodes).filter(n => n.nodeType === 3);
                            if (nodes.length > 0) {
                                const last = nodes[nodes.length - 1];
                                last.textContent = last.textContent.slice(0, -1);
                                if (last.textContent === '') last.remove();
                                setTimeout(eraseChar, 30);
                            } else {
                                roleIdx++;
                                setTimeout(typeRole, 400);
                            }
                        }

                        typeChar();
                    }

                    typeRole();
                });
            }, 300);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startTypewriter);
    } else {
        startTypewriter();
    }
})();


/* =============================================================
   4.  SCROLL REVEAL ANIMATION  (headlines + cards, staggered)
   ============================================================= */
(function () {
    const revealStyle = document.createElement('style');
    revealStyle.textContent = `
        /* ── Headline: slide in from left with glow ── */
        .sr-headline {
            opacity: 0;
            transform: translateX(-40px);
            transition: opacity 0.7s ease, transform 0.7s ease;
            position: relative;
        }
        .sr-headline::after {
            content: '';
            position: absolute;
            left: 50%; bottom: -8px;
            transform: translateX(-50%);
            width: 0; height: 3px;
            background: linear-gradient(90deg, #a179d8, #0A66C2);
            border-radius: 2px;
            transition: width 0.8s ease 0.5s;
        }
        .sr-headline.sr-visible {
            opacity: 1 !important;
            transform: translateX(0) !important;
        }
        .sr-headline.sr-visible::after {
            width: 60px;
        }

        /* ── Cards: fade up ── */
        .sr-card {
            opacity: 0;
            transform: translateY(45px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .sr-card.sr-visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(revealStyle);

    /* Headlines */
    const HEADLINES = [
        '#about .headline',
        '#education .headline',
        '#skill .headline',
        '#project > h1',
        '#certificate > h1',
        '#contact > h1',
    ];

    /* Cards — each group staggered individually */
    const CARD_GROUPS = [
        '#about .description',
        '#education .degree-type',
        '#skill .skill-type',
        '#project .project-type',
        '#certificate .certificate-type',
        '#contact .contact-connection',
        '#contact .contact-message',
    ];

    function initReveal() {
        /* Mark headlines */
        HEADLINES.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                el.classList.add('sr-headline');
            });
        });

        /* Mark cards with stagger delay based on position among siblings */
        CARD_GROUPS.forEach(sel => {
            /* Group cards by their parent so stagger resets per row */
            const cards = document.querySelectorAll(sel);
            const parents = new Map();
            cards.forEach(card => {
                const p = card.parentElement;
                if (!parents.has(p)) parents.set(p, []);
                parents.get(p).push(card);
            });
            parents.forEach(group => {
                group.forEach((card, i) => {
                    card.classList.add('sr-card');
                    card.style.transitionDelay = (i * 0.12) + 's';
                });
            });
        });

        /* Single observer for everything */
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('sr-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.sr-headline, .sr-card').forEach(el => observer.observe(el));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initReveal);
    } else {
        initReveal();
    }
})();
