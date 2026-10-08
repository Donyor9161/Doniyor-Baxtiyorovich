/* =========================================================
   DONYLOGIC — Google/GitHub login + Fikrlar + Rollar + Admin panel (Firebase)
   ========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signInAnonymously,
    signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc,
    onSnapshot, query, orderBy, where, serverTimestamp, Timestamp,
    runTransaction, writeBatch
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDiocHJNETksW_WJcrd6CGJfIhA-RK0RMQ",
    authDomain: "donylogic-12f4b.firebaseapp.com",
    projectId: "donylogic-12f4b",
    storageBucket: "donylogic-12f4b.firebasestorage.app",
    messagingSenderId: "661119368716",
    appId: "1:661119368716:web:22c57597f1e523995ff829"
};

const PRUNE_AFTER_DAYS = 120;
const PRUNE_CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
const HEARTBEAT_MS = 90 * 1000;                 // "oxirgi faollik"ni yangilab turish
const AUTHOR_EMAIL  = "donylogicstudios@gmail.com"; // loyiha muallifi — o'zgarmas
const MANAGER_DEFAULT_EMAIL = "qwdonyor@gmail.com"; // birinchi community-manager (standart)
const MAX_ANNOUNCEMENTS = 5;
const ANNOUNCEMENT_ROTATE_MS = 3600; // 0.6s kirish animatsiyasi + 3s o'rtada turish
const notifiedAnnouncementKeys = new Set(); // "id:millis" — bir xil push'ni ikki marta ko'rsatmaslik uchun
let announcementsFirstLoad = true; // birinchi yuklanishda eski notifiedAt'lar uchun push chiqmasin

const ROLE_LABEL = { author: "CEO of DONYLOGIC™", ceo_alfgamex: "CEO of AlfGameX", admin: "Admin", manager: "Community-manager" };
const ROLE_ICON  = { author: "ri-vip-crown-2-fill", ceo_alfgamex: "ri-gamepad-fill", admin: "ri-shield-star-fill", manager: "ri-shield-user-fill" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

console.info("[donylogic] comments.js yuklandi ✅");

/* ---------------- DOM refs ---------------- */
const googleLoginBtn = document.getElementById("googleLoginBtn");
const githubLoginBtn = document.getElementById("githubLoginBtn");
const userProfile    = document.getElementById("userProfile");
const userAvatar     = document.getElementById("userAvatar");
const userName       = document.getElementById("userName");
const logoutBtn      = document.getElementById("logoutBtn");
const commentForm    = document.getElementById("commentForm");
const commentText    = document.getElementById("commentText");
const commentsHint   = document.getElementById("commentsHint");
const commentsList   = document.getElementById("commentsList");
const registeredCountEl = document.getElementById("registeredCount");
const visitsCountEl     = document.getElementById("visitsCount");
const donationsTotalEl  = document.getElementById("donationsTotal");
const commentsCountEl   = document.getElementById("commentsCount");
const adminPanelBtn     = document.getElementById("adminPanelBtn");
const notifyToggleBtn   = document.getElementById("notifyToggleBtn");
const announcementBar   = document.getElementById("announcementBar");
const announcementStage  = document.getElementById("announcementStage");
let currentSlide = null;

let currentUser = null;
let currentUserRole = null;   // 'author' | 'admin' | 'manager' | null
let currentUserBlocked = false;
let currentBlockMessage = "";
let allComments = [];
let heartbeatTimer = null;
let allAnnouncements = [];
let announcementRotateTimer = null;
let announcementIndex = 0;

/* ---------------- rol aniqlash (har doim /users hujjatidan, spoofing imkonsiz) ----------------
   Eslatma: rol endi email bilan emas — hujjat yaratilgan paytda Firestore qoidasi
   tasdiqlangan auth tokenidagi email bo'yicha serverda tekshirilib yoziladi (pastga qarang). */
const roleCache = new Map(); // uid -> role|null

async function resolveRole(uid){
    if (roleCache.has(uid)) return roleCache.get(uid);
    try {
        const snap = await getDoc(doc(db, "users", uid));
        const role = snap.exists() ? (snap.data().role || null) : null;
        roleCache.set(uid, role);
        return role;
    } catch (err){
        console.error("[rol] aniqlashda xato:", err);
        return null;
    }
}
// Admin panel faqat muallifning GOOGLE orqali kirgan akkaunti uchun
function isAuthorGoogle(user){
    return !!user
        && user.email === AUTHOR_EMAIL
        && user.emailVerified === true
        && user.providerData.some((p) => p.providerId === "google.com");
}

