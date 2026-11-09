/*
 * Cursor effects — the ones a theme can name with --neo-fx-cursor, drawn the way neo-web draws
 * them (neo-web: src/design-system/theme/cursorFx.ts; keep the two alike). The builder shows them
 * over its preview. A new effect: add it to EFFECTS and give it a start function in START.
 *
 * Sandevistan draws nothing per frame: each after-image is a small layer holding a glowing arrow drawn
 * once, a move places one by transform, and the browser fades it on the compositor. Comet draws its
 * glitter bit by bit on a canvas each frame, but never a blur: what glows is drawn once into an image.
 */
(function (root) {
    'use strict';

    var EFFECTS = [
        { id: 'none', label: 'Off', note: 'The pointer as it is.' },
        { id: 'sandevistan', label: 'Sandevistan', note: 'Neon after-images trail the pointer.' },
        { id: 'comet', label: 'Comet', note: 'Glowing gold comets fall where the pointer moves, shedding twinkling glitter.' },
    ];

    // ---- sandevistan -----------------------------------------------------------------------

    var LIFE_MS = 500;
    var STEP_PX = 12;
    var HUES = [185, 265, 315, 45];
    var POOL = HUES.length * 8;
    var SPRITE_PX = 40;
    var TIP_X = 12;
    var TIP_Y = 10;
    var FADE = [0, 0.25, 0.5, 0.75, 1].map(function (t) { return { offset: t, opacity: Math.pow(1 - t, 1.4) * 0.85 }; });

    function arrow(ctx, x, y) {
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x, y + 17); ctx.lineTo(x + 4.2, y + 13.2); ctx.lineTo(x + 7.2, y + 19.6);
        ctx.lineTo(x + 9.6, y + 18.5); ctx.lineTo(x + 6.7, y + 12.2); ctx.lineTo(x + 12.2, y + 12.2); ctx.closePath();
    }
    function hueAt(step) {
        var seg = Math.floor(step / 8), a = HUES[seg], b = HUES[(seg + 1) % HUES.length];
        var turn = ((b - a + 540) % 360) - 180;
        return (a + (turn * (step % 8)) / 8 + 360) % 360;
    }
    function sprite(hue, light) {
        var ratio = root.devicePixelRatio || 1;
        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = Math.round(SPRITE_PX * ratio);
        var ctx = canvas.getContext('2d');
        if (!ctx) return '';
        ctx.scale(ratio, ratio);
        ctx.shadowColor = 'hsl(' + hue + ', 100%, 60%)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'hsl(' + hue + ', 100%, ' + (light ? 45 : 62) + '%)';
        arrow(ctx, TIP_X, TIP_Y);
        ctx.fill();
        return canvas.toDataURL();
    }

    function sandevistan(host, light) {
        var layer = document.createElement('div');
        layer.className = 'pv-fx';
        layer.setAttribute('aria-hidden', 'true');
        var ghosts = [], fades = [];
        for (var i = 0; i < POOL; i++) {
            var g = document.createElement('i');
            var image = sprite(hueAt(i), light);
            g.style.cssText = 'position:absolute;left:0;top:0;width:' + SPRITE_PX + 'px;height:' + SPRITE_PX + 'px;background-size:100% 100%;opacity:0;will-change:transform,opacity;' + (image ? 'background-image:url(' + image + ');' : '');
            layer.appendChild(g);
            ghosts.push(g);
        }
        host.appendChild(layer);
        var next = 0, last = 0, prev = null;

        function place(x, y, ageMs) {
            var k = next;
            next = (next + 1) % POOL;
            if (fades[k]) fades[k].cancel();
            ghosts[k].style.transform = 'translate(' + (x - TIP_X) + 'px, ' + (y - TIP_Y) + 'px)';
            if (typeof ghosts[k].animate === 'function') fades[k] = ghosts[k].animate(FADE, { duration: LIFE_MS, delay: -ageMs });
        }
        function onMove(e) {
            var now = performance.now();
            var box = host.getBoundingClientRect();
            var to = { x: e.clientX - box.left, y: e.clientY - box.top };
            var fresh = prev !== null && now - last < 120;
            var from = fresh ? prev : to;
            var dist = Math.hypot(to.x - from.x, to.y - from.y);
            if (fresh && dist < STEP_PX) return;
            var n = Math.max(1, Math.min(8, Math.floor(dist / STEP_PX)));
            for (var s = 1; s <= n; s++) place(from.x + ((to.x - from.x) * s) / n, from.y + ((to.y - from.y) * s) / n, (n - s) * 6);
            prev = to;
            last = now;
        }
        host.addEventListener('pointermove', onMove, { passive: true });
        return function stop() {
            host.removeEventListener('pointermove', onMove);
            fades.forEach(function (f) { if (f) f.cancel(); });
            layer.remove();
        };
    }

    // ---- comet -----------------------------------------------------------------------------
    // Glowing gold points fall down and to the left from where the pointer moves. Each sheds glitter as
    // it falls — a hundred-odd bits a second, one in five a four-pointed sparkle — and every bit goes its
    // own way: drifting back along the fall, spreading, sinking, twinkling out. The bits are drawn one
    // by one on a canvas each frame while any are left; what glows (a head, a sparkle's halo) is drawn
    // once into an image at start, and a frame only stamps those and fills small dots (no blur per frame).

    var COMET_SPAWN_PX = 34;
    var COMET_SPAWN_MS = 70;
    var COMET_ANGLE = 118;
    var COMET_JITTER = 12;
    var COMET_SPEED = [180, 220];
    var COMET_LIFE = [0.8, 1.0];
    var COMET_SHED = 0.85;
    var COMET_SHED_PER_S = 110;
    var COMET_SPARKLE_SHARE = 0.22;
    var COMET_MAX_BITS = 2400;
    var DUST = { jitter: 2.5, back: 22, spreadX: [-16, 16], spreadY: [-12, 16], sink: 52, r: [0.7, 1.7], life: [0.45, 1.0] };
    var SPARKLE = { jitter: 3, back: 18, spreadX: [-14, 14], spreadY: [-10, 14], sink: 46, r: [2, 4.2], life: [0.5, 0.9] };
    var HEAD_PX = 36;
    var SPARKLE_R = 4.2;
    var SPARKLE_PX = 32;
    var COMET_COLORS = {
        dark: {
            glow: ['rgba(255, 245, 200, 0.9)', 'rgba(255, 210, 80, 0.45)', 'rgba(255, 190, 40, 0)'],
            core: ['#ffffff', 'rgba(255, 255, 230, 0.6)'],
            dust: ['#ffffff', '#fff6c4', '#ffe066', '#ffcb3d'],
            sparkle: '#fffbe6',
            halo: 'rgba(255, 210, 70, 1)',
        },
        light: {
            glow: ['rgba(255, 190, 40, 0.85)', 'rgba(240, 150, 0, 0.4)', 'rgba(240, 150, 0, 0)'],
            core: ['#e08a00', 'rgba(255, 190, 40, 0.7)'],
            dust: ['#e89f00', '#d98200', '#f5b400', '#c26f00'],
            sparkle: '#f0a000',
            halo: 'rgba(255, 190, 40, 0.8)',
        },
    };

    function between(range) { return range[0] + Math.random() * (range[1] - range[0]); }
    /** Where a comet's head is now: falling along its direction, speeding up a little. */
    function cometHead(c) {
        var d = c.speed * c.age * (0.75 + 0.5 * (c.age / c.life));
        return { x: c.x + c.dx * d, y: c.y + c.dy * d };
    }
    /** The comets and their glitter, moved by time alone — what a frame draws. */
    function cometWorld(dustColors) {
        var comets = [], bits = [];
        function shed(c) {
            var h = cometHead(c), sparkle = Math.random() < COMET_SPARKLE_SHARE, k = sparkle ? SPARKLE : DUST;
            bits.push({
                sparkle: sparkle,
                x: h.x + between([-k.jitter, k.jitter]),
                y: h.y + between([-k.jitter, k.jitter]),
                vx: -c.dx * k.back + between(k.spreadX),
                vy: -c.dy * k.back + between(k.spreadY),
                sink: k.sink,
                r: between(k.r),
                age: 0,
                life: between(k.life),
                color: dustColors[Math.floor(Math.random() * dustColors.length)],
                rot: Math.random() * Math.PI * 2,
                spin: between([-3, 3]),
                twinkle: sparkle ? between([18, 30]) : between([15, 35]),
            });
        }
        return {
            comets: comets,
            bits: bits,
            spawn: function (x, y) {
                var a = ((COMET_ANGLE + between([-COMET_JITTER, COMET_JITTER])) * Math.PI) / 180;
                comets.push({ x: x + between([-6, 6]), y: y + between([-6, 6]), dx: Math.cos(a), dy: Math.sin(a), speed: between(COMET_SPEED), life: between(COMET_LIFE), age: 0, owed: 0 });
            },
            step: function (dt) {
                var i, b, c;
                for (i = 0; i < bits.length; i++) {
                    b = bits[i];
                    b.age += dt;
                    b.vy += b.sink * dt;
                    b.x += b.vx * dt;
                    b.y += b.vy * dt;
                    b.rot += b.spin * dt;
                }
                for (i = 0; i < comets.length; i++) {
                    c = comets[i];
                    c.age += dt;
                    if (c.age > c.life * COMET_SHED) continue;
                    c.owed += dt * COMET_SHED_PER_S;
                    for (; c.owed >= 1; c.owed -= 1) if (bits.length < COMET_MAX_BITS) shed(c);
                }
                for (i = comets.length - 1; i >= 0; i--) if (comets[i].age >= comets[i].life) comets.splice(i, 1);
                for (i = bits.length - 1; i >= 0; i--) if (bits[i].age >= bits[i].life) bits.splice(i, 1);
            },
        };
    }

    function paper(w, h) {
        var ratio = window.devicePixelRatio || 1;
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
        var ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.scale(ratio, ratio);
        return { canvas: canvas, ctx: ctx };
    }
    function glowDisc(ctx, c, r, stops) {
        var grad = ctx.createRadialGradient(c, c, 0, c, c, r);
        stops.forEach(function (s, i) { grad.addColorStop(i / (stops.length - 1), s); });
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.fill();
    }
    function headImage(colors) {
        var p = paper(HEAD_PX, HEAD_PX);
        if (!p) return null;
        glowDisc(p.ctx, HEAD_PX / 2, 15, colors.glow);
        glowDisc(p.ctx, HEAD_PX / 2, 3, colors.core);
        return p.canvas;
    }
    function sparkleImage(colors) {
        var p = paper(SPARKLE_PX, SPARKLE_PX);
        if (!p) return null;
        var ctx = p.ctx, c = SPARKLE_PX / 2, r = SPARKLE_R, w = r * 0.2;
        ctx.shadowColor = colors.halo;
        ctx.shadowBlur = r * 1.8;
        ctx.fillStyle = colors.sparkle;
        ctx.beginPath();
        ctx.moveTo(c, c - r);
        ctx.quadraticCurveTo(c + w, c - w, c + r, c);
        ctx.quadraticCurveTo(c + w, c + w, c, c + r);
        ctx.quadraticCurveTo(c - w, c + w, c - r, c);
        ctx.quadraticCurveTo(c - w, c - w, c, c - r);
        ctx.fill();
        return p.canvas;
    }

    function comet(host, light) {
        var colors = COMET_COLORS[light ? 'light' : 'dark'];
        var layer = document.createElement('canvas');
        layer.className = 'pv-fx';
        layer.setAttribute('aria-hidden', 'true');
        // a canvas keeps its own pixel size unless told: it covers the preview, drawn at the screen's density
        layer.style.width = '100%';
        layer.style.height = '100%';
        host.appendChild(layer);
        var ctx = layer.getContext('2d');
        var head = headImage(colors), spark = sparkleImage(colors), world = cometWorld(colors.dust);
        var ratio = 1;
        function fit() {
            ratio = window.devicePixelRatio || 1;
            layer.width = Math.round(host.clientWidth * ratio);
            layer.height = Math.round(host.clientHeight * ratio);
        }
        fit();
        function draw() {
            if (!ctx) return;
            var i, k, a, s, cos, sin;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, layer.width, layer.height);
            ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
            for (i = 0; head && i < world.comets.length; i++) {
                var c = world.comets[i], h = cometHead(c);
                k = c.age / c.life;
                ctx.globalAlpha = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
                ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
                ctx.drawImage(head, h.x - HEAD_PX / 2, h.y - HEAD_PX / 2, HEAD_PX, HEAD_PX);
            }
            for (i = 0; i < world.bits.length; i++) {
                var b = world.bits[i];
                k = b.age / b.life;
                if (b.sparkle) {
                    if (!spark) continue;
                    a = Math.sin(Math.PI * k) * (0.65 + 0.35 * Math.sin(b.age * b.twinkle));
                    s = (b.r * (0.45 + 0.55 * Math.sin(Math.PI * k))) / SPARKLE_R;
                    if (a <= 0 || s <= 0) continue;
                    cos = Math.cos(b.rot) * s * ratio;
                    sin = Math.sin(b.rot) * s * ratio;
                    ctx.globalAlpha = a;
                    ctx.setTransform(cos, sin, -sin, cos, b.x * ratio, b.y * ratio);
                    ctx.drawImage(spark, -SPARKLE_PX / 2, -SPARKLE_PX / 2, SPARKLE_PX, SPARKLE_PX);
                } else {
                    a = (1 - k) * (0.6 + 0.4 * Math.sin(b.age * b.twinkle));
                    if (a <= 0) continue;
                    ctx.globalAlpha = a;
                    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
                    ctx.fillStyle = b.color;
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, b.r * (1 - k * 0.5), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
        }
        var frame = 0, last = null;
        function tick(now) {
            world.step(last === null ? 1 / 60 : Math.min(0.05, (now - last) / 1000));
            last = now;
            draw();
            frame = world.comets.length || world.bits.length ? requestAnimationFrame(tick) : 0;
            if (!frame) last = null;
        }
        var travel = 0, lastSpawn = 0, prev = null;
        function onMove(e) {
            var now = performance.now();
            var box = host.getBoundingClientRect();
            var to = { x: e.clientX - box.left, y: e.clientY - box.top };
            if (prev) travel += Math.hypot(to.x - prev.x, to.y - prev.y);
            prev = to;
            if (travel < COMET_SPAWN_PX || now - lastSpawn < COMET_SPAWN_MS) return;
            travel = 0;
            lastSpawn = now;
            world.spawn(to.x, to.y);
            if (!frame) frame = requestAnimationFrame(tick);
        }
        host.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('resize', fit);
        return function stop() {
            host.removeEventListener('pointermove', onMove);
            window.removeEventListener('resize', fit);
            if (frame) cancelAnimationFrame(frame);
            layer.remove();
        };
    }

    var START = { sandevistan: sandevistan, comet: comet };

    root.CursorFx = {
        EFFECTS: EFFECTS,
        /** Starts the named effect over host (positioned); returns its stop. An unknown name is no effect. */
        start: function (name, host, light) {
            var key = String(name || '').trim().toLowerCase();
            var run = Object.prototype.hasOwnProperty.call(START, key) ? START[key] : null;
            return run ? run(host, light) : function () {};
        },
    };
})(this);
