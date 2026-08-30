/* =========================================================
   Doniyor Baxtiyorov — Portfolio interactions
   The background photo (.img) is never targeted by this file —
   its position stays exactly as set in CSS.
   ========================================================= */
(() => {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const canFancy = !reduceMotion && !isTouch;

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

        const hoverables = "a, summary";
        document.addEventListener("mouseover", (e) => {
            if (e.target.closest(hoverables)) ring.classList.add("is-active");
        });
        document.addEventListener("mouseout", (e) => {
            if (e.target.closest(hoverables)) ring.classList.remove("is-active");
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

    document.addEventListener("DOMContentLoaded", () => {
        if (canFancy){
            try { initCursor(); } catch (err){ console.error("[portfolio] cursor:", err); }
            try { initMagnetic(); } catch (err){ console.error("[portfolio] magnetic:", err); }
        }
    });
})();
