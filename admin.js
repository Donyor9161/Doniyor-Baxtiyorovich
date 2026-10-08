/* =========================================================
   DONYLOGIC — Admin panel (faqat muallif, Google orqali kirganda)
   comments.js tomonidan admin tugmasi bosilganda dinamik yuklanadi.
   Tablar: Statistika · Foydalanuvchilar · Izohlar · E'lonlar · Sayt · Jurnal
   ========================================================= */
import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
    query, orderBy, limit, serverTimestamp, Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const TMDB_API_KEY = "d76e12be5c55f3c980982a5f51907a97";
const TMDB_BASE = "https://api.themoviedb.org/3";
const MAX_PICKS = 6;

const ANN_COLORS = {
    cyan:   { label: "Firuza",  value: "#4fd8ff" },
    violet: { label: "Binafsha", value: "#9b82ff" },
    gold:   { label: "Oltin",   value: "#ffd166" },
    red:    { label: "Qizil",   value: "#ff6b6b" },
    green:  { label: "Yashil",  value: "#4ade80" }
};
const ANN_ICONS = {
    "ri-megaphone-fill": "Megafon",
    "ri-fire-fill": "Olov",
    "ri-gift-fill": "Sovg'a",
    "ri-alert-fill": "Ogohlantirish",
    "ri-rocket-2-fill": "Raketa",
    "ri-star-fill": "Yulduz"
};
const ACTION_LABEL = {
    role_change: "Rol o'zgartirildi",
    block: "Bloklandi",
    unblock: "Blokdan chiqarildi",
    comment_delete: "Izoh o'chirildi",
    comments_purge: "Foydalanuvchi izohlari o'chirildi",
    announce_add: "E'lon qo'shildi",
    announce_edit: "E'lon tahrirlandi",
    announce_delete: "E'lon o'chirildi",
    announce_push: "E'lon bildirishnoma qilindi",
    donation_edit: "Donat summasi o'zgartirildi",
    maintenance: "Texnik ishlar rejimi",
    picks: "Muharrir tanlovi o'zgartirildi"
};

let ctx = null;
let db = null;
let overlay = null;
let usersCache = null;
let annEditingId = null;
const usersState = { search: "", sort: "lastLogin" };
let commentsSearch = "";
const loadedTabs = new Set();
let activeTab = "stats";
let listeners = [];

const esc = (s) => ctx.escapeHTML(s == null ? "" : String(s));

function fmtDate(ts){
    const d = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : null);
    if (!d) return "—";
    return d.toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function logAction(action, details){
    try {
        await addDoc(collection(db, "audit_log"), {
            action,
            details: String(details || "").slice(0, 300),
            actorUid: ctx.getCurrentUser()?.uid || "",
            createdAt: serverTimestamp()
        });
    } catch (err){
        console.error("[audit] yozishda xato:", err);
    }
}

/* ---------------- foydalanuvchilar ma'lumoti (ommaviy + maxfiy birlashtirilgan) ---------------- */
async function fetchUsers(force){
    if (usersCache && !force) return usersCache;
    const [pubSnap, privSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "user_private"))
    ]);
    const priv = new Map(privSnap.docs.map((d) => [d.id, d.data()]));
    usersCache = pubSnap.docs.map((d) => {
        const u = { uid: d.id, ...d.data(), ...(priv.get(d.id) || {}) };
        u._isSelf = u.email === ctx.AUTHOR_EMAIL;
        u._role = u._isSelf ? "author" : (u.role || (u.email === ctx.MANAGER_DEFAULT_EMAIL ? "manager" : null));
        u._lastMs = u.lastLogin?.toMillis?.() || 0;
        u._createdMs = u.createdAt?.toMillis?.() || 0;
        const until = u.blockedUntil?.toMillis?.() || 0;
        u._blockedNow = !!u.blocked && (!until || until > Date.now());
        return u;
    });
    return usersCache;
}

/* =========================================================
   ASOSIY OYNA
   ========================================================= */
