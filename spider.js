/* =========================================================
   DONYLOGIC — sichqoncha ortidan quvlab yuradigan o'rgimchak
   - 8 ta oyoq: har biri ikki bo'g'imli (IK), qadam bosib yuradi
   - sichqoncha kursori o'zgarmaydi, o'rgimchak faqat uning yonida yuradi
   - Sozlamalardan (settings.js) o'chirish / o'lchamini o'zgartirish mumkin
   - harakatsiz qolganda animatsiya sikli to'xtaydi (batareya tejaladi)
   ========================================================= */
(() => {
    "use strict";

    const PREF_KEY = "donylogic_spider";        // "on" | "off"
    const SIZE_KEY = "donylogic_spider_size";   // "sm" | "md" | "lg"
    const SIZES = { sm: 0.8, md: 1, lg: 1.35 };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

    // koordinatalar tanaga nisbatan: x — oldinga, y — o'ng tomonga
    // hip — oyoq tanaga ulangan joy, rest — tinch holatdagi oyoq uchi
    const BASE = [
        { hip: [8, 3.5],   rest: [36, 24] },
        { hip: [4, 5],     rest: [22, 40] },
        { hip: [0, 5],     rest: [-2, 42] },
        { hip: [-5, 4.5],  rest: [-30, 34] }
    ];

    let S = 1;
    let enabled = false;
    let canvas = null, c2 = null;
    let W = 0, H = 0, dpr = 1;
    let raf = 0, running = false, lastT = 0, lastActive = 0;
    let A = 28, B = 38; // son va boldir uzunligi
    let colors = null;
    let legs = [];
    const sp = { x: -100, y: 0, vx: 0, vy: 0, th: 0, spawned: false };
    const target = { x: 0, y: 0, has: false };

    /* ---------------- sozlamalar ---------------- */
    function lsGet(k){ try { return localStorage.getItem(k); } catch { return null; } }
    function readPrefs(){
        const v = lsGet(PREF_KEY);
        // aniq tanlov bo'lmasa: faqat sichqonchali qurilmada va animatsiyaga qarshi bo'lmaganlarda yoqiladi
        const on = v === "on" ? true : v === "off" ? false : (!isTouch && !reduceMotion);
        return { enabled: on, S: SIZES[lsGet(SIZE_KEY)] || 1 };
    }

    function themeColors(){
        const light = document.documentElement.getAttribute("data-theme") === "light";
        return light
            ? { leg: "#1b1f30", glow: "rgba(124,92,255,0.16)", bodyA: "#343b5c", bodyB: "#0b0d16", rim: "rgba(124,92,255,0.75)", eye: "#7c5cff", mark: "rgba(124,92,255,0.5)" }
            : { leg: "#bcd9f3", glow: "rgba(79,216,255,0.2)",  bodyA: "#2a3a66", bodyB: "#070a14", rim: "rgba(79,216,255,0.8)",  eye: "#4fd8ff", mark: "rgba(79,216,255,0.45)" };
    }

    /* ---------------- canvas ---------------- */
    function ensureCanvas(){
        if (canvas) return;
        canvas = document.createElement("canvas");
        canvas.setAttribute("aria-hidden", "true");
        canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:8000;pointer-events:none;";
        document.body.appendChild(canvas);
        c2 = canvas.getContext("2d");
        resize();
    }
    function resize(){
        if (!canvas) return;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        c2.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (sp.spawned) draw();
    }

    /* ---------------- oyoqlar ---------------- */
    function buildLegs(){
        A = 28 * S; B = 38 * S;
        legs = [];
        BASE.forEach((b) => [1, -1].forEach((s) => {
            legs.push({
                s,
                hip: [b.hip[0] * S, s * b.hip[1] * S],
                rest: [b.rest[0] * S, s * b.rest[1] * S],
                fx: 0, fy: 0, sx: 0, sy: 0, tx: 0, ty: 0, t: 1, stepping: false
            });
        }));
        placeFeet();
    }
    function toWorld(p){
        const c = Math.cos(sp.th), s = Math.sin(sp.th);
        return [sp.x + p[0] * c - p[1] * s, sp.y + p[0] * s + p[1] * c];
    }
    function placeFeet(){
        legs.forEach((l) => {
            const w = toWorld(l.rest);
            l.fx = w[0]; l.fy = w[1]; l.t = 1; l.stepping = false;
        });
    }

    /* ---------------- fizika ---------------- */
    function update(dt){
        const dx = target.x - sp.x, dy = target.y - sp.y;
        const dist = Math.hypot(dx, dy);
        const stop = 58 * S;

        let dvx = 0, dvy = 0;
        if (target.has && dist > stop){
            const speed = Math.min(700, 40 + (dist - stop) * 5.5);
            dvx = dx / dist * speed; dvy = dy / dist * speed;
        }
        const k = Math.min(1, dt * 9);
        sp.vx += (dvx - sp.vx) * k;
        sp.vy += (dvy - sp.vy) * k;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        const speed = Math.hypot(sp.vx, sp.vy);

        // yo'nalish: yurganda harakat tomoniga, to'xtaganda kursorga qarab buriladi
        let want = sp.th;
        if (speed > 25) want = Math.atan2(sp.vy, sp.vx);
        else if (target.has && dist > 1) want = Math.atan2(dy, dx);
        let diff = want - sp.th;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        sp.th += diff * Math.min(1, dt * (speed > 25 ? 10 : 4));

        // davom etayotgan qadamlar
        const stepDur = speed > 120 ? 0.11 : 0.17;
        legs.forEach((l) => {
            if (!l.stepping) return;
            l.t += dt / stepDur;
            if (l.t >= 1){
                l.t = 1; l.stepping = false; l.fx = l.tx; l.fy = l.ty;
            } else {
                const e = l.t < 0.5 ? 2 * l.t * l.t : 1 - Math.pow(-2 * l.t + 2, 2) / 2;
                l.fx = l.sx + (l.tx - l.sx) * e;
                l.fy = l.sy + (l.ty - l.sy) * e;
            }
        });

        // yangi qadamlar: eng uzoqda qolgan oyoq birinchi qadam bosadi
        const look = 0.15, thresh = (speed > 120 ? 14 : 18) * S, maxR = (A + B) * 0.9;
        const cands = [];
        legs.forEach((l, i) => {
            if (l.stepping) return;
            const rw = toWorld(l.rest);
            let tx = rw[0] + sp.vx * look, ty = rw[1] + sp.vy * look;
            const hw = toWorld(l.hip);
            const vx = tx - hw[0], vy = ty - hw[1], vl = Math.hypot(vx, vy);
            if (vl > maxR){ tx = hw[0] + vx / vl * maxR; ty = hw[1] + vy / vl * maxR; }
            const d = Math.hypot(tx - l.fx, ty - l.fy);
            const reach = Math.hypot(l.fx - hw[0], l.fy - hw[1]);
            const forced = reach > (A + B) * 0.96;
            if (d > thresh || forced) cands.push({ i, d, forced, tx, ty });
        });
        cands.sort((a, b) => (b.forced - a.forced) || (b.d - a.d));
        cands.forEach((c) => {
            // qo'shni oyoqlar bir vaqtda qadam bosmaydi (ketma-ket, "tetrapod" yurish)
            const blocked = [c.i - 2, c.i + 2, c.i ^ 1].some((n) => n >= 0 && n < legs.length && legs[n].stepping);
            if (blocked && !c.forced) return;
            const l = legs[c.i];
            l.stepping = true; l.t = 0; l.sx = l.fx; l.sy = l.fy; l.tx = c.tx; l.ty = c.ty;
        });
    }

    /* ---------------- chizish ---------------- */
    function drawLeg(l){
        const hw = toWorld(l.hip);
        const lift = l.stepping ? Math.sin(Math.PI * l.t) : 0;

        const dx = l.fx - hw[0], dy = l.fy - hw[1];
        const d = Math.hypot(dx, dy) || 0.001;
        const ux = dx / d, uy = dy / d;
        const dc = Math.min(A + B - 0.5, Math.max(Math.abs(A - B) + 1, d));
        const fx = hw[0] + ux * dc, fy = hw[1] + uy * dc;

        // ikki bo'g'imli IK: tizza nuqtasi kosinuslar teoremasi bilan topiladi
        const cosA = (A * A + dc * dc - B * B) / (2 * A * dc);
        const ang = Math.acos(Math.max(-1, Math.min(1, cosA)));
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const nx = -uy, ny = ux;
        const ox = -Math.sin(sp.th) * l.s, oy = Math.cos(sp.th) * l.s; // tanadan tashqariga

        const k1x = hw[0] + A * (ux * ca + nx * sa), k1y = hw[1] + A * (uy * ca + ny * sa);
        const k2x = hw[0] + A * (ux * ca - nx * sa), k2y = hw[1] + A * (uy * ca - ny * sa);
        const out1 = (k1x - hw[0]) * ox + (k1y - hw[1]) * oy;
        const out2 = (k2x - hw[0]) * ox + (k2y - hw[1]) * oy;
        let kx = out1 >= out2 ? k1x : k2x;
        let ky = out1 >= out2 ? k1y : k2y;
        kx += ox * lift * 7 * S;  // qadam paytida tizza biroz ko'tariladi
        ky += oy * lift * 7 * S;

        c2.lineCap = "round"; c2.lineJoin = "round";
        c2.strokeStyle = colors.glow; c2.lineWidth = 6 * S;
        c2.beginPath(); c2.moveTo(hw[0], hw[1]); c2.lineTo(kx, ky); c2.lineTo(fx, fy); c2.stroke();

        c2.strokeStyle = colors.leg;
        c2.lineWidth = 3 * S;
        c2.beginPath(); c2.moveTo(hw[0], hw[1]); c2.lineTo(kx, ky); c2.stroke();
        c2.lineWidth = 1.9 * S;
        c2.beginPath(); c2.moveTo(kx, ky); c2.lineTo(fx, fy); c2.stroke();

        c2.fillStyle = colors.leg;
        c2.beginPath(); c2.arc(kx, ky, 1.9 * S, 0, 6.2832); c2.fill();
    }

    function drawBody(){
        c2.save();
        c2.translate(sp.x, sp.y);
        c2.rotate(sp.th);
        c2.scale(S, S);

        const ell = (cx, rx, ry) => { c2.beginPath(); c2.ellipse(cx, 0, rx, ry, 0, 0, 6.2832); };

        let g = c2.createRadialGradient(-12, -2, 1, -11, 0, 14);   // qorin
        g.addColorStop(0, colors.bodyA); g.addColorStop(1, colors.bodyB);
        ell(-11, 12.5, 9.5); c2.fillStyle = g; c2.fill();
        c2.lineWidth = 1; c2.strokeStyle = colors.rim; c2.stroke();
        c2.strokeStyle = colors.mark; c2.lineWidth = 1.2;
        c2.beginPath(); c2.moveTo(-18, 0); c2.lineTo(-6, 0); c2.moveTo(-12, -4); c2.lineTo(-12, 4); c2.stroke();

        g = c2.createRadialGradient(4, -2, 1, 5, 0, 9);             // ko'krak-bosh
        g.addColorStop(0, colors.bodyA); g.addColorStop(1, colors.bodyB);
        ell(5, 8.5, 6.6); c2.fillStyle = g; c2.fill();
        c2.lineWidth = 1; c2.strokeStyle = colors.rim; c2.stroke();

        c2.strokeStyle = colors.leg; c2.lineWidth = 1.6; c2.lineCap = "round"; // pedipalplar
        c2.beginPath();
        c2.moveTo(12.5, -1.6); c2.lineTo(17.5, -2.6);
        c2.moveTo(12.5, 1.6);  c2.lineTo(17.5, 2.6);
        c2.stroke();

        c2.fillStyle = colors.eye; c2.shadowColor = colors.eye; c2.shadowBlur = 8; // ko'zlar
        [[10.8, -2.3, 1.6], [10.8, 2.3, 1.6], [12.4, -0.9, 0.95], [12.4, 0.9, 0.95]].forEach((e) => {
            c2.beginPath(); c2.arc(e[0], e[1], e[2], 0, 6.2832); c2.fill();
        });
        c2.shadowBlur = 0;
        c2.restore();
    }

    function draw(){
        if (!c2) return;
        c2.clearRect(0, 0, W, H);
        legs.forEach(drawLeg);
        drawBody();
    }

    /* ---------------- animatsiya sikli ---------------- */
    function frame(now){
        raf = 0;
        if (!enabled) return;
        const dt = Math.min(0.05, ((now - lastT) / 1000) || 0.016);
        lastT = now;
        if (target.has && sp.spawned){ update(dt); draw(); }

        const busy = Math.hypot(sp.vx, sp.vy) > 3 || legs.some((l) => l.stepping) || performance.now() - lastActive < 700;
        if (busy) raf = requestAnimationFrame(frame);
        else running = false; // tinch holat — sikl to'xtaydi
    }
    function wake(){
        if (!enabled || running || document.hidden) return;
        running = true;
        lastT = performance.now();
        raf = requestAnimationFrame(frame);
    }

    function spawn(){
        sp.spawned = true;
        const fromRight = target.x < W / 2; // kursorga qarama-qarshi chetdan kirib keladi
        sp.x = fromRight ? W + 90 * S : -90 * S;
        sp.y = Math.min(H - 40, Math.max(40, target.y + 140));
        sp.th = fromRight ? Math.PI : 0;
        sp.vx = sp.vy = 0;
        placeFeet();
    }

    function onPointer(e){
        target.x = e.clientX; target.y = e.clientY; target.has = true;
        lastActive = performance.now();
        if (!sp.spawned) spawn();
        wake();
    }
    function onVisibility(){
        if (document.hidden){ cancelAnimationFrame(raf); running = false; }
        else wake();
    }
    function onTheme(){
        colors = themeColors();
        if (sp.spawned) draw();
    }

    /* ---------------- yoqish / o'chirish ---------------- */
    function enable(){
        enabled = true;
        ensureCanvas();
        colors = themeColors();
        buildLegs();
        window.addEventListener("pointermove", onPointer, { passive: true });
        window.addEventListener("pointerdown", onPointer, { passive: true });
        window.addEventListener("resize", resize);
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("donylogic:themechange", onTheme);
    }
    function disable(){
        enabled = false;
        cancelAnimationFrame(raf); raf = 0; running = false;
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("pointerdown", onPointer);
        window.removeEventListener("resize", resize);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("donylogic:themechange", onTheme);
        canvas?.remove(); canvas = null; c2 = null;
        sp.spawned = false; sp.vx = sp.vy = 0; target.has = false;
    }

    function applyPrefs(){
        const p = readPrefs();
        S = p.S;
        if (p.enabled && !enabled) enable();
        else if (!p.enabled && enabled) disable();
        else if (enabled){
            buildLegs(); // o'lcham o'zgargan bo'lishi mumkin
            if (sp.spawned){ draw(); wake(); }
        }
    }

    window.addEventListener("donylogic:prefs", applyPrefs);
    applyPrefs();
})();
