/* =========================================================
   DONYLOGIC — sichqoncha ortidan quvlab yuradigan o'rgimchak
   - 8 ta oyoq: har biri ikki bo'g'imli (IK), qadam bosib yuradi
   - sahifaning O'ZIDA yashaydi (sahifa koordinatalarida): scroll qilinganda sahifa bilan
     birga suriladi, butun sayt uzunligi va kengligi bo'ylab yuradi
   - kursor IZIDAN doim bir xil masofada ergashadi (kursor to'xtasa, shu masofada to'xtaydi)
   - sichqoncha kursorining o'zi o'zgarmaydi
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
    const FOLLOW = 92;                 // kursor izidan ergashish masofasi (px, o'lchamga ko'paytiriladi)
    const sp = { x: -100, y: 0, vx: 0, vy: 0, th: 0, spawned: false };   // SAHIFA koordinatalarida
    const client = { x: 0, y: 0, has: false };                           // kursor (oynaga nisbatan)
    const head = { x: 0, y: 0, has: false };                             // kursor (sahifaga nisbatan)
    const trail = [];                                                    // kursor bosib o'tgan yo'l

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
        canvas.style.cssText = "position:fixed;left:0;top:0;z-index:8000;pointer-events:none;";
        document.documentElement.appendChild(canvas); // <html> ga qo'shiladi: body animatsiyalari ta'sir qilmaydi
        c2 = canvas.getContext("2d");
        resize();
    }
    function resize(){
        if (!canvas) return;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        // scrollbar hisobga olinmasligi uchun clientWidth/clientHeight (kursor koordinatalari bilan mos tushadi)
        W = document.documentElement.clientWidth || window.innerWidth;
        H = document.documentElement.clientHeight || window.innerHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + "px"; canvas.style.height = H + "px";
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

    /* ---------------- sahifa koordinatalari, kursor izi ---------------- */
    function scrollPos(){
        return [window.scrollX || window.pageXOffset || 0, window.scrollY || window.pageYOffset || 0];
    }

    // kursorni sahifa koordinatalariga o'tkazadi va yo'lini (iz) yozib boradi
    function setHead(){
        const [sx, sy] = scrollPos();
        head.x = client.x + sx; head.y = client.y + sy; head.has = true;
        const last = trail[trail.length - 1];
        if (!last || Math.hypot(head.x - last.x, head.y - last.y) >= 5){
            trail.push({ x: head.x, y: head.y });
            let acc = 0; // keraksiz eski izlarni olib tashlaymiz
            for (let i = trail.length - 1; i > 0; i--){
                acc += Math.hypot(trail[i].x - trail[i - 1].x, trail[i].y - trail[i - 1].y);
                if (acc > FOLLOW * S * 2.5){ trail.splice(0, i - 1); break; }
            }
        }
    }

    // iz bo'ylab kursordan FOLLOW masofa orqadagi nuqta — o'rgimchak shu yerga intiladi
    function followTarget(){
        const L = FOLLOW * S;
        let acc = 0, px = head.x, py = head.y;
        for (let i = trail.length - 1; i >= 0; i--){
            const q = trail[i];
            const seg = Math.hypot(px - q.x, py - q.y);
            if (acc + seg >= L){
                const t = (L - acc) / (seg || 1);
                return { x: px + (q.x - px) * t, y: py + (q.y - py) * t };
            }
            acc += seg; px = q.x; py = q.y;
        }
        // iz hali qisqa — kursordan o'rgimchak turgan tomonda L masofada to'xtaydi
        const dx = sp.x - head.x, dy = sp.y - head.y, d = Math.hypot(dx, dy) || 1;
        return { x: head.x + dx / d * L, y: head.y + dy / d * L };
    }

    // oyna chetidan (kursorga qarab) kirib keladigan joyga qo'yadi
    function respawn(ux, uy){
        const n = Math.hypot(ux, uy) || 1;
        ux /= n; uy /= n;
        const [sx, sy] = scrollPos();
        const m = 90 * S;
        let t = Infinity;
        if (ux > 0) t = Math.min(t, (sx + W + m - head.x) / ux); else if (ux < 0) t = Math.min(t, (sx - m - head.x) / ux);
        if (uy > 0) t = Math.min(t, (sy + H + m - head.y) / uy); else if (uy < 0) t = Math.min(t, (sy - m - head.y) / uy);
        if (!isFinite(t) || t < 0) t = Math.max(W, H);
        sp.x = head.x + ux * t; sp.y = head.y + uy * t;
        sp.vx = sp.vy = 0;
        sp.th = Math.atan2(-uy, -ux);
        sp.spawned = true;
        placeFeet();
    }

    /* ---------------- fizika ---------------- */
    function update(dt){
        // sahifa uzun scroll qilinib o'rgimchak juda uzoqda va ekrandan tashqarida qolsa — chetdan qayta kirib keladi
        const [sx, sy] = scrollPos();
        const off = sp.x < sx - 150 || sp.x > sx + W + 150 || sp.y < sy - 150 || sp.y > sy + H + 150;
        if (head.has && off && Math.hypot(sp.x - head.x, sp.y - head.y) > Math.max(W, H) * 0.8){
            respawn(sp.x - head.x, sp.y - head.y);
        }

        const tg = head.has ? followTarget() : { x: sp.x, y: sp.y };
        const dx = tg.x - sp.x, dy = tg.y - sp.y;
        const dist = Math.hypot(dx, dy);

        let dvx = 0, dvy = 0;
        if (head.has && dist > 2.5){
            const speed = Math.min(1000, 35 + dist * 12);
            dvx = dx / dist * speed; dvy = dy / dist * speed;
        }
        const k = Math.min(1, dt * 14);
        sp.vx += (dvx - sp.vx) * k;
        sp.vy += (dvy - sp.vy) * k;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        const speed = Math.hypot(sp.vx, sp.vy);

        // yo'nalish: yurganda harakat tomoniga, to'xtaganda kursorga qarab buriladi
        let want = sp.th;
        if (speed > 25) want = Math.atan2(sp.vy, sp.vx);
        else if (head.has) want = Math.atan2(head.y - sp.y, head.x - sp.x);
        let diff = want - sp.th;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        sp.th += diff * Math.min(1, dt * (speed > 25 ? 10 : 4));

        // davom etayotgan qadamlar
        const stepDur = speed > 500 ? 0.08 : speed > 120 ? 0.11 : 0.17;
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
        const [sx, sy] = scrollPos();
        if (sp.x < sx - 140 || sp.x > sx + W + 140 || sp.y < sy - 140 || sp.y > sy + H + 140) return; // ekrandan tashqarida
        c2.save();
        c2.translate(-sx, -sy); // o'rgimchak sahifa koordinatalarida — scroll bilan birga suriladi
        legs.forEach(drawLeg);
        drawBody();
        c2.restore();
    }

    /* ---------------- animatsiya sikli ---------------- */
    function frame(now){
        raf = 0;
        if (!enabled) return;
        const dt = Math.min(0.05, ((now - lastT) / 1000) || 0.016);
        lastT = now;
        if (head.has && sp.spawned){ update(dt); draw(); }

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
        // kursorga qarama-qarshi chetdan kirib keladi
        respawn(client.x < W / 2 ? 1 : -1, 0.15);
    }

    function onPointer(e){
        client.x = e.clientX; client.y = e.clientY; client.has = true;
        lastActive = performance.now();
        setHead();
        if (!sp.spawned) spawn();
        wake();
    }
    // scroll qilinganda kursor sahifaga nisbatan siljiydi — izga qo'shamiz
    function onScroll(){
        if (!client.has) return;
        lastActive = performance.now();
        setHead();
        wake();
    }
    function onResize(){
        resize();
        if (client.has) setHead();
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
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onResize);
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("donylogic:themechange", onTheme);
    }
    function disable(){
        enabled = false;
        cancelAnimationFrame(raf); raf = 0; running = false;
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("pointerdown", onPointer);
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("donylogic:themechange", onTheme);
        canvas?.remove(); canvas = null; c2 = null;
        sp.spawned = false; sp.vx = sp.vy = 0; head.has = false; client.has = false; trail.length = 0;
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
