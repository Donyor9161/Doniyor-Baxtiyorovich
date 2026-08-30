/* =========================================================
   Doniyor Baxtiyorov — Portfolio interactions (premium pass)
   The background photo (.img) is never targeted by this file —
   its position stays exactly as set in CSS.
   ========================================================= */
(() => {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const canFancy = !reduceMotion && !isTouch;

    /* ---------------- letter-by-letter hero reveal ---------------- */
    function initHeroLetters(){
        const h1 = document.getElementById("heroName");
        if (!h1) return;
        const textNode = Array.from(h1.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
        if (!textNode) return;

        const letters = textNode.textContent.split("");
        const frag = document.createDocumentFragment();
        letters.forEach((ch, i) => {
            const span = document.createElement("span");
            span.className = "letter";
            span.style.setProperty("--d", `${0.15 + i * 0.055}s`);
            span.textContent = ch === " " ? "\u00A0" : ch;
            frag.appendChild(span);
        });
        h1.replaceChild(frag, textNode);
    }

    /* ---------------- ambient scene layers + particles (single ordered insert) ---------------- */
    function initScene(withParticles){
        const frag = document.createDocumentFragment();

        const glow = document.createElement("div");
        glow.className = "scene-glow";
        frag.appendChild(glow);

        const grain = document.createElement("div");
        grain.className = "grain";
        frag.appendChild(grain);

        const vignette = document.createElement("div");
        vignette.className = "vignette";
        frag.appendChild(vignette);

        if (withParticles){
            const host = document.createElement("div");
            host.className = "particles";
            const count = window.innerWidth < 640 ? 10 : 18;
            for (let i = 0; i < count; i++){
                const p = document.createElement("span");
                p.className = "particle";
                const left = Math.random() * 100;
                const duration = 9 + Math.random() * 10;
                const delay = Math.random() * 10;
                const drift = (Math.random() - 0.5) * 80;
                p.style.left = `${left}%`;
                p.style.animationDuration = `${duration}s`;
                p.style.animationDelay = `${delay}s`;
                p.style.setProperty("--drift", `${drift}px`);
                host.appendChild(p);
            }
            frag.appendChild(host);
        }

        document.body.prepend(frag);
    }

    /* ---------------- smooth accordion for "Batafsil" ---------------- */
    function initAccordion(){
        document.querySelectorAll("details").forEach((details) => {
            const summary = details.querySelector("summary");
            const body = details.querySelector(".details-body");
            if (!summary || !body) return;

            summary.addEventListener("click", (e) => {
                e.preventDefault();
                const isOpen = details.hasAttribute("open");

                if (!isOpen){
                    details.setAttribute("open", "");
                    body.style.maxHeight = "0px";
                    requestAnimationFrame(() => {
                        body.style.maxHeight = body.scrollHeight + "px";
                    });
                } else {
                    body.style.maxHeight = body.scrollHeight + "px";
                    requestAnimationFrame(() => {
                        body.style.maxHeight = "0px";
                    });
                    body.addEventListener("transitionend", function handler(){
                        details.removeAttribute("open");
                        body.removeEventListener("transitionend", handler);
                    }, { once: true });
                }
            });
        });
    }

    /* ---------------- custom cursor + spotlight + comet trail ---------------- */
    function initCursor(){
        document.body.classList.add("cursor-ready");

        const dot = document.createElement("div");
        dot.className = "cursor-dot";
        const ring = document.createElement("div");
        ring.className = "cursor-ring";
        const spotlight = document.createElement("div");
        spotlight.className = "spotlight";
        document.body.append(spotlight, dot, ring);

        const palette = ["var(--cyan)", "var(--violet)", "var(--magenta)", "var(--gold)"];
        const trailCount = 6;
        const trail = Array.from({ length: trailCount }, (_, i) => {
            const t = document.createElement("div");
            t.className = "trail-dot";
            t.style.background = palette[i % palette.length];
            t.style.opacity = String(0.5 - i * 0.07);
            t.style.width = t.style.height = `${4 - i * 0.4}px`;
            document.body.appendChild(t);
            return { el: t, x: 0, y: 0 };
        });

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

            document.documentElement.style.setProperty("--mx", `${mx}px`);
            document.documentElement.style.setProperty("--my", `${my}px`);

            let leadX = dx, leadY = dy;
            trail.forEach((t) => {
                t.x += (leadX - t.x) * 0.45;
                t.y += (leadY - t.y) * 0.45;
                t.el.style.transform = `translate(${t.x}px, ${t.y}px)`;
                leadX = t.x;
                leadY = t.y;
            });

            requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);

        const hoverables = "a, summary";
        document.addEventListener("mouseover", (e) => {
            if (e.target.closest(hoverables)) ring.classList.add("is-active");
        });
        document.addEventListener("mouseout", (e) => {
            if (e.target.closest(hoverables)) ring.classList.remove("is-active");
        });

        const rippleColors = ["var(--cyan)", "var(--violet)", "var(--magenta)", "var(--gold)"];
        document.addEventListener("click", (e) => {
            const r = document.createElement("div");
            r.className = "ripple";
            r.style.left = `${e.clientX}px`;
            r.style.top = `${e.clientY}px`;
            r.style.setProperty("--rc", rippleColors[Math.floor(Math.random() * rippleColors.length)]);
            document.body.appendChild(r);
            r.addEventListener("animationend", () => r.remove());
        });
    }

    /* ---------------- magnetic social icons ---------------- */
    function initMagnetic(){
        document.querySelectorAll("#social a").forEach((el) => {
            el.addEventListener("mousemove", (e) => {
                const r = el.getBoundingClientRect();
                const relX = e.clientX - r.left - r.width / 2;
                const relY = e.clientY - r.top - r.height / 2;
                el.style.transform = `translate(${relX * 0.25}px, ${relY * 0.25}px)`;
            });
            el.addEventListener("mouseleave", () => {
                el.style.transform = "translate(0,0)";
            });
        });
    }

    function safe(fn, label){
        try { fn(); }
        catch (err){ console.error(`[portfolio] ${label}:`, err); }
    }

    document.addEventListener("DOMContentLoaded", () => {
        safe(() => initScene(canFancy), "scene");
        safe(initHeroLetters, "hero-letters");
        safe(initAccordion, "accordion");
        if (canFancy){
            safe(initCursor, "cursor");
            safe(initMagnetic, "magnetic");
        }
    });
})();
