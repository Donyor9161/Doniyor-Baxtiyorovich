/* =========================================================
   DONYLOGIC — Studio interactions
   - parallax starfield canvas
   - magnetic buttons / nav links
   - 3D tilt on cards
   - scroll-reveal via IntersectionObserver
   - tun/kun rejimi
   - UZ/EN/RU til almashtirgich (GTranslate ustida)
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

        let starRGB = getComputedStyle(document.documentElement).getPropertyValue("--star-color").trim() || "210,232,255";
        window.addEventListener("donylogic:themechange", () => {
            starRGB = getComputedStyle(document.documentElement).getPropertyValue("--star-color").trim() || "210,232,255";
        });

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
                ctx.fillStyle = `rgba(${starRGB},${Math.max(0, alpha)})`;
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
                : "yoshi";

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

    /* ---------------- tun/kun rejimi (boshlang'ich holat <head>da allaqachon qo'yilgan) ---------------- */
    function initTheme(){
        const toggle = document.getElementById("themeToggle");
        const STORAGE_KEY = "donylogic_theme";

        toggle?.addEventListener("click", () => {
            const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
            const next = current === "light" ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem(STORAGE_KEY, next);
            window.dispatchEvent(new CustomEvent("donylogic:themechange", { detail: { theme: next } }));
        });
    }

    /* ---------------- til almashtirgich: UZ (standart) / EN / RU ----------------
       GTranslate'ning dwf.js skripti sahifaga doGTranslate() funksiyasini qo'shadi;
       biz o'zimizning 3 ta tugmamiz orqali shu funksiyani chaqiramiz, GTranslate'ning
       standart (chiroyli bo'lmagan) dropdown ko'rinishini esa CSS orqali yashiramiz. */
    function initLangSwitch(){
        const wrap = document.getElementById("langSwitch");
        if (!wrap) return;
        const btns = Array.from(wrap.querySelectorAll(".lang-btn"));
        if (!btns.length) return;

        const STORAGE_KEY = "donylogic_lang";

        function currentLangFromCookie(){
            const m = document.cookie.match(/googtrans=\/[a-zA-Z-]+\/([a-zA-Z-]+)/);
            return m ? m[1].toLowerCase() : null;
        }

        function markActive(lang){
            btns.forEach((b) => b.classList.toggle("is-active", b.dataset.lang === lang));
        }

        // boshlang'ich holat: avval saqlangan tanlov, bo'lmasa cookie, bo'lmasa "uz"
        markActive(localStorage.getItem(STORAGE_KEY) || currentLangFromCookie() || "uz");

        // Ba'zi holatlarda GTranslate skripti window.doGTranslate'ni ochiq qilmasligi mumkin —
        // shu holat uchun to'g'ridan-to'g'ri Google'ning o'zi yaratadigan yashirin
        // <select class="goog-te-combo"> elementiga zaxira (fallback) yo'l qo'yamiz.
        function fireEvent(el, evtName){
            try {
                const evt = document.createEvent("HTMLEvents");
                evt.initEvent(evtName, true, true);
                el.dispatchEvent(evt);
            } catch (e){
                try { el.dispatchEvent(new Event(evtName, { bubbles: true })); } catch (e2){}
            }
        }
        function tryDirectCombo(lang){
            const combo = document.querySelector("select.goog-te-combo");
            if (!combo) return false;
            combo.value = lang;
            fireEvent(combo, "change");
            return true;
        }

        let waitAttempts = 0;
        function callDoGTranslate(pair, onDone){
            if (typeof window.doGTranslate === "function"){
                window.doGTranslate(pair);
                onDone();
                return;
            }
            const lang = pair.split("|")[1];
            if (tryDirectCombo(lang)){
                onDone();
                return;
            }
            waitAttempts++;
            if (waitAttempts > 40) return; // ~8s kutgandan keyin voz kechish
            setTimeout(() => callDoGTranslate(pair, onDone), 200);
        }

        btns.forEach((btn) => {
            btn.addEventListener("click", () => {
                const lang = btn.dataset.lang;
                markActive(lang); // tugmani darhol faollashtiramiz — foydalanuvchi kutmasin
                localStorage.setItem(STORAGE_KEY, lang);
                callDoGTranslate("uz|" + lang, () => markActive(lang));
            });
        });
    }

    /* ---------------- boot ekrani (systemd-uslubidagi "yuklanish jurnali") ----------------
       Faqat BIR MARTA (sessionStorage) va faqat animatsiyaga qarshi bo'lmaganlarga ko'rsatiladi.
       Vaqt asosida ishlaydi (haqiqiy tarmoq/Firebase holatiga bog'lanmagan) — shunda
       sekin internet yoki bloklangan skriptlar tufayli ekran "osilib qolmaydi". */
    function initBootScreen(){
        const screen = document.getElementById("bootScreen");
        const linesHost = document.getElementById("bootLines");
        if (!screen || !linesHost) return;

        const SEEN_KEY = "donylogic_boot_seen";
        if (reduceMotion || sessionStorage.getItem(SEEN_KEY)){
            screen.classList.add("is-off");
            return;
        }
        sessionStorage.setItem(SEEN_KEY, "1");

        // XAVFSIZLIK TAYMERI: nima bo'lishidan qat'iy nazar (JS xatosi, sekin qurilma va h.k.)
        // 3.5 soniyadan keyin ekran MAJBURAN olib tashlanadi — hech qachon "osilib qolmaydi".
        const failSafeTimer = setTimeout(forceReveal, 3500);
        function forceReveal(){
            clearTimeout(failSafeTimer);
            screen.classList.add("is-hidden");
            document.body.classList.remove("boot-locked");
            setTimeout(() => screen.classList.add("is-off"), 550);
        }

        const theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
        const okLines = [
            "Starfield renderer ishga tushdi",
            "Firebase ulanishi o'rnatildi",
            `Tema: ${theme} — yuklandi`
        ];

        document.body.classList.add("boot-locked"); // scroll'ni vaqtincha to'xtatish uchun ilova qilinadi (kerak bo'lsa CSS'ga qo'shiladi)

        let delay = 150;
        const STEP_MS = 260;

        okLines.forEach((text) => {
            const el = document.createElement("div");
            el.className = "boot-line";
            el.innerHTML = `<span class="boot-ok">[ OK ]</span> ${text}`;
            linesHost.appendChild(el);
            setTimeout(() => el.classList.add("is-shown"), delay);
            delay += STEP_MS;
        });

        const finalEl = document.createElement("div");
        finalEl.className = "boot-line boot-final";
        finalEl.innerHTML = `DONYLOGIC_OS v1.0 tayyor<span class="boot-cursor"></span>`;
        linesHost.appendChild(finalEl);
        setTimeout(() => finalEl.classList.add("is-shown"), delay);

        const holdAfterFinal = 650;
        setTimeout(forceReveal, delay + holdAfterFinal);
    }

    function safe(fn, label){
        try { fn(); }
        catch (err){ console.error(`[donylogic] ${label} ishga tushmadi:`, err); }
    }

    // Boot ekrani eng birinchi, sahifaning qolgan qismi fonda normal yuklanaverishi bilan bir vaqtda ishga tushadi.
    safe(initBootScreen, "boot-screen");

    document.addEventListener("DOMContentLoaded", () => {
        safe(initTheme, "theme");
        safe(initStarfield, "starfield");
        safe(initReveal, "scroll-reveal");
        safe(initScrollCue, "scroll-cue");
        safe(initAgeCounter, "age-counter");
        safe(initLangSwitch, "lang-switch");
        if (canFancy){
            safe(initMagnetic, "magnetic");
            safe(initTilt, "tilt");
        }
    });
})();