function invalidateRole(uid){
    roleCache.delete(uid);
}

function roleBadgeHTML(role){
    if (!role) return "";
    return `<span class="role-badge role-badge-${role}"><i class="${ROLE_ICON[role]}"></i> ${ROLE_LABEL[role]}</span>`;
}

/* ---------------- bildirishnoma ruxsati (Notification API) ----------------
   Eslatma: bu faqat sayt ochiq turgan (yoki fon tabida) brauzerlarga ishlaydi.
   Yopilgan brauzerga push yuborish uchun Firebase Cloud Messaging + Cloud
   Function kerak bo'ladi — bu esa Blaze rejasi va alohida server kodi talab qiladi. */
function updateNotifyBtnUI(){
    if (!notifyToggleBtn || !("Notification" in window)) { if (notifyToggleBtn) notifyToggleBtn.hidden = true; return; }
    const perm = Notification.permission;
    notifyToggleBtn.innerHTML = perm === "granted"
        ? '<i class="ri-notification-3-fill"></i>'
        : '<i class="ri-notification-off-line"></i>';
    notifyToggleBtn.classList.toggle("is-on", perm === "granted");
    notifyToggleBtn.title = perm === "granted"
        ? "Bildirishnomalar yoqilgan"
        : "Bildirishnomalarni yoqish";
}
notifyToggleBtn?.addEventListener("click", async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted"){
        alert("Bildirishnomalar allaqachon yoqilgan. O'chirish uchun brauzer sozlamalaridan foydalaning.");
        return;
    }
    try {
        await Notification.requestPermission();
    } catch (err){
        console.error("[bildirishnoma] ruxsat so'rashda xato:", err);
    }
    updateNotifyBtnUI();
});
updateNotifyBtnUI();

/* ---------------- auth: popup flow ---------------- */
let justLoggedIn = false;

googleLoginBtn?.addEventListener("click", () => loginWith(provider, "Google"));
githubLoginBtn?.addEventListener("click", () => loginWith(githubProvider, "GitHub"));

async function loginWith(authProvider, label){
    try {
        const result = await signInWithPopup(auth, authProvider);
        if (result?.user) justLoggedIn = true;
    } catch (err){
        console.error(`[fikrlar] ${label} login xatosi:`, err.code, err.message);
        if (err.code === "auth/account-exists-with-different-credential"){
            alert("Bu email boshqa usul orqali allaqachon ro'yxatdan o'tgan. O'sha usul bilan kiring.");
        } else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request"){
            alert("Kirishda xatolik yuz berdi. Qayta urinib ko'ring.");
        }
    }
}

logoutBtn?.addEventListener("click", async () => {
    try { await signOut(auth); }
    catch (err){ console.error("[fikrlar] chiqish xatosi:", err); }
});