export function openAdminPanel(context){
    ctx = context;
    db = ctx.db;
    if (document.querySelector(".admin-overlay")) return;

    usersCache = null;
    loadedTabs.clear();
    activeTab = "stats";

    overlay = document.createElement("div");
    overlay.className = "admin-overlay";
    overlay.innerHTML = `
        <div class="admin-modal">
            <div class="admin-modal-head">
                <h3><i class="ri-shield-star-fill"></i> Admin panel</h3>
                <button class="admin-close" aria-label="Yopish"><i class="ri-close-line"></i></button>
            </div>
            <div class="admin-tabs" role="tablist">
                <button class="admin-tab is-active" data-tab="stats"><i class="ri-bar-chart-2-fill"></i> Statistika</button>
                <button class="admin-tab" data-tab="users"><i class="ri-team-fill"></i> Foydalanuvchilar</button>
                <button class="admin-tab" data-tab="comments"><i class="ri-chat-3-fill"></i> Izohlar</button>
                <button class="admin-tab" data-tab="announce"><i class="ri-megaphone-fill"></i> E'lonlar</button>
                <button class="admin-tab" data-tab="site"><i class="ri-settings-3-fill"></i> Sayt</button>
                <button class="admin-tab" data-tab="audit"><i class="ri-history-line"></i> Jurnal</button>
            </div>
            <div class="admin-modal-body">
                <div class="admin-pane is-active" data-pane="stats"></div>
                <div class="admin-pane" data-pane="users"></div>
                <div class="admin-pane" data-pane="comments"></div>
                <div class="admin-pane" data-pane="announce"></div>
                <div class="admin-pane" data-pane="site"></div>
                <div class="admin-pane" data-pane="audit"></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
        listeners.forEach(([ev, fn]) => window.removeEventListener(ev, fn));
        listeners = [];
        overlay?.remove();
        overlay = null;
    };
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector(".admin-close").addEventListener("click", close);

    overlay.querySelectorAll(".admin-tab").forEach((btn) => {
        btn.addEventListener("click", () => showTab(btn.dataset.tab));
    });

    // jonli yangilanishlar (izohlar / e'lonlar o'zgarganda ochiq tab qayta chiziladi)
    const onComments = () => { if (overlay && activeTab === "comments") renderCommentsTab(false); };
    const onAnn = () => { if (overlay && activeTab === "announce") renderAnnounceTab(); };
    window.addEventListener("donylogic:comments", onComments);
    window.addEventListener("donylogic:announcements", onAnn);
    listeners.push(["donylogic:comments", onComments], ["donylogic:announcements", onAnn]);

    showTab("stats");
}

function pane(name){ return overlay?.querySelector(`.admin-pane[data-pane="${name}"]`); }

function showTab(name){
    if (!overlay) return;
    activeTab = name;
    overlay.querySelectorAll(".admin-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === name));
    overlay.querySelectorAll(".admin-pane").forEach((p) => p.classList.toggle("is-active", p.dataset.pane === name));

    const loaders = {
        stats: renderStatsTab,
        users: renderUsersTab,
        comments: () => renderCommentsTab(true),
        announce: renderAnnounceTab,
        site: renderSiteTab,
        audit: renderAuditTab
    };
    // statistika, jurnal va foydalanuvchilar har safar yangilanadi; qolganlari birinchi ochilganda
    const alwaysRefresh = ["stats", "audit"];
    if (!loadedTabs.has(name) || alwaysRefresh.includes(name)){
        loadedTabs.add(name);
        loaders[name]();
    }
}

const loadingHTML = (t = "Yuklanmoqda...") => `<p class="admin-loading">${t}</p>`;
const errorHTML = (err) => `<p class="admin-loading">Xatolik: ${esc(err?.message || err)}</p>`;

/* =========================================================
   1) STATISTIKA
   ========================================================= */
async function renderStatsTab(){
    const host = pane("stats");
    host.innerHTML = loadingHTML();
    try {
        const users = await fetchUsers(true);
        const [visitsSnap, regSnap] = await Promise.all([
            getDoc(doc(db, "stats", "visits")),
            getDoc(doc(db, "stats", "registered"))
        ]);
        const now = Date.now();
        const DAY = 86400000;
        const online = users.filter((u) => now - u._lastMs < 5 * 60 * 1000).length;
        const today = users.filter((u) => now - u._lastMs < DAY).length;
        const week = users.filter((u) => now - u._lastMs < 7 * DAY).length;
        const blocked = users.filter((u) => u._blockedNow).length;
        const staff = users.filter((u) => u._role).length;
        const comments = ctx.getComments().length;
        const visits = visitsSnap.exists() ? (visitsSnap.data().count || 0) : 0;

        // so'nggi 14 kunlik ro'yxatdan o'tish grafigi
        const days = [];
        for (let i = 13; i >= 0; i--){
            const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
            days.push({ start: d.getTime(), label: `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`, count: 0 });
        }
        users.forEach((u) => {
            if (!u._createdMs) return;
            for (let i = days.length - 1; i >= 0; i--){
                if (u._createdMs >= days[i].start){ days[i].count++; break; }
            }
        });
        const max = Math.max(1, ...days.map((d) => d.count));
        const signups14 = days.reduce((a, d) => a + d.count, 0);

        const card = (icon, value, label) => `
            <div class="adm-card"><i class="${icon}"></i><strong>${value.toLocaleString("uz-UZ")}</strong><span>${label}</span></div>`;

        host.innerHTML = `
            <div class="adm-cards">
                ${card("ri-team-fill", users.length, "Jami foydalanuvchi")}
                ${card("ri-pulse-fill", online, "Hozir faol (5 daq)")}
                ${card("ri-sun-line", today, "Bugun faol (24 soat)")}
                ${card("ri-calendar-week-line", week, "Haftada faol")}
                ${card("ri-chat-3-fill", comments, "Jami izoh")}
                ${card("ri-eye-fill", visits, "Tashriflar")}
                ${card("ri-shield-user-fill", staff, "Rol egalari")}
                ${card("ri-forbid-fill", blocked, "Bloklangan")}
            </div>
            <div class="admin-section-title"><i class="ri-user-add-line"></i> Oxirgi 14 kun: yangi ro'yxatdan o'tganlar <span class="admin-count-tag">${signups14}</span></div>
            <div class="adm-chart">
                ${days.map((d) => `
                    <div class="adm-chart-col" title="${d.label}: ${d.count} ta">
                        <span class="adm-chart-val">${d.count || ""}</span>
                        <div class="adm-chart-bar" style="height:${Math.max(4, (d.count / max) * 100)}%"></div>
                        <span class="adm-chart-lbl">${d.label}</span>
                    </div>`).join("")}
            </div>
            <p class="admin-note">Ma'lumot ro'yxatdan o'tish sanasi (createdAt) bo'yicha hisoblanadi.${regSnap.exists() ? ` Jonli hisoblagich: ${(regSnap.data().count || 0).toLocaleString("uz-UZ")}.` : ""}</p>
        `;
    } catch (err){
        console.error("[admin] statistika:", err);
        host.innerHTML = errorHTML(err);
    }
}

/* =========================================================
   2) FOYDALANUVCHILAR
   ========================================================= */
async function renderUsersTab(){
    const host = pane("users");
    host.innerHTML = loadingHTML("Foydalanuvchilar yuklanmoqda...");
    try {
        await fetchUsers(true);
        drawUsersTab();
    } catch (err){
        console.error("[admin] foydalanuvchilar:", err);
        host.innerHTML = errorHTML(err);
    }
}

function drawUsersTab(){
    const host = pane("users");
    host.innerHTML = `
        <div class="adm-toolbar">
            <div class="adm-search"><i class="ri-search-line"></i><input type="search" id="admUserSearch" placeholder="Ism yoki email bo'yicha qidirish..." value="${esc(usersState.search)}"></div>
            <select id="admUserSort" class="admin-role-select">
                <option value="lastLogin">Oxirgi faollik</option>
                <option value="createdAt">Ro'yxatdan o'tgan sana</option>
                <option value="name">Ism (A-Z)</option>
            </select>
            <button type="button" class="adm-btn" id="admUserCsv"><i class="ri-download-2-line"></i> CSV</button>
        </div>
        <div id="admUsersTable"></div>
    `;
    host.querySelector("#admUserSort").value = usersState.sort;
    const search = host.querySelector("#admUserSearch");
    search.addEventListener("input", () => { usersState.search = search.value; drawUsersTable(); });
    host.querySelector("#admUserSort").addEventListener("change", (e) => { usersState.sort = e.target.value; drawUsersTable(); });
    host.querySelector("#admUserCsv").addEventListener("click", exportUsersCsv);
    drawUsersTable();
}

function filteredUsers(){
    const q = usersState.search.trim().toLowerCase();
    let list = usersCache.filter((u) => !q || (u.displayName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q));
    const sorters = {
        lastLogin: (a, b) => b._lastMs - a._lastMs,
        createdAt: (a, b) => b._createdMs - a._createdMs,
        name: (a, b) => (a.displayName || "").localeCompare(b.displayName || "")
    };
    return list.sort(sorters[usersState.sort] || sorters.lastLogin);
}

function drawUsersTable(){
    const wrap = pane("users").querySelector("#admUsersTable");
    const users = filteredUsers();
    const now = Date.now();

    const rows = users.map((u) => {
        const online = now - u._lastMs < 5 * 60 * 1000;
        const actions = u._isSelf ? `<span class="admin-self-tag">Siz</span>` : `
            <div class="admin-actions">
                <select class="admin-role-select" data-uid="${u.uid}">
                    <option value="__none__" ${!u._role ? "selected" : ""}>Oddiy foydalanuvchi</option>
                    <option value="manager" ${u._role === "manager" ? "selected" : ""}>Community-manager</option>
                    <option value="admin" ${u._role === "admin" ? "selected" : ""}>Admin</option>
                    <option value="ceo_alfgamex" ${u._role === "ceo_alfgamex" ? "selected" : ""}>CEO of AlfGameX</option>
                </select>
                ${u._blockedNow
                    ? `<button class="admin-block-btn is-blocked" data-act="unblock" data-uid="${u.uid}"><i class="ri-lock-unlock-line"></i> Blokdan chiqarish</button>`
                    : `<button class="admin-block-btn" data-act="block" data-uid="${u.uid}"><i class="ri-forbid-line"></i> Bloklash</button>`}
            </div>`;
        let status = '<span class="admin-status-ok">Faol</span>';
        if (u._blockedNow){
            const until = u.blockedUntil?.toMillis?.();
            status = `<span class="admin-status-blocked">Bloklangan</span>
                <small class="adm-sub">${until ? "gacha: " + fmtDate(u.blockedUntil) : "doimiy"}${u.blockedReason ? " · " + esc(u.blockedReason) : ""}</small>`;
        }
        return `
            <tr class="${u._blockedNow ? "admin-row-blocked" : ""}">
                <td class="admin-cell-user">
                    <img src="${esc(u.photoURL || "")}" alt="" referrerpolicy="no-referrer">
                    <span>${esc(u.displayName || "—")}</span>
                    ${ctx.roleBadgeHTML(u._role)}
                </td>
                <td>${esc(u.email || "—")}</td>
                <td>${fmtDate(u.createdAt)}</td>
                <td><span class="admin-activity-dot ${online ? "is-online" : ""}"></span>${fmtDate(u.lastLogin)}</td>
                <td>${status}</td>
                <td>${actions}</td>
            </tr>`;
    }).join("");

    wrap.innerHTML = `
        <div class="admin-section-title"><i class="ri-team-fill"></i> Foydalanuvchilar <span class="admin-count-tag">${users.length}/${usersCache.length}</span></div>
        <div class="admin-table-wrap">
            <table class="admin-table">
                <thead><tr>
                    <th>Foydalanuvchi</th><th>Email</th><th>Ro'yxatdan o'tgan</th><th>Oxirgi faollik</th><th>Holat</th><th>Amallar</th>
                </tr></thead>
                <tbody>${rows || `<tr><td colspan="6" class="admin-loading">Hech narsa topilmadi.</td></tr>`}</tbody>
            </table>
        </div>`;

    wrap.querySelectorAll(".admin-role-select").forEach((sel) => {
        sel.addEventListener("change", async () => {
            const uid = sel.dataset.uid;
            const u = usersCache.find((x) => x.uid === uid);
            const value = sel.value === "__none__" ? null : sel.value;
            try {
                await updateDoc(doc(db, "users", uid), { role: value, roleNotifyPending: true });
                u.role = value; u._role = value;
                ctx.invalidateRole(uid);
                ctx.rerenderComments();
                logAction("role_change", `${u.displayName || uid} → ${value ? ctx.ROLE_LABEL[value] : "Oddiy foydalanuvchi"}`);
                drawUsersTable();
            } catch (err){
                console.error("[admin] rol o'zgartirishda xato:", err);
                alert("Rolni o'zgartirib bo'lmadi.");
            }
        });
    });
    wrap.querySelectorAll(".admin-block-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const u = usersCache.find((x) => x.uid === btn.dataset.uid);
            if (btn.dataset.act === "block") openBlockDialog(u);
            else unblockUser(u);
        });
    });
}

async function unblockUser(u){
    try {
        await updateDoc(doc(db, "user_private", u.uid), { blocked: false, blockedReason: null, blockedUntil: null });
        u.blocked = false; u.blockedReason = null; u.blockedUntil = null; u._blockedNow = false;
        logAction("unblock", u.displayName || u.uid);
        drawUsersTable();
    } catch (err){
        console.error("[admin] blokdan chiqarishda xato:", err);
        alert("Bajarib bo'lmadi.");
    }
}

function openBlockDialog(u){
    const d = document.createElement("div");
    d.className = "adm-dialog-overlay";
    d.innerHTML = `
        <div class="adm-dialog">
            <h4><i class="ri-forbid-line"></i> ${esc(u.displayName || "Foydalanuvchi")} ni bloklash</h4>
            <label>Sabab (foydalanuvchiga ko'rsatiladi)
                <input type="text" id="blkReason" maxlength="120" placeholder="Masalan: spam yoki haqorat">
            </label>
            <label>Muddat
                <select id="blkDuration" class="admin-role-select">
                    <option value="0">Doimiy</option>
                    <option value="1">1 kun</option>
                    <option value="7">7 kun</option>
                    <option value="30">30 kun</option>
                </select>
            </label>
            <label class="adm-check"><input type="checkbox" id="blkPurge"> Uning barcha izohlarini ham o'chirish</label>
            <div class="adm-dialog-actions">
                <button type="button" class="adm-btn" id="blkCancel">Bekor qilish</button>
                <button type="button" class="adm-btn adm-btn-danger" id="blkConfirm"><i class="ri-forbid-line"></i> Bloklash</button>
            </div>
        </div>`;
    overlay.appendChild(d);
    const closeDlg = () => d.remove();
    d.addEventListener("click", (e) => { if (e.target === d) closeDlg(); });
    d.querySelector("#blkCancel").addEventListener("click", closeDlg);
    d.querySelector("#blkConfirm").addEventListener("click", async () => {
        const reason = d.querySelector("#blkReason").value.trim().slice(0, 120);
        const days = Number(d.querySelector("#blkDuration").value);
        const purge = d.querySelector("#blkPurge").checked;
        const until = days ? Timestamp.fromMillis(Date.now() + days * 86400000) : null;
        try {
            await updateDoc(doc(db, "user_private", u.uid), { blocked: true, blockedReason: reason || null, blockedUntil: until });
            u.blocked = true; u.blockedReason = reason || null; u.blockedUntil = until; u._blockedNow = true;
            logAction("block", `${u.displayName || u.uid} · ${days ? days + " kun" : "doimiy"}${reason ? " · " + reason : ""}`);
            if (purge) await purgeUserComments(u);
            closeDlg();
            drawUsersTable();
        } catch (err){
            console.error("[admin] bloklashda xato:", err);
            alert("Bloklab bo'lmadi.");
        }
    });
}

async function purgeUserComments(u){
    const own = ctx.getComments().filter((c) => c.uid === u.uid);
    if (!own.length) return;
    const ids = collectWithReplies(own.map((c) => c.id));
    await deleteMany(ids);
    logAction("comments_purge", `${u.displayName || u.uid}: ${ids.length} ta`);
}

// izoh + uning barcha javoblarini (rekursiv) yig'adi — yetim javoblar qolmasligi uchun
function collectWithReplies(rootIds){
    const all = ctx.getComments();
    const out = new Set(rootIds);
    let grew = true;
    while (grew){
        grew = false;
        all.forEach((c) => {
            if (c.parentId && out.has(c.parentId) && !out.has(c.id)){ out.add(c.id); grew = true; }
        });
    }
    return [...out];
}

async function deleteMany(ids){
    for (let i = 0; i < ids.length; i += 400){
        const batch = writeBatch(db);
        ids.slice(i, i + 400).forEach((id) => batch.delete(doc(db, "comments", id)));
        await batch.commit();
    }
}

function exportUsersCsv(){
    const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const rows = [["Ism", "Email", "Rol", "Ro'yxatdan o'tgan", "Oxirgi faollik", "Holat"]];
    filteredUsers().forEach((u) => {
        rows.push([u.displayName, u.email, u._role ? ctx.ROLE_LABEL[u._role] : "", fmtDate(u.createdAt), fmtDate(u.lastLogin), u._blockedNow ? "Bloklangan" : "Faol"]);
    });
    const csv = "\ufeff" + rows.map((r) => r.map(q).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `donylogic-foydalanuvchilar-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* =========================================================
   3) IZOHLAR MODERATSIYASI
   ========================================================= */
function renderCommentsTab(rebuild){
    const host = pane("comments");
    if (rebuild || !host.querySelector("#admCommentSearch")){
        host.innerHTML = `
            <div class="adm-toolbar">
                <div class="adm-search"><i class="ri-search-line"></i><input type="search" id="admCommentSearch" placeholder="Izoh matni yoki muallif ismi..." value="${esc(commentsSearch)}"></div>
            </div>
            <div id="admCommentList"></div>`;
        host.querySelector("#admCommentSearch").addEventListener("input", (e) => { commentsSearch = e.target.value; drawCommentList(); });
    }
    drawCommentList();
}

function drawCommentList(){
    const list = pane("comments").querySelector("#admCommentList");
    if (!list) return;
    const q = commentsSearch.trim().toLowerCase();
    const all = ctx.getComments().slice().reverse();
    const shown = all.filter((c) => !q || (c.text || "").toLowerCase().includes(q) || (c.name || "").toLowerCase().includes(q)).slice(0, 200);

    list.innerHTML = `
        <div class="admin-section-title"><i class="ri-chat-3-fill"></i> Izohlar <span class="admin-count-tag">${shown.length}/${all.length}</span></div>
        ${shown.length ? shown.map((c) => {
            const created = c.createdAt?.toDate ? c.createdAt.toDate() : null;
            return `
            <div class="adm-comment">
                <img src="${esc(c.photo || "")}" alt="" referrerpolicy="no-referrer">
                <div class="adm-comment-body">
                    <div class="adm-comment-top"><strong>${esc(c.name || "Foydalanuvchi")}</strong>${c.parentId ? '<span class="adm-tag">javob</span>' : ""}<span class="adm-sub">${created ? created.toLocaleString("uz-UZ") : ""}</span></div>
                    <p>${esc(c.text || "")}</p>
                </div>
                <button class="adm-icon-btn adm-del-comment" data-id="${c.id}" title="O'chirish"><i class="ri-delete-bin-6-line"></i></button>
            </div>`;
        }).join("") : `<p class="admin-loading">Izoh topilmadi.</p>`}`;

    list.querySelectorAll(".adm-del-comment").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const c = ctx.getComments().find((x) => x.id === btn.dataset.id);
            if (!c) return;
            const ids = collectWithReplies([c.id]);
            const extra = ids.length > 1 ? `\n(unga yozilgan ${ids.length - 1} ta javob ham o'chadi)` : "";
            if (!confirm(`${c.name || "Foydalanuvchi"} izohini o'chirasizmi?${extra}`)) return;
            try {
                await deleteMany(ids);
                logAction("comment_delete", `${c.name || c.uid}: "${(c.text || "").slice(0, 60)}"`);
            } catch (err){
                console.error("[admin] izohni o'chirishda xato:", err);
                alert("O'chirib bo'lmadi.");
            }
        });
    });
}

