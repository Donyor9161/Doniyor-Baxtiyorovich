/* =========================================================
   DONYLOGIC — Sozlamalar oynasi (profil laqabi, o'rgimchak, AI yordamchi,
   bildirishnoma, o'z ma'lumotlarini boshqarish)
   comments.js tomonidan "Sozlamalar" tugmasi bosilganda dinamik yuklanadi.
   ========================================================= */
import { doc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const SPIDER_KEY = "donylogic_spider";
const SIZE_KEY = "donylogic_spider_size";
const HELPER_KEY = "donylogic_helper";
const RESERVED = /donylogic|admin|moderator|ceo|alfgamex|muallif|owner|staff/i;
const NICK_RE = /^[\p{L}\p{N} ._'’-]{2,24}$/u;

const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function lsGet(k){ try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v){ try { localStorage.setItem(k, v); } catch {} }
const spiderOn = () => { const v = lsGet(SPIDER_KEY); return v === "on" ? true : v === "off" ? false : (!isTouch && !reduceMotion); };
const helperOn = () => lsGet(HELPER_KEY) !== "off";
const sizeVal = () => ["sm", "md", "lg"].includes(lsGet(SIZE_KEY)) ? lsGet(SIZE_KEY) : "md";
const prefsChanged = () => window.dispatchEvent(new CustomEvent("donylogic:prefs"));

export function openSettings(ctx){
    if (document.querySelector(".set-overlay")) return;

    const esc = ctx.escapeHTML;
    const user = ctx.getCurrentUser();
    const role = ctx.getRole();

    const profileHTML = user ? `
        <section class="set-section">
            <h4><i class="ri-user-3-line"></i> Profil</h4>
            <div class="set-profile">
                <img src="${esc(user.photoURL || "")}" alt="" referrerpolicy="no-referrer">
                <div>
                    <strong>${esc(user.displayName || "Foydalanuvchi")}</strong> ${ctx.roleBadgeHTML(role)}
                    <small>${user.providerData?.[0]?.providerId === "github.com" ? "GitHub orqali kirgansiz" : "Google orqali kirgansiz"}</small>
                </div>
            </div>
            <form class="set-nick-form" id="setNickForm">
                <label for="setNick">Laqab (izohlarda shu nom ko'rinadi)</label>
                <div class="set-row">
                    <input type="text" id="setNick" maxlength="24" placeholder="${esc(user.displayName || "Laqab")}" value="${esc(ctx.getNickname() || "")}">
                    <button type="submit" class="adm-btn adm-btn-primary"><i class="ri-save-line"></i> Saqlash</button>
                </div>
                <p class="set-hint" id="setNickMsg">2–24 belgi: harf, raqam, bo'sh joy, nuqta, defis. Bo'sh qoldirsangiz, asl ismingiz ishlatiladi. Laqab faqat yangi izohlarda ko'rinadi.</p>
            </form>
        </section>` : `
        <section class="set-section">
            <h4><i class="ri-user-3-line"></i> Profil</h4>
            <p class="set-hint">Laqab o'rnatish va ma'lumotlarni boshqarish uchun avval sahifadagi "Fikr-mulohaza" bo'limidan Google yoki GitHub bilan kiring.</p>
        </section>`;

    const notifPerm = ("Notification" in window) ? Notification.permission : "unsupported";
    const notifHTML = notifPerm === "unsupported" ? `<p class="set-hint">Brauzeringiz bildirishnomalarni qo'llamaydi.</p>`
        : notifPerm === "granted" ? `<p class="set-hint set-ok"><i class="ri-check-line"></i> Bildirishnomalar yoqilgan.</p>`
        : notifPerm === "denied" ? `<p class="set-hint">Bildirishnomalar brauzer sozlamalarida bloklangan.</p>`
        : `<button type="button" class="adm-btn" id="setNotifBtn"><i class="ri-notification-3-line"></i> Ruxsat so'rash</button>`;

    const dataHTML = user ? `
        <section class="set-section">
            <h4><i class="ri-shield-keyhole-line"></i> Ma'lumotlarim</h4>
            <div class="set-row set-wrap">
                <button type="button" class="adm-btn adm-btn-danger" id="setDelComments"><i class="ri-delete-bin-6-line"></i> Barcha izohlarimni o'chirish</button>
                <button type="button" class="adm-btn" id="setLogout"><i class="ri-logout-box-r-line"></i> Chiqish</button>
            </div>
            <p class="set-hint" id="setDataMsg">Izohlaringizga boshqalar yozgan javoblar ham ko'rinmay qoladi.</p>
        </section>` : "";

    const overlay = document.createElement("div");
    overlay.className = "set-overlay";
    overlay.innerHTML = `
        <div class="set-modal" role="dialog" aria-modal="true" aria-label="Sozlamalar">
            <div class="set-head">
                <h3><i class="ri-settings-3-fill"></i> Sozlamalar</h3>
                <button type="button" class="admin-close" aria-label="Yopish"><i class="ri-close-line"></i></button>
            </div>
            <div class="set-body">
                ${profileHTML}

                <section class="set-section">
                    <h4><i class="ri-magic-line"></i> Sayt effektlari</h4>
                    <div class="set-item">
                        <div><strong>O'rgimchak</strong><small>Sichqoncha ortidan quvlab yuradi</small></div>
                        <label class="set-switch"><input type="checkbox" id="setSpider" ${spiderOn() ? "checked" : ""}><span class="set-slider"></span></label>
                    </div>
                    <div class="set-item">
                        <div><strong>O'rgimchak o'lchami</strong></div>
                        <select id="setSpiderSize" class="admin-role-select" ${spiderOn() ? "" : "disabled"}>
                            <option value="sm">Kichik</option>
                            <option value="md">O'rta</option>
                            <option value="lg">Katta</option>
                        </select>
                    </div>
                    <div class="set-item">
                        <div><strong>AI yordamchi</strong><small>Pastki o'ng burchakdagi chat</small></div>
                        <label class="set-switch"><input type="checkbox" id="setHelper" ${helperOn() ? "checked" : ""}><span class="set-slider"></span></label>
                    </div>
                </section>

                <section class="set-section">
                    <h4><i class="ri-notification-3-line"></i> Bildirishnomalar</h4>
                    ${notifHTML}
                </section>

                ${dataHTML}
            </div>
        </div>`;
    document.body.appendChild(overlay);
    document.body.classList.add("scroll-locked");
    overlay.querySelector("#setSpiderSize").value = sizeVal();

    const onKey = (e) => { if (e.key === "Escape") close(); };
    const close = () => {
        document.removeEventListener("keydown", onKey);
        document.body.classList.remove("scroll-locked");
        overlay.remove();
    };
    document.addEventListener("keydown", onKey);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector(".admin-close").addEventListener("click", close);

    /* ---- effektlar (shu qurilmada saqlanadi) ---- */
    const spiderBox = overlay.querySelector("#setSpider");
    const sizeSel = overlay.querySelector("#setSpiderSize");
    spiderBox.addEventListener("change", () => {
        lsSet(SPIDER_KEY, spiderBox.checked ? "on" : "off");
        sizeSel.disabled = !spiderBox.checked;
        prefsChanged();
    });
    sizeSel.addEventListener("change", () => { lsSet(SIZE_KEY, sizeSel.value); prefsChanged(); });
    overlay.querySelector("#setHelper").addEventListener("change", (e) => {
        lsSet(HELPER_KEY, e.target.checked ? "on" : "off");
        prefsChanged();
    });

    overlay.querySelector("#setNotifBtn")?.addEventListener("click", async () => {
        try { await Notification.requestPermission(); } catch {}
        close();
        window.dispatchEvent(new CustomEvent("donylogic:notify-perm"));
    });

    if (!user) return;

    /* ---- laqab ---- */
    const nickForm = overlay.querySelector("#setNickForm");
    const nickMsg = overlay.querySelector("#setNickMsg");
    nickForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const raw = overlay.querySelector("#setNick").value.trim();
        const say = (t, bad) => { nickMsg.textContent = t; nickMsg.classList.toggle("set-bad", !!bad); nickMsg.classList.toggle("set-ok", !bad); };

        if (raw && !NICK_RE.test(raw)) return say("Laqab 2–24 belgi bo'lishi va faqat harf, raqam, bo'sh joy, nuqta yoki defisdan iborat bo'lishi kerak.", true);
        if (raw && RESERVED.test(raw) && role !== "author") return say("Bu laqabni tanlab bo'lmaydi (rasmiy nomlarga o'xshash).", true);

        const btn = nickForm.querySelector("button");
        btn.disabled = true;
        try {
            await updateDoc(doc(ctx.db, "users", user.uid), { nickname: raw || null });
            ctx.onNicknameSaved(raw);
            say(raw ? "Saqlandi ✓ Endi izohlaringizda shu laqab ko'rinadi." : "Laqab olib tashlandi ✓");
        } catch (err){
            console.error("[sozlamalar] laqabni saqlashda xato:", err);
            say("Saqlab bo'lmadi. Birozdan so'ng qayta urinib ko'ring.", true);
        } finally {
            btn.disabled = false;
        }
    });

    /* ---- ma'lumotlar ---- */
    const dataMsg = overlay.querySelector("#setDataMsg");
    overlay.querySelector("#setDelComments").addEventListener("click", async () => {
        const mine = ctx.getComments().filter((c) => c.uid === user.uid);
        if (!mine.length){ dataMsg.textContent = "Sizning izohlaringiz topilmadi."; return; }
        if (!confirm(`${mine.length} ta izohingiz butunlay o'chiriladi. Davom etasizmi?`)) return;
        try {
            for (let i = 0; i < mine.length; i += 400){
                const batch = writeBatch(ctx.db);
                mine.slice(i, i + 400).forEach((c) => batch.delete(doc(ctx.db, "comments", c.id)));
                await batch.commit();
            }
            dataMsg.textContent = `${mine.length} ta izoh o'chirildi ✓`;
            dataMsg.classList.add("set-ok");
        } catch (err){
            console.error("[sozlamalar] izohlarni o'chirishda xato:", err);
            dataMsg.textContent = "O'chirib bo'lmadi. Qayta urinib ko'ring.";
            dataMsg.classList.add("set-bad");
        }
    });
    overlay.querySelector("#setLogout").addEventListener("click", async () => {
        close();
        await ctx.signOut();
    });
}