onAuthStateChanged(auth, (user) => {
    if (heartbeatTimer){ clearInterval(heartbeatTimer); heartbeatTimer = null; }

    if (!user){
        signInAnonymously(auth).catch((err) => {
            console.error("[hisoblagich] anonim kirishda xato:", err);
        });
        return;
    }

    // Izoh/login UI faqat shu elementlar mavjud bo'lgan sahifada (masalan index.html) ishlaydi.
    // Boshqa sahifalarda (masalan kino.html) bu elementlar yo'q — xatoga yo'l qo'ymaymiz,
    // chunki admin tugmasi va e'lonlar karuseli baribir ishlashi kerak.
    const hasCommentUI = !!(googleLoginBtn && githubLoginBtn && userProfile && userAvatar && userName && commentForm && commentsHint);

    if (user.isAnonymous){
        currentUser = null;
        currentUserRole = null;
        currentUserBlocked = false;
        if (hasCommentUI){
            googleLoginBtn.hidden = false;
            githubLoginBtn.hidden = false;
            userProfile.hidden = true;
            userProfile.classList.remove("is-author", "is-admin", "is-manager");
            commentForm.hidden = true;
            commentsHint.hidden = false;
            commentsHint.textContent = "Fikr qoldirish uchun avval Google yoki GitHub bilan kiring.";
        }
        if (adminPanelBtn) adminPanelBtn.hidden = true;
        renderComments();
    } else {
        currentUser = user;
        if (hasCommentUI){
            googleLoginBtn.hidden = true;
            githubLoginBtn.hidden = true;
            userProfile.hidden = false;
            userAvatar.src = user.photoURL || "";
            userName.textContent = user.displayName || "Foydalanuvchi";
        }

        syncUserProfile(user).then(async ({ }) => {
            invalidateRole(user.uid);
            currentUserRole = await resolveRole(user.uid);
            if (isAuthorGoogle(user)) currentUserRole = "author";
            const privateSnap = await getDoc(doc(db, "user_private", user.uid));
            const pdata = privateSnap.exists() ? privateSnap.data() : {};
            const untilMs = pdata.blockedUntil?.toMillis?.() || 0;
            // muddatli blok: muddat o'tgach avtomatik bekor bo'ladi
            currentUserBlocked = !!pdata.blocked && (!untilMs || untilMs > Date.now());
            currentBlockMessage = currentUserBlocked ? buildBlockMessage(pdata, untilMs) : "";

            const publicSnap = await getDoc(doc(db, "users", user.uid));
            const publicData = publicSnap.exists() ? publicSnap.data() : {};

            applyOwnRoleUI();

            if (adminPanelBtn) adminPanelBtn.hidden = !isAuthorGoogle(user);

            if (justLoggedIn){
                celebrateLogin();
                justLoggedIn = false;
            }

            // rol o'zgargani haqida BIR MARTALIK xabar (admin panelidan rol o'zgartirilganda belgilanadi)
            if (publicData.roleNotifyPending){
                showRoleChangeToast(currentUserRole);
                setDoc(doc(db, "users", user.uid), { roleNotifyPending: false }, { merge: true })
                    .catch((err) => console.error("[rol-xabar] belgilashda xato:", err));
            }

            renderComments();
        }).catch((err) => {
            console.error("[profil] sinxronlashda xatolik:", err);
        });

        maybePruneOldComments();
        heartbeatTimer = setInterval(() => {
            setDoc(doc(db, "user_private", user.uid), { lastLogin: serverTimestamp() }, { merge: true })
                .catch((err) => console.error("[heartbeat] yangilashda xato:", err));
        }, HEARTBEAT_MS);
    }

    countVisitOnce();
    renderComments();
});

function buildBlockMessage(pdata, untilMs){
    let msg = "Siz saytda izoh qoldirishdan bloklangansiz";
    if (untilMs) msg += ` (${new Date(untilMs).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })} gacha)`;
    if (pdata.blockedReason) msg += `. Sabab: ${pdata.blockedReason}`;
    return msg + ".";
}

/* ---------------- texnik ishlar banneri (admin paneldan yoqiladi) ---------------- */
try {
    onSnapshot(doc(db, "site_config", "maintenance"), (snap) => {
        let banner = document.getElementById("maintenanceBanner");
        const data = snap.exists() ? snap.data() : null;
        if (!data || !data.enabled || !data.text){
            banner?.remove();
            return;
        }
        if (!banner){
            banner = document.createElement("div");
            banner.id = "maintenanceBanner";
            banner.className = "maintenance-banner";
            banner.setAttribute("role", "status");
            document.body.prepend(banner);
        }
        banner.innerHTML = `<i class="ri-tools-fill"></i><span></span>`;
        banner.querySelector("span").textContent = data.text;
    }, (err) => console.error("[texnik-ishlar] o'qishda xatolik:", err));
} catch (err){ console.error("[texnik-ishlar] ulanishda xatolik:", err); }

function applyOwnRoleUI(){
    if (!userProfile || !userName || !commentForm || !commentsHint) return; // kino.html kabi sahifalarda bu elementlar yo'q
    const existingBadge = userProfile.querySelector(".role-badge");
    if (existingBadge) existingBadge.remove();
    if (currentUserRole){
        userName.insertAdjacentHTML("afterend", roleBadgeHTML(currentUserRole));
    }

    // navbardagi profil chipi — muallif/admin/manager uchun "premium" porlash
    userProfile.classList.remove("is-author", "is-admin", "is-manager");
    if (currentUserRole){
        userProfile.classList.add(`is-${currentUserRole}`);
    }

    if (currentUserBlocked){
        commentForm.hidden = true;
        commentsHint.hidden = false;
        commentsHint.textContent = currentBlockMessage || "Siz saytda izoh qoldirishdan bloklangansiz.";
    } else {
        commentForm.hidden = false;
        commentsHint.hidden = true;
    }
}