/* =========================================================
   4) E'LONLAR
   ========================================================= */
function annExpired(a){
    const ms = a.expiresAt?.toMillis?.();
    return !!ms && ms <= Date.now();
}

function renderAnnounceTab(){
    const host = pane("announce");
    const items = ctx.getAnnouncements();
    const colorOpts = Object.entries(ANN_COLORS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");
    const iconOpts = Object.entries(ANN_ICONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");

    // forma qayta chizilganda yozilayotgan matn yo'qolmasligi uchun
    const prevText = host.querySelector("#annText")?.value || "";

    host.innerHTML = `
        <div class="admin-section-title"><i class="ri-megaphone-fill"></i> Yangi e'lon <span class="admin-count-tag">${items.length}/${ctx.MAX_ANNOUNCEMENTS}</span></div>
        <form class="announcement-form adm-ann-form">
            <input type="text" id="annText" maxlength="200" placeholder="E'lon matni (200 belgigacha)..." required value="${esc(prevText)}">
            <div class="adm-ann-opts">
                <select id="annColor" class="admin-role-select" title="Rang">${colorOpts}</select>
                <select id="annIcon" class="admin-role-select" title="Ikonka">${iconOpts}</select>
                <select id="annExpiry" class="admin-role-select" title="Amal qilish muddati">
                    <option value="0">Muddatsiz</option>
                    <option value="1h">1 soat</option>
                    <option value="1d">1 kun</option>
                    <option value="7d">7 kun</option>
                    <option value="30d">30 kun</option>
                </select>
                <button type="submit" class="btn btn-primary"><i class="ri-send-plane-2-line"></i> <span>E'lon qilish</span></button>
            </div>
        </form>
        <p class="admin-note">6-e'lon qo'shilganda avval muddati tugaganlar, keyin eng eskisi avtomatik o'chadi.</p>
        <div class="announcement-admin-list">${items.length ? items.slice().reverse().map(annItemHTML).join("") : `<p class="announcement-admin-empty">Hozircha e'lonlar yo'q.</p>`}</div>`;

    host.querySelector(".adm-ann-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector("button[type=submit]");
        await postAnnouncement({
            text: host.querySelector("#annText").value,
            color: host.querySelector("#annColor").value,
            icon: host.querySelector("#annIcon").value,
            expiry: host.querySelector("#annExpiry").value
        }, btn);
        host.querySelector("#annText").value = "";
    });

    host.querySelectorAll("[data-ann-act]").forEach((btn) => {
        btn.addEventListener("click", () => annAction(btn.dataset.annAct, btn.dataset.id, btn));
    });
    const saveForm = host.querySelector(".adm-ann-edit");
    if (saveForm){
        saveForm.addEventListener("submit", (e) => { e.preventDefault(); saveAnnouncementEdit(saveForm); });
        saveForm.querySelector("[data-cancel]").addEventListener("click", () => { annEditingId = null; renderAnnounceTab(); });
    }
}

function annItemHTML(a){
    const created = a.createdAt?.toDate ? a.createdAt.toDate() : null;
    const color = (ANN_COLORS[a.color] || ANN_COLORS.cyan).value;
    const expired = annExpired(a);
    const expTxt = a.expiresAt?.toDate ? (expired ? "muddati tugagan" : "gacha: " + fmtDate(a.expiresAt)) : "muddatsiz";

    if (annEditingId === a.id){
        return `
        <form class="adm-ann-edit announcement-admin-item" data-id="${a.id}">
            <input type="text" maxlength="200" value="${esc(a.text || "")}" required>
            <select class="admin-role-select" data-field="color">${Object.entries(ANN_COLORS).map(([k, v]) => `<option value="${k}" ${k === (a.color || "cyan") ? "selected" : ""}>${v.label}</option>`).join("")}</select>
            <select class="admin-role-select" data-field="icon">${Object.entries(ANN_ICONS).map(([k, v]) => `<option value="${k}" ${k === (a.icon || "ri-megaphone-fill") ? "selected" : ""}>${v}</option>`).join("")}</select>
            <button type="submit" class="adm-icon-btn is-ok" title="Saqlash"><i class="ri-check-line"></i></button>
            <button type="button" class="adm-icon-btn" data-cancel title="Bekor qilish"><i class="ri-close-line"></i></button>
        </form>`;
    }
    return `
        <div class="announcement-admin-item${expired ? " is-expired" : ""}" data-id="${a.id}">
            <i class="${esc(a.icon || "ri-megaphone-fill")}" style="color:${color}"></i>
            <span class="announcement-admin-text">${esc(a.text || "")}</span>
            <span class="announcement-admin-time">${created ? ctx.timeAgo(created) : ""} · ${expTxt}</span>
            <button class="announcement-admin-notify" data-ann-act="push" data-id="${a.id}" title="Bildirishnoma qilib yuborish"><i class="ri-notification-3-line"></i></button>
            <button class="announcement-admin-notify" data-ann-act="edit" data-id="${a.id}" title="Tahrirlash"><i class="ri-edit-line"></i></button>
            <button class="announcement-admin-delete" data-ann-act="delete" data-id="${a.id}" title="O'chirish"><i class="ri-delete-bin-6-line"></i></button>
        </div>`;
}

async function postAnnouncement(opts, btn){
    const text = (opts.text || "").trim();
    if (!text) return;
    if (btn) btn.disabled = true;
    try {
        let items = ctx.getAnnouncements();
        // 1) muddati tugaganlarni tozalaymiz
        const expired = items.filter(annExpired);
        if (expired.length){
            await Promise.all(expired.map((a) => deleteDoc(doc(db, "announcements", a.id))));
            items = items.filter((a) => !annExpired(a));
        }
        // 2) hali 5 ta bo'lsa — eng eskisini o'chiramiz
        if (items.length >= ctx.MAX_ANNOUNCEMENTS){
            const toRemove = items.slice(0, items.length - ctx.MAX_ANNOUNCEMENTS + 1);
            await Promise.all(toRemove.map((a) => deleteDoc(doc(db, "announcements", a.id))));
        }
        const spans = { "1h": 3600000, "1d": 86400000, "7d": 7 * 86400000, "30d": 30 * 86400000 };
        const expiresAt = spans[opts.expiry] ? Timestamp.fromMillis(Date.now() + spans[opts.expiry]) : null;
        await addDoc(collection(db, "announcements"), {
            text: text.slice(0, 200),
            color: ANN_COLORS[opts.color] ? opts.color : "cyan",
            icon: ANN_ICONS[opts.icon] ? opts.icon : "ri-megaphone-fill",
            expiresAt,
            createdAt: serverTimestamp()
        });
        logAction("announce_add", text.slice(0, 80));
    } catch (err){
        console.error("[admin] e'lon qo'shishda xato:", err);
        alert("E'lonni qo'shib bo'lmadi.");
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function annAction(act, id, btn){
    const a = ctx.getAnnouncements().find((x) => x.id === id);
    if (!a) return;
    try {
        if (act === "delete"){
            if (!confirm("Bu e'lonni o'chirasizmi?")) return;
            await deleteDoc(doc(db, "announcements", id));
            logAction("announce_delete", (a.text || "").slice(0, 80));
        } else if (act === "edit"){
            annEditingId = id;
            renderAnnounceTab();
        } else if (act === "push"){
            btn.disabled = true;
            await updateDoc(doc(db, "announcements", id), { notifiedAt: serverTimestamp() });
            logAction("announce_push", (a.text || "").slice(0, 80));
            btn.classList.add("is-sent");
            btn.innerHTML = '<i class="ri-check-line"></i>';
            setTimeout(() => { if (btn.isConnected){ btn.classList.remove("is-sent"); btn.innerHTML = '<i class="ri-notification-3-line"></i>'; btn.disabled = false; } }, 1800);
        }
    } catch (err){
        console.error("[admin] e'lon amali xatosi:", err);
        alert("Bajarib bo'lmadi.");
        if (btn) btn.disabled = false;
    }
}

async function saveAnnouncementEdit(form){
    const id = form.dataset.id;
    const text = form.querySelector("input[type=text]").value.trim();
    if (!text) return;
    try {
        await updateDoc(doc(db, "announcements", id), {
            text: text.slice(0, 200),
            color: form.querySelector('[data-field="color"]').value,
            icon: form.querySelector('[data-field="icon"]').value
        });
        logAction("announce_edit", text.slice(0, 80));
        annEditingId = null;
        renderAnnounceTab();
    } catch (err){
        console.error("[admin] e'lonni saqlashda xato:", err);
        alert("Saqlab bo'lmadi.");
    }
}

/* =========================================================
   5) SAYT: donat · texnik ishlar · muharrir tanlovi
   ========================================================= */
async function renderSiteTab(){
    const host = pane("site");
    host.innerHTML = loadingHTML();
    try {
        const [donSnap, mntSnap, pickSnap] = await Promise.all([
            getDoc(doc(db, "stats", "donations")),
            getDoc(doc(db, "site_config", "maintenance")),
            getDoc(doc(db, "site_config", "picks"))
        ]);
        const don = donSnap.exists() ? donSnap.data() : {};
        const mnt = mntSnap.exists() ? mntSnap.data() : {};
        let picks = pickSnap.exists() ? (pickSnap.data().ids || []) : [];

        host.innerHTML = `
            <div class="admin-section">
                <div class="admin-section-title"><i class="ri-hand-heart-fill"></i> Donat summasi</div>
                <form class="adm-row-form" id="donForm">
                    <input type="number" min="0" step="1" id="donTotal" placeholder="Jami summa" value="${Number(don.total || 0)}" required>
                    <input type="text" id="donCur" maxlength="12" placeholder="Valyuta" value="${esc(don.currency || "so'm")}">
                    <button type="submit" class="adm-btn adm-btn-primary"><i class="ri-save-line"></i> Saqlash</button>
                </form>
            </div>
            <hr class="admin-divider">
            <div class="admin-section">
                <div class="admin-section-title"><i class="ri-tools-fill"></i> Texnik ishlar banneri</div>
                <form class="adm-row-form" id="mntForm">
                    <label class="adm-check"><input type="checkbox" id="mntOn" ${mnt.enabled ? "checked" : ""}> Yoqilgan</label>
                    <input type="text" id="mntText" maxlength="160" placeholder="Banner matni" value="${esc(mnt.text || "Saytda texnik ishlar olib borilmoqda. Ba'zi funksiyalar vaqtincha ishlamasligi mumkin.")}">
                    <button type="submit" class="adm-btn adm-btn-primary"><i class="ri-save-line"></i> Saqlash</button>
                </form>
            </div>
            <hr class="admin-divider">
            <div class="admin-section">
                <div class="admin-section-title"><i class="ri-film-fill"></i> Muharrir tanlovi (kino karuseli) <span class="admin-count-tag" id="pickCount">${picks.length}/${MAX_PICKS}</span></div>
                <div id="pickList" class="adm-picks"></div>
                <div class="adm-search"><i class="ri-search-line"></i><input type="search" id="pickSearch" placeholder="Film nomini qidiring va qo'shing..."></div>
                <div id="pickResults" class="adm-pick-results"></div>
                <p class="admin-note">Tanlangan filmlar kino sahifasidagi karuselda birinchi bo'lib ko'rinadi.</p>
            </div>`;

        host.querySelector("#donForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const total = Math.max(0, Math.round(Number(host.querySelector("#donTotal").value) || 0));
            const currency = host.querySelector("#donCur").value.trim() || "so'm";
            try {
                await setDoc(doc(db, "stats", "donations"), { total, currency });
                logAction("donation_edit", `${total.toLocaleString("uz-UZ")} ${currency}`);
                flash(e.target, "Saqlandi ✓");
            } catch (err){ console.error(err); alert("Saqlab bo'lmadi."); }
        });

        host.querySelector("#mntForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const enabled = host.querySelector("#mntOn").checked;
            const text = host.querySelector("#mntText").value.trim().slice(0, 160);
            try {
                await setDoc(doc(db, "site_config", "maintenance"), { enabled, text, updatedAt: serverTimestamp() });
                logAction("maintenance", enabled ? `Yoqildi: ${text}` : "O'chirildi");
                flash(e.target, "Saqlandi ✓");
            } catch (err){ console.error(err); alert("Saqlab bo'lmadi."); }
        });

        const savePicks = async () => {
            await setDoc(doc(db, "site_config", "picks"), { ids: picks, updatedAt: serverTimestamp() });
            logAction("picks", `${picks.length} ta film`);
        };
        const titleCache = new Map();
        const getTitle = async (id) => {
            if (titleCache.has(id)) return titleCache.get(id);
            try {
                const r = await fetch(`${TMDB_BASE}/movie/${id}?api_key=${TMDB_API_KEY}&language=uz-UZ`);
                const m = await r.json();
                const t = `${m.title || "ID " + id}${m.release_date ? " (" + m.release_date.slice(0, 4) + ")" : ""}`;
                titleCache.set(id, t);
                return t;
            } catch { return `ID ${id}`; }
        };
        const drawPicks = async () => {
            host.querySelector("#pickCount").textContent = `${picks.length}/${MAX_PICKS}`;
            const titles = await Promise.all(picks.map(getTitle));
            const el = host.querySelector("#pickList");
            if (!el) return;
            el.innerHTML = picks.length ? picks.map((id, i) => `
                <div class="adm-pick"><span>${i + 1}. ${esc(titles[i])}</span><button type="button" class="adm-icon-btn" data-rm="${id}" title="Olib tashlash"><i class="ri-close-line"></i></button></div>`).join("")
                : `<p class="announcement-admin-empty">Hali tanlanmagan — karusel faqat trend filmlarni ko'rsatadi.</p>`;
            el.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", async () => {
                picks = picks.filter((x) => x !== Number(b.dataset.rm));
                try { await savePicks(); } catch (err){ console.error(err); alert("Saqlab bo'lmadi."); }
                drawPicks();
            }));
        };
        drawPicks();

        let t = null;
        host.querySelector("#pickSearch").addEventListener("input", (e) => {
            clearTimeout(t);
            const q = e.target.value.trim();
            const box = host.querySelector("#pickResults");
            if (q.length < 2){ box.innerHTML = ""; return; }
            t = setTimeout(async () => {
                try {
                    const r = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&language=uz-UZ&query=${encodeURIComponent(q)}&include_adult=false`);
                    const data = await r.json();
                    const res = (data.results || []).filter((m) => m.backdrop_path).slice(0, 6);
                    box.innerHTML = res.length ? res.map((m) => `
                        <div class="adm-pick"><span>${esc(m.title)}${m.release_date ? " (" + m.release_date.slice(0, 4) + ")" : ""}</span>
                        <button type="button" class="adm-icon-btn is-ok" data-add="${m.id}" title="Qo'shish"><i class="ri-add-line"></i></button></div>`).join("")
                        : `<p class="announcement-admin-empty">Hech narsa topilmadi (faqat orqa fon rasmi bor filmlar ko'rsatiladi).</p>`;
                    box.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", async () => {
                        const id = Number(b.dataset.add);
                        if (picks.includes(id)) return;
                        if (picks.length >= MAX_PICKS){ alert(`Ko'pi bilan ${MAX_PICKS} ta film tanlash mumkin.`); return; }
                        picks.push(id);
                        try { await savePicks(); } catch (err){ console.error(err); alert("Saqlab bo'lmadi."); picks.pop(); }
                        drawPicks();
                    }));
                } catch (err){ console.error(err); box.innerHTML = `<p class="announcement-admin-empty">Qidirishda xatolik.</p>`; }
            }, 350);
        });
    } catch (err){
        console.error("[admin] sayt sozlamalari:", err);
        host.innerHTML = errorHTML(err);
    }
}

