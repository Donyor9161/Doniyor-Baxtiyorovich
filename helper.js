/* =========================================================
   DONYLOGIC — kichik AI yordamchi (pastki o'ng burchakdagi chat)
   Brauzer to'g'ridan-to'g'ri AI xizmatiga ulanmaydi: so'rov sizning
   Cloudflare Worker'ingizga (helper-worker.js) boradi — API kalit shu yerda
   YASHIRIN saqlanadi. Sayt kodiga kalitni hech qachon yozmang.
   ========================================================= */
(() => {
    "use strict";

    // helper-worker.js ni Cloudflare'ga joylagach, shu yerga uning manzilini yozing:
    const HELPER_ENDPOINT = "https://donylogic-helper.donylogicstudios.workers.dev";

    const PREF_KEY = "donylogic_helper";            // "off" bo'lsa yashirin
    const CHAT_KEY = "donylogic_helper_chat";
    const COUNT_KEY = "donylogic_helper_count";
    const MAX_PER_SESSION = 40;
    const MAX_HISTORY = 30;

    if (!HELPER_ENDPOINT || HELPER_ENDPOINT.includes("YOUR-")){
        console.info("[yordamchi] HELPER_ENDPOINT hali sozlanmagan — helper.js boshidagi manzilni yozing.");
        return;
    }

    function ssGet(k){ try { return sessionStorage.getItem(k); } catch { return null; } }
    function ssSet(k, v){ try { sessionStorage.setItem(k, v); } catch {} }
    const prefOn = () => { try { return localStorage.getItem(PREF_KEY) !== "off"; } catch { return true; } };

    let history = [];
    try {
        history = JSON.parse(ssGet(CHAT_KEY) || "[]")
            .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
    } catch { history = []; }
    let busy = false;

    /* ---------------- DOM ---------------- */
    const root = document.createElement("div");
    root.className = "hp-root";
    root.innerHTML = `
        <button type="button" class="hp-launcher" aria-label="Yordamchini ochish" aria-expanded="false"><i class="ri-robot-2-fill"></i></button>
        <section class="hp-panel" role="dialog" aria-label="Donylogic yordamchisi" hidden>
            <header class="hp-head">
                <span class="hp-avatar"><i class="ri-robot-2-fill"></i></span>
                <div class="hp-title"><strong>Donylogic yordamchisi</strong><small>Sun'iy intellekt</small></div>
                <button type="button" class="hp-icon" data-act="clear" title="Suhbatni tozalash" aria-label="Suhbatni tozalash"><i class="ri-delete-bin-6-line"></i></button>
                <button type="button" class="hp-icon" data-act="close" title="Yopish" aria-label="Yopish"><i class="ri-close-line"></i></button>
            </header>
            <div class="hp-msgs" aria-live="polite"></div>
            <form class="hp-form">
                <textarea rows="1" maxlength="400" placeholder="Savolingizni yozing..." aria-label="Savol"></textarea>
                <button type="submit" aria-label="Yuborish"><i class="ri-send-plane-2-fill"></i></button>
            </form>
            <p class="hp-note">Sun'iy intellekt xato qilishi mumkin.</p>
        </section>`;
    document.body.appendChild(root);

    const launcher = root.querySelector(".hp-launcher");
    const panel = root.querySelector(".hp-panel");
    const msgs = root.querySelector(".hp-msgs");
    const form = root.querySelector(".hp-form");
    const input = form.querySelector("textarea");

    /* ---------------- yordamchi funksiyalar ---------------- */
    function esc(s){
        const d = document.createElement("div");
        d.textContent = s;
        return d.innerHTML;
    }
    // xavfsiz minimal formatlash: avval escape, keyin **qalin**, havola va yangi qator
    function fmt(text){
        let h = esc(text);
        h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
        return h.replace(/\n/g, "<br>");
    }
    function scrollDown(){ msgs.scrollTop = msgs.scrollHeight; }
    function save(){ ssSet(CHAT_KEY, JSON.stringify(history.slice(-MAX_HISTORY))); }

    function addMsg(role, text){
        const el = document.createElement("div");
        el.className = `hp-msg hp-${role}`;
        if (role === "user") el.textContent = text;
        else el.innerHTML = fmt(text);
        msgs.appendChild(el);
        scrollDown();
        return el;
    }
    function addTyping(){
        const el = document.createElement("div");
        el.className = "hp-msg hp-assistant hp-typing";
        el.innerHTML = "<span></span><span></span><span></span>";
        msgs.appendChild(el);
        scrollDown();
        return el;
    }

    const SUGGESTIONS = ["Donylogic nima?", "Qanday fikr qoldiraman?", "Dasturchi bilan qanday bog'lanaman?"];
    function renderAll(){
        msgs.innerHTML = "";
        addMsg("assistant", "Salom! Men Donylogic saytining kichik yordamchisiman. Sayt, loyiha yoki dasturlash haqida savol bersangiz, yordam beraman.");
        history.forEach((m) => addMsg(m.role, m.content));
        if (!history.length){
            const wrap = document.createElement("div");
            wrap.className = "hp-chips";
            SUGGESTIONS.forEach((s) => {
                const b = document.createElement("button");
                b.type = "button"; b.textContent = s;
                b.addEventListener("click", () => send(s));
                wrap.appendChild(b);
            });
            msgs.appendChild(wrap);
        }
        scrollDown();
    }

    /* ---------------- yuborish ---------------- */
    async function send(raw){
        const text = (raw || "").trim();
        if (!text || busy) return;

        const used = Number(ssGet(COUNT_KEY) || 0);
        if (used >= MAX_PER_SESSION){
            addMsg("assistant", "Bu sessiyada savollar limiti tugadi. Keyinroq yana urinib ko'ring yoki muallifga Telegram orqali yozing.");
            return;
        }

        msgs.querySelector(".hp-chips")?.remove();
        busy = true;
        ssSet(COUNT_KEY, String(used + 1));
        addMsg("user", text);
        history.push({ role: "user", content: text });
        save();
        const typing = addTyping();

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 25000);
        let failed = null;
        try {
            const res = await fetch(HELPER_ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: history.slice(-8) }),
                signal: ctrl.signal
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 429) failed = "Juda ko'p so'rov yuborildi. Bir daqiqadan so'ng yana urinib ko'ring.";
            else if (!res.ok || !data.reply) failed = "Kechirasiz, hozir javob bera olmayapman. Birozdan so'ng qayta urinib ko'ring.";
            else {
                typing.remove();
                history.push({ role: "assistant", content: data.reply });
                save();
                addMsg("assistant", data.reply);
            }
        } catch (err){
            failed = "Ulanishda xatolik yuz berdi. Internetni tekshirib, qayta urinib ko'ring.";
        } finally {
            clearTimeout(timer);
            busy = false;
        }
        if (failed){
            typing.remove();
            history.pop(); // javobsiz qolgan savol keyingi so'rovlarni chalkashtirmasligi uchun
            save();
            addMsg("assistant", failed);
        }
    }

    /* ---------------- ochish / yopish ---------------- */
    function open(){
        panel.hidden = false;
        requestAnimationFrame(() => panel.classList.add("is-open"));
        launcher.setAttribute("aria-expanded", "true");
        launcher.classList.add("is-hidden");
        setTimeout(() => input.focus(), 200);
        scrollDown();
    }
    function close(){
        panel.classList.remove("is-open");
        launcher.setAttribute("aria-expanded", "false");
        launcher.classList.remove("is-hidden");
        setTimeout(() => { panel.hidden = true; }, 220);
    }

    launcher.addEventListener("click", open);
    root.querySelector('[data-act="close"]').addEventListener("click", close);
    root.querySelector('[data-act="clear"]').addEventListener("click", () => { history = []; save(); renderAll(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const v = input.value;
        input.value = "";
        input.style.height = "";
        send(v);
    });
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); form.requestSubmit(); }
    });
    input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 96) + "px";
    });

    /* ---------------- sozlamalardan yoqish/o'chirish ---------------- */
    function applyPref(){
        const on = prefOn();
        root.hidden = !on;
        if (!on && !panel.hidden) close();
    }
    window.addEventListener("donylogic:prefs", applyPref);

    renderAll();
    applyPref();
})();