/* ---------------- visits (everyone, logged in or not) ---------------- */
function countVisitOnce(){
    if (sessionStorage.getItem("donylogic_visit_counted")) return;
    sessionStorage.setItem("donylogic_visit_counted", "1");
    incrementCounter("visits");
}

async function incrementCounter(statId){
    const ref = doc(db, "stats", statId);
    try {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            const current = snap.exists() ? (snap.data().count || 0) : 0;
            tx.set(ref, { count: current + 1 });
        });
    } catch (err){
        console.error(`[hisoblagich] ${statId} yangilashda xato:`, err);
    }
}

/* ---------------- profil yaratish/yangilash + ro'yxatdan o'tganlar hisoblagichi ---------------- */
async function syncUserProfile(user){
    const userRef = doc(db, "users", user.uid);
    const privateRef = doc(db, "user_private", user.uid);
    const existing = await getDoc(userRef);

    // Rol faqat quyida taklif qilinadi — Firestore qoidasi buni haqiqiy,
    // tasdiqlangan auth token emailiga qarab serverda tasdiqlaydi yoki rad etadi.
    const proposedRole = user.email === AUTHOR_EMAIL
        ? "author"
        : (user.email === MANAGER_DEFAULT_EMAIL ? "manager" : null);

    if (existing.exists()){
        // Har bir qadam alohida try/catch ichida: bittasi muvaffaqiyatsiz bo'lsa ham
        // qolgan UI (izoh formasi, admin tugmasi) ishlashda davom etadi.
        try {
            await setDoc(userRef, {
                displayName: user.displayName || "Foydalanuvchi",
                photoURL: user.photoURL || ""
            }, { merge: true });
        } catch (err){ console.error("[profil] ommaviy profilni yangilashda xato:", err); }

        try {
            const privSnap = await getDoc(privateRef);
            if (!privSnap.exists()){
                // Maxfiylik yangilanishidan OLDIN ro'yxatdan o'tgan foydalanuvchilar uchun
                // yopiq hujjatni birinchi kirishda yaratamiz.
                await setDoc(privateRef, {
                    email: user.email || "",
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    blocked: false
                });
            } else {
                await setDoc(privateRef, { lastLogin: serverTimestamp() }, { merge: true });
            }
        } catch (err){ console.error("[profil] maxfiy hujjatni yangilashda xato:", err); }

        try {
            const currentRole = existing.data().role || null;
            if (proposedRole && (currentRole === null || (proposedRole === "author" && currentRole !== "author"))){
                await updateDoc(userRef, { role: proposedRole });
            }
        } catch (err){ console.error("[profil] rolni belgilashda xato:", err); }

        return { isNew: false };
    }

    try {
        await runTransaction(db, async (tx) => {
            const freshSnap = await tx.get(userRef);
            if (freshSnap.exists()) return;

            const statsRef = doc(db, "stats", "registered");
            const statsSnap = await tx.get(statsRef);
            const current = statsSnap.exists() ? (statsSnap.data().count || 0) : 0;

            // OMMAVIY hujjat — email, blok holati va kirish tarixi bu yerda YO'Q.
            tx.set(userRef, {
                displayName: user.displayName || "Foydalanuvchi",
                photoURL: user.photoURL || "",
                role: proposedRole
            });
            // XUSUSIY hujjat — faqat egasi va admin o'qiy oladi.
            tx.set(privateRef, {
                email: user.email || "",
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                blocked: false
            });
            tx.set(statsRef, { count: current + 1 });
        });
    } catch (err){
        console.error("[profil] yaratishda xatolik:", err);
    }
    return { isNew: true };
}