function flash(form, text){
    let tag = form.querySelector(".adm-flash");
    if (!tag){ tag = document.createElement("span"); tag.className = "adm-flash"; form.appendChild(tag); }
    tag.textContent = text;
    setTimeout(() => tag.remove(), 2000);
}

/* =========================================================
   6) HARAKATLAR JURNALI
   ========================================================= */
async function renderAuditTab(){
    const host = pane("audit");
    host.innerHTML = loadingHTML();
    try {
        const snap = await getDocs(query(collection(db, "audit_log"), orderBy("createdAt", "desc"), limit(100)));
        host.innerHTML = `
            <div class="admin-section-title"><i class="ri-history-line"></i> So'nggi harakatlar <span class="admin-count-tag">${snap.size}</span></div>
            ${snap.size ? snap.docs.map((d) => {
                const a = d.data();
                return `
                <div class="adm-audit">
                    <span class="adm-audit-time">${fmtDate(a.createdAt)}</span>
                    <span class="adm-tag">${esc(ACTION_LABEL[a.action] || a.action)}</span>
                    <span class="adm-audit-text">${esc(a.details || "")}</span>
                </div>`;
            }).join("") : `<p class="admin-loading">Jurnal hozircha bo'sh.</p>`}`;
    } catch (err){
        console.error("[admin] jurnal:", err);
        host.innerHTML = errorHTML(err);
    }
}
