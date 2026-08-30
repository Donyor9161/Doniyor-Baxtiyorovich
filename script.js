/* =========================================================
   DONYLOGIC — Studio interactions
   - custom cursor (dot + trailing ring)
   - parallax starfield canvas
   - magnetic buttons / nav links
   - 3D tilt on cards
   - scroll-reveal via IntersectionObserver
   All effects respect prefers-reduced-motion and skip on touch devices.
   ========================================================= */
(() => {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const canFancy = !reduceMotion && !isTouch;

    /* ---------------- starfield ---------------- */
    function initStarfield(){
        const canvas = document.createElement("canvas");
        canvas.id = "starfield";
        document.body.prepend(canvas);
        const ctx = canvas.getContext("2d");

        let w, h, stars, dpr = Math.min(window.devicePixelRatio || 1, 2);
        let pointer = { x: 0, y: 0 };
        let targetPointer = { x: 0, y: 0 };

        function resize(){
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const density = w < 768 ? 0.00012 : 0.00022;
            const count = Math.round(w * h * density);
            stars = Array.from({ length: count }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 1.3 + 0.2,
                baseAlpha: Math.random() * 0.5 + 0.25,
                twinkleSpeed: Math.random() * 0.015 + 0.004,
                phase: Math.random() * Math.PI * 2,
                depth: Math.random() * 0.6 + 0.2 // parallax factor
            }));
        }

        function draw(t){
            ctx.clearRect(0, 0, w, h);
            pointer.x += (targetPointer.x - pointer.x) * 0.04;
            pointer.y += (targetPointer.y - pointer.y) * 0.04;
            const dx = (pointer.x - w / 2) / w;
            const dy = (pointer.y - h / 2) / h;

            for (const s of stars){
                const alpha = s.baseAlpha + Math.sin(t * s.twinkleSpeed + s.phase) * 0.25;
                const px = s.x - dx * 26 * s.depth;
                const py = s.y - dy * 26 * s.depth;
                ctx.beginPath();
                ctx.arc(px, py, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(210,232,255,${Math.max(0, alpha)})`;
                ctx.fill();
            }
            requestAnimationFrame(draw);
        }

        resize();
        window.addEventListener("resize", resize);
        window.addEventListener("mousemove", (e) => {
            targetPointer.x = e.clientX;
            targetPointer.y = e.clientY;
        });
        requestAnimationFrame(draw);
    }

    /* ---------------- custom cursor ---------------- */
    function initCursor(){
        document.body.classList.add("cursor-ready");
        const dot = document.createElement("div");
        dot.className = "cursor-dot";
        const ring = document.createElement("div");
        ring.className = "cursor-ring";
        document.body.append(dot, ring);

        let mx = window.innerWidth / 2, my = window.innerHeight / 2;
        let dx = mx, dy = my;
        let rx = mx, ry = my;

        window.addEventListener("mousemove", (e) => {
            mx = e.clientX;
            my = e.clientY;
        });

        function loop(){
            dx += (mx - dx) * 0.55;
            dy += (my - dy) * 0.55;
            rx += (mx - rx) * 0.16;
            ry += (my - ry) * 0.16;
            dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%,-50%)`;
            ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);

        const hoverables = "a, button, .btn, [onclick], .card";
        document.addEventListener("mouseover", (e) => {
            if (e.target.closest(hoverables)) ring.classList.add("is-active");
        });
        document.addEventListener("mouseout", (e) => {
            if (e.target.closest(hoverables)) ring.classList.remove("is-active");
        });
    }

    /* ---------------- magnetic elements ---------------- */
    function initMagnetic(){
        const els = document.querySelectorAll(".btn, #mininavbar a");
        els.forEach((el) => {
            el.addEventListener("mousemove", (e) => {
                const r = el.getBoundingClientRect();
                const relX = e.clientX - r.left - r.width / 2;
                const relY = e.clientY - r.top - r.height / 2;
                el.style.transform = `translate(${relX * 0.18}px, ${relY * 0.3}px)`;
            });
            el.addEventListener("mouseleave", () => {
                el.style.transform = "translate(0,0)";
            });
        });
    }

    /* ---------------- card tilt ---------------- */
    function initTilt(){
        const cards = document.querySelectorAll(".card");
        cards.forEach((card) => {
            card.addEventListener("mousemove", (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                const rotX = (py - 0.5) * -8;
                const rotY = (px - 0.5) * 8;
                card.style.transform = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(0)`;
                card.style.setProperty("--mx", `${px * 100}%`);
                card.style.setProperty("--my", `${py * 100}%`);
            });
            card.addEventListener("mouseleave", () => {
                card.style.transform = "perspective(700px) rotateX(0) rotateY(0)";
            });
        });
    }

    /* ---------------- scroll reveal ---------------- */
    function initReveal(){
        const targets = document.querySelectorAll(".reveal");
        if (!("IntersectionObserver" in window) || reduceMotion){
            targets.forEach((t) => t.classList.add("in-view"));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting){
                    entry.target.classList.add("in-view");
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.16, rootMargin: "0px 0px -60px 0px" });
        targets.forEach((t) => io.observe(t));
    }

    /* ---------------- smooth anchor scroll for scroll-cue ---------------- */
    function initScrollCue(){
        document.querySelectorAll("[data-scroll-to]").forEach((el) => {
            el.addEventListener("click", () => {
                const target = document.querySelector(el.getAttribute("data-scroll-to"));
                if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        });
    }

    /* ---------------- founding-date stopwatch ----------------
       Counts up from FOUNDING as "Donylogic™ Studios yoshi".
       If FOUNDING is still in the future, counts down instead and
       switches automatically the moment it passes — no manual edits needed. */
    function initAgeCounter(){
        const caption   = document.getElementById("ageCaption");
        const daysEl    = document.getElementById("ageDays");
        const hoursEl   = document.getElementById("ageHours");
        const minutesEl = document.getElementById("ageMinutes");
        const secondsEl = document.getElementById("ageSeconds");
        if (!daysEl) return;

        const FOUNDING = new Date(2025, 10, 15, 0, 0, 0); // 15-noyabr 2025, 00:00 (local)
        let lastSecond = null;

        function pad(n){ return String(n).padStart(2, "0"); }

        function tick(){
            const now = new Date();
            const diffMs = now - FOUNDING;
            const isFuture = diffMs < 0;
            const abs = Math.abs(diffMs);

            const totalSeconds = Math.floor(abs / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            caption.textContent = isFuture
                ? "tashkil topishiga qoldi"
                : "Donylogic™ Studios yoshi";

            daysEl.textContent = days;
            hoursEl.textContent = pad(hours);
            minutesEl.textContent = pad(minutes);
            secondsEl.textContent = pad(seconds);

            if (seconds !== lastSecond){
                lastSecond = seconds;
                secondsEl.classList.remove("pulse");
                // force reflow so the animation can restart every second
                void secondsEl.offsetWidth;
                secondsEl.classList.add("pulse");
            }
        }

        tick();
        setInterval(tick, 1000);
    }

    function safe(fn, label){
        try { fn(); }
        catch (err){ console.error(`[donylogic] ${label} ishga tushmadi:`, err); }
    }

    document.addEventListener("DOMContentLoaded", () => {
        safe(initStarfield, "starfield");
        safe(initReveal, "scroll-reveal");
        safe(initScrollCue, "scroll-cue");
        safe(initAgeCounter, "age-counter");
        if (canFancy){
            safe(initCursor, "cursor");
            safe(initMagnetic, "magnetic");
            safe(initTilt, "tilt");
        }
    });
})();