function animateCount(el, to){
    if (!el) return;
    const from = Number(el.dataset.val || 0);
    if (from === to) return;
    el.dataset.val = to;
    const duration = 700;
    const start = performance.now();
    function step(now){
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (to - from) * eased).toLocaleString("uz-UZ");
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

try {
    onSnapshot(doc(db, "stats", "registered"), (snap) => {
        animateCount(registeredCountEl, snap.exists() ? (snap.data().count || 0) : 0);
    });
} catch (err){ console.error("[hisoblagich] o'qishda xatolik:", err); }

try {
    onSnapshot(doc(db, "stats", "visits"), (snap) => {
        animateCount(visitsCountEl, snap.exists() ? (snap.data().count || 0) : 0);
    });
} catch (err){ console.error("[hisoblagich] tashriflarni o'qishda xatolik:", err); }

try {
    onSnapshot(doc(db, "stats", "donations"), (snap) => {
        if (!snap.exists() || !donationsTotalEl) return;
        const data = snap.data();
        donationsTotalEl.textContent = `${(data.total || 0).toLocaleString("uz-UZ")} ${data.currency || "so'm"}`;
    });
} catch (err){ console.error("[donat] o'qishda xatolik:", err); }

/* ---------------- login celebration (confetti) ---------------- */
function celebrateLogin(){
    const colors = ["#4fd8ff", "#7c5cff", "#ff4fd8", "#ffd166", "#ffffff"];
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;inset:0;z-index:10000;pointer-events:none;overflow:hidden;";
    document.body.appendChild(host);

    for (let i = 0; i < 120; i++){
        const p = document.createElement("span");
        const size = 6 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const startX = 50 + (Math.random() - 0.5) * 20;
        const dx = (Math.random() - 0.5) * 100;
        const dy = 40 + Math.random() * 55;
        const rot = Math.random() * 720 - 360;
        const delay = Math.random() * 0.15;
        const dur = 1.4 + Math.random() * 0.9;

        p.style.cssText = `position:absolute;left:${startX}%;top:38%;width:${size}px;height:${size * 0.5}px;background:${color};border-radius:2px;opacity:0;`;
        p.style.setProperty("--dx", `${dx}vw`);
        p.style.setProperty("--dy", `${dy}vh`);
        p.style.setProperty("--rot", `${rot}deg`);
        p.style.animation = `confettiBurst ${dur}s cubic-bezier(.16,.8,.3,1) ${delay}s forwards`;
        host.appendChild(p);
    }
    setTimeout(() => host.remove(), 2800);
}

/* ---------------- rol o'zgargani haqida bir martalik xabar (toast) ---------------- */
function showRoleChangeToast(newRole){
    const label = newRole ? (ROLE_LABEL[newRole] || newRole) : "Oddiy foydalanuvchi";
    const icon  = newRole ? (ROLE_ICON[newRole] || "ri-user-star-line") : "ri-user-line";

    const toast = document.createElement("div");
    toast.className = "role-toast";
    toast.innerHTML = `
        <i class="${icon} role-toast-icon"></i>
        <div class="role-toast-body">
            <strong>Rolingiz yangilandi!</strong>
            <span>Sizga endi <b>${escapeHTML(label)}</b> maqomi berildi.</span>
        </div>
        <button class="role-toast-close" aria-label="Yopish"><i class="ri-close-line"></i></button>
    `;
    document.body.appendChild(toast);

    const remove = () => {
        toast.classList.add("is-leaving");
        setTimeout(() => toast.remove(), 400);
    };
    toast.querySelector(".role-toast-close").addEventListener("click", remove);
    setTimeout(remove, 7000);

    requestAnimationFrame(() => toast.classList.add("is-visible"));
}

/* ---------------- add comment / reply ---------------- */
commentForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await postComment(commentText.value, null, commentForm.querySelector("button[type=submit]"));
    commentText.value = "";
});

async function postComment(rawText, parentId, submitBtn){
    if (!currentUser || currentUserBlocked) return;
    const text = rawText.trim();
    if (!text) return;

    if (submitBtn) submitBtn.disabled = true;
    try {
        await addDoc(collection(db, "comments"), {
            uid: currentUser.uid,
            name: currentUser.displayName || "Foydalanuvchi",
            photo: currentUser.photoURL || "",
            text: text.slice(0, 500),
            parentId: parentId || null,
            createdAt: serverTimestamp()
        });
    } catch (err){
        console.error("[fikrlar] yuborishda xatolik:", err);
        alert("Fikringizni yuborib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

/* ---------------- delete comment ---------------- */
async function deleteComment(id){
    try { await deleteDoc(doc(db, "comments", id)); }
    catch (err){
        console.error("[fikrlar] o'chirishda xatolik:", err);
        alert("Fikrni o'chirib bo'lmadi. Qayta urinib ko'ring.");
    }
}

/* ---------------- auto-prune (age-based, best-effort, client-triggered) ---------------- */
async function maybePruneOldComments(){
    try {
        const lastRun = Number(localStorage.getItem("donylogic_prune_last") || 0);
        if (Date.now() - lastRun < PRUNE_CHECK_EVERY_MS) return;
        localStorage.setItem("donylogic_prune_last", String(Date.now()));

        const cutoff = Timestamp.fromMillis(Date.now() - PRUNE_AFTER_DAYS * 24 * 60 * 60 * 1000);
        const q = query(collection(db, "comments"), where("createdAt", "<", cutoff));
        const snap = await getDocs(q);
        if (snap.empty) return;

        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        console.info(`[tozalash] ${snap.size} ta eski izoh o'chirildi (120+ kunlik).`);
    } catch (err){
        console.error("[tozalash] xato:", err);
    }
}

/* ---------------- render (with nested replies + role badges) ---------------- */
function timeAgo(date){
    if (!date) return "";
    const diff = Math.max(0, (Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "hozirgina";
    if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} kun oldin`;
    return date.toLocaleDateString("uz-UZ");
}

function escapeHTML(str){
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function commentRowHTML(c, depth, parentAuthor){
    const isOwn = currentUser && c.uid === currentUser.uid;
    const canModerate = currentUser && (currentUserRole === "author" || currentUserRole === "admin" || currentUserRole === "manager" || currentUserRole === "ceo_alfgamex");
    const canDelete = isOwn || canModerate;
    const created = c.createdAt?.toDate ? c.createdAt.toDate() : null;
    const role = roleCache.get(c.uid);
    const replyToHTML = parentAuthor
        ? `<span class="reply-to-label"><i class="ri-corner-down-right-line"></i> Javob: ${escapeHTML(parentAuthor)}</span>`
        : "";
    return `
        <div class="comment-item${role ? " comment-item-" + role : ""}" style="margin-left:${depth * 34}px" data-id="${c.id}">
            <img class="comment-avatar" src="${escapeHTML(c.photo || "")}" alt="" referrerpolicy="no-referrer">
            <div class="comment-body">
                ${replyToHTML}
                <div class="comment-top">
                    <span class="comment-author-line">
                        <span class="comment-author">${escapeHTML(c.name || "Foydalanuvchi")}</span>
                        ${roleBadgeHTML(role)}
                    </span>
                    <span class="comment-time">${timeAgo(created)}</span>
                </div>
                <p class="comment-text">${escapeHTML(c.text || "")}</p>
                <div class="comment-actions">
                    ${currentUser && !currentUserBlocked ? `<button class="comment-reply-btn" data-id="${c.id}"><i class="ri-reply-line"></i> Javob yozish</button>` : ""}
                    ${canDelete ? `<button class="comment-delete" data-id="${c.id}"><i class="ri-delete-bin-6-line"></i> ${isOwn ? "O'chirish" : "O'chirish (moderator)"}</button>` : ""}
                </div>
                <div class="reply-form-slot" data-slot-for="${c.id}"></div>
            </div>
        </div>
    `;
}

function renderComments(){
    if (!commentsList) return;

    if (!allComments.length){
        commentsList.innerHTML = `<p class="comments-empty">Hali fikrlar yo'q — birinchi bo'lib fikr qoldiring!</p>`;
        if (commentsCountEl) commentsCountEl.hidden = true;
        return;
    }

    const byParent = new Map();
    allComments.forEach((c) => {
        const key = c.parentId || "root";
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(c);
    });

    const rootItems = (byParent.get("root") || []).slice().reverse();

    let html = "";
    function walk(items, depth, parentAuthor){
        items.forEach((c) => {
            html += commentRowHTML(c, depth, parentAuthor);
            walk(byParent.get(c.id) || [], depth + 1, c.name || "Foydalanuvchi");
        });
    }
    walk(rootItems, 0, null);

    commentsList.innerHTML = html;

    if (commentsCountEl){
        commentsCountEl.hidden = false;
        commentsCountEl.textContent = `${allComments.length} ta fikr`;
    }

    commentsList.querySelectorAll(".comment-delete").forEach((btn) => {
        btn.addEventListener("click", () => deleteComment(btn.dataset.id));
    });
    commentsList.querySelectorAll(".comment-reply-btn").forEach((btn) => {
        btn.addEventListener("click", () => toggleReplyForm(btn.dataset.id));
    });

    // fonda: hali rol keshida yo'q mualliflarning rolini aniqlab, keyin bir marta qayta chizish
    const uncached = [...new Set(allComments.map((c) => c.uid))].filter((uid) => !roleCache.has(uid));
    if (uncached.length){
        Promise.all(uncached.map((uid) => resolveRole(uid))).then(() => renderComments());
    }
}

function toggleReplyForm(parentId){
    const slot = commentsList.querySelector(`.reply-form-slot[data-slot-for="${parentId}"]`);
    if (!slot) return;

    if (slot.childElementCount){
        slot.innerHTML = "";
        return;
    }
    commentsList.querySelectorAll(".reply-form-slot").forEach((s) => { s.innerHTML = ""; });

    const form = document.createElement("form");
    form.className = "reply-form";
    form.innerHTML = `
        <textarea maxlength="500" rows="2" placeholder="Javobingizni yozing..." required></textarea>
        <button type="submit" class="btn btn-ghost">Yuborish</button>
    `;
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const ta = form.querySelector("textarea");
        const btn = form.querySelector("button");
        await postComment(ta.value, parentId, btn);
        slot.innerHTML = "";
    });
    slot.appendChild(form);
    form.querySelector("textarea").focus();
}

/* ---------------- live listen ---------------- */
try {
    const q = query(collection(db, "comments"), orderBy("createdAt", "asc"));
    onSnapshot(q, (snapshot) => {
        allComments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderComments();
        window.dispatchEvent(new CustomEvent("donylogic:comments"));
    }, (err) => {
        console.error("[fikrlar] o'qishda xatolik:", err);
        if (commentsList) commentsList.innerHTML = `<p class="comments-empty">Fikrlarni yuklab bo'lmadi.</p>`;
    });
} catch (err){
    console.error("[fikrlar] ulanishda xatolik:", err);
}

/* ==================================================================
   E'LONLAR (announcements) — logotip yonidagi karusel
   Faqat loyiha muallifi (AUTHOR_EMAIL) qo'sha/o'chira oladi.
   Max 5 ta: 6-chisi qo'shilganda eng eskisi avtomatik o'chadi.
   ================================================================== */
try {
    const aq = query(collection(db, "announcements"), orderBy("createdAt", "asc"));
    onSnapshot(aq, (snapshot) => {
        allAnnouncements = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderAnnouncementBar();
        window.dispatchEvent(new CustomEvent("donylogic:announcements")); // admin panel ochiq bo'lsa yangilanadi

        // "Bildirishnoma qilib yuborish" bosilganda notifiedAt yangilangan hujjatlarni topib,
        // ushbu tabda (ruxsat berilgan bo'lsa) OS darajasidagi bildirishnoma ko'rsatamiz.
        if (!announcementsFirstLoad && "Notification" in window && Notification.permission === "granted"){
            snapshot.docChanges().forEach((change) => {
                if (change.type !== "modified") return;
                const data = change.doc.data();
                const ms = data.notifiedAt?.toMillis?.();
                if (!ms) return;
                const key = `${change.doc.id}:${ms}`;
                if (notifiedAnnouncementKeys.has(key)) return;
                if (Date.now() - ms > 15000) return; // eski (sayt endi ochilganda) push'larni qayta chiqarmaslik
                notifiedAnnouncementKeys.add(key);
                try {
                    new Notification("Donylogic — yangi e'lon", {
                        body: data.text || "",
                        icon: "/favicon-96x96.png"
                    });
                } catch (err){
                    console.error("[bildirishnoma] ko'rsatishda xato:", err);
                }
            });
        }
        announcementsFirstLoad = false;
    }, (err) => {
        console.error("[elon] o'qishda xatolik:", err);
    });
} catch (err){
    console.error("[elon] ulanishda xatolik:", err);
}

// muddati tugagan e'lonlar karuselda ko'rsatilmaydi
function activeAnnouncements(){
    const now = Date.now();
    return allAnnouncements.filter((a) => {
        const ms = a.expiresAt?.toMillis?.();
        return !ms || ms > now;
    });
}
const ANN_COLOR_MAP = { cyan: "#4fd8ff", violet: "#9b82ff", gold: "#ffd166", red: "#ff6b6b", green: "#4ade80" };
let shownAnnouncements = [];
let lastActiveKey = "";

function renderAnnouncementBar(){
    if (!announcementBar || !announcementStage) return;

    if (announcementRotateTimer){
        clearInterval(announcementRotateTimer);
        announcementRotateTimer = null;
    }
    announcementStage.innerHTML = "";
    currentSlide = null;

    shownAnnouncements = activeAnnouncements();
    lastActiveKey = shownAnnouncements.map((a) => a.id + (a.text || "")).join("|");

    if (!shownAnnouncements.length){
        announcementBar.hidden = true;
        return;
    }

    announcementBar.hidden = false;
    announcementIndex = 0;
    showAnnouncement(0);

    // 1 ta bo'lsa ham xuddi shu e'lon aylanib keladi; ko'p bo'lsa navbatma-navbat
    announcementRotateTimer = setInterval(() => {
        announcementIndex = (announcementIndex + 1) % shownAnnouncements.length;
        showAnnouncement(announcementIndex);
    }, ANNOUNCEMENT_ROTATE_MS);
}

// muddati o'tib qolgan e'lonlarni ochiq sahifada ham o'z vaqtida yashirish
setInterval(() => {
    const key = activeAnnouncements().map((a) => a.id + (a.text || "")).join("|");
    if (key !== lastActiveKey) renderAnnouncementBar();
}, 30000);

function showAnnouncement(idx){
    const item = shownAnnouncements[idx];
    if (!item || !announcementStage) return;

    const color = ANN_COLOR_MAP[item.color] || ANN_COLOR_MAP.cyan;
    const icon = /^ri-[a-z0-9-]+$/.test(item.icon || "") ? item.icon : "ri-megaphone-fill";

    const slide = document.createElement("div");
    slide.className = "announcement-slide is-entering";
    slide.innerHTML = `<i class="${icon} announcement-icon" style="color:${color}"></i><span>${escapeHTML(item.text || "")}</span>`;

    // eskisi pastga tushadi, yangisi shu zahoti tepadan uchib keladi (ikonka matn bilan birga)
    const old = currentSlide;
    announcementStage.appendChild(slide);
    if (old){
        old.classList.remove("is-entering");
        old.classList.add("is-leaving");
        setTimeout(() => old.remove(), 650);
    }
    currentSlide = slide;
}

/* ==================================================================
   ADMIN PANEL — alohida modul (admin.js), faqat muallif tugmani bosganda yuklanadi
   ================================================================== */
adminPanelBtn?.addEventListener("click", async () => {
    if (!isAuthorGoogle(currentUser)) return;
    try {
        const mod = await import("./admin.js?v=1");
        mod.openAdminPanel({
            db,
            AUTHOR_EMAIL, MANAGER_DEFAULT_EMAIL, MAX_ANNOUNCEMENTS, ROLE_LABEL,
            getCurrentUser: () => currentUser,
            getComments: () => allComments,
            getAnnouncements: () => allAnnouncements,
            escapeHTML, timeAgo, roleBadgeHTML, invalidateRole,
            rerenderComments: () => renderComments()
        });
    } catch (err){
        console.error("[admin] panelni yuklashda xato:", err);
        alert("Admin panelni yuklab bo'lmadi.");
    }
});

/* ---------------- donate: copy card numbers ---------------- */
document.querySelectorAll("[data-copy-card]").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const value = btn.getAttribute("data-copy-card");
        try {
            await navigator.clipboard.writeText(value);
            const original = btn.innerHTML;
            btn.innerHTML = `<i class="ri-check-line"></i> Nusxalandi`;
            setTimeout(() => { btn.innerHTML = original; }, 1600);
        } catch (err){
            console.error("[donat] nusxalashda xatolik:", err);
        }
    });
});
