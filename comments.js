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
const announcementBar   = document.getElementById("announcementBar");
const announcementStage  = document.getElementById("announcementStage");
let currentSlide = null;

let currentUser = null;
let currentUserRole = null;   // 'author' | 'admin' | 'manager' | null
let currentUserBlocked = false;
let allComments = [];
let heartbeatTimer = null;
let allAnnouncements = [];
let announcementRotateTimer = null;
let announcementIndex = 0;

/* ---------------- rol aniqlash (har doim /users hujjatidan, spoofing imkonsiz) ---------------- */
const roleCache = new Map(); // uid -> role|null

async function resolveRole(uid, emailHint){
    if (emailHint === AUTHOR_EMAIL) return "author";
    if (roleCache.has(uid)) return roleCache.get(uid);
    try {
        const snap = await getDoc(doc(db, "users", uid));
        let role = null;
        if (snap.exists()){
            const data = snap.data();
            role = data.role || null;
            if (!role && data.email === MANAGER_DEFAULT_EMAIL) role = "manager";
        } else if (emailHint === MANAGER_DEFAULT_EMAIL){
            role = "manager";
        }
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

    if (user.isAnonymous){
        currentUser = null;
        currentUserRole = null;
        currentUserBlocked = false;
        googleLoginBtn.hidden = false;
        githubLoginBtn.hidden = false;
        userProfile.hidden = true;
        userProfile.classList.remove("is-author", "is-admin", "is-manager");
        commentForm.hidden = true;
        commentsHint.hidden = false;
        commentsHint.textContent = "Fikr qoldirish uchun avval Google yoki GitHub bilan kiring.";
        if (adminPanelBtn) adminPanelBtn.hidden = true;
        renderComments();
    } else {
        currentUser = user;
        googleLoginBtn.hidden = true;
        githubLoginBtn.hidden = true;
        userProfile.hidden = false;
        userAvatar.src = user.photoURL || "";
        userName.textContent = user.displayName || "Foydalanuvchi";

        syncUserProfile(user).then(async ({ isNew }) => {
            invalidateRole(user.uid);
            currentUserRole = await resolveRole(user.uid, user.email);
            const freshSnap = await getDoc(doc(db, "users", user.uid));
            currentUserBlocked = freshSnap.exists() ? !!freshSnap.data().blocked : false;

            applyOwnRoleUI();

            if (adminPanelBtn) adminPanelBtn.hidden = !isAuthorGoogle(user);

            if (justLoggedIn){
                celebrateLogin();
                justLoggedIn = false;
            }
            renderComments();
        }).catch((err) => {
            console.error("[profil] sinxronlashda xatolik:", err);
        });

        maybePruneOldComments();
        heartbeatTimer = setInterval(() => {
            setDoc(doc(db, "users", user.uid), { lastLogin: serverTimestamp() }, { merge: true })
                .catch((err) => console.error("[heartbeat] yangilashda xato:", err));
        }, HEARTBEAT_MS);
    }

    countVisitOnce();
    renderComments();
});

function applyOwnRoleUI(){
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
        commentsHint.textContent = "Siz saytda izoh qoldirishdan bloklangansiz.";
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
    const existing = await getDoc(userRef);

    if (existing.exists()){
        await setDoc(userRef, {
            displayName: user.displayName || "Foydalanuvchi",
            photoURL: user.photoURL || "",
            lastLogin: serverTimestamp()
        }, { merge: true });
        return { isNew: false };
    }

    try {
        await runTransaction(db, async (tx) => {
            const freshSnap = await tx.get(userRef);
            if (freshSnap.exists()) return;

            const statsRef = doc(db, "stats", "registered");
            const statsSnap = await tx.get(statsRef);
            const current = statsSnap.exists() ? (statsSnap.data().count || 0) : 0;

            tx.set(userRef, {
                email: user.email || "",
                displayName: user.displayName || "Foydalanuvchi",
                photoURL: user.photoURL || "",
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                role: null,
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
            email: currentUser.email || "",
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
    const role = c.email === AUTHOR_EMAIL ? "author" : roleCache.get(c.uid);
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
    const uncached = [...new Set(allComments.map((c) => c.uid))].filter(
        (uid) => !roleCache.has(uid) && !(allComments.find((c) => c.uid === uid)?.email === AUTHOR_EMAIL)
    );
    if (uncached.length){
        Promise.all(uncached.map((uid) => {
            const sample = allComments.find((c) => c.uid === uid);
            return resolveRole(uid, sample?.email);
        })).then(() => renderComments());
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
        // admin panel ochiq bo'lsa, ro'yxatini ham yangilab tur
        const listHost = document.querySelector(".announcement-admin-list");
        const countTag = document.querySelector("[data-announce-count]");
        if (listHost) renderAnnouncementAdminList(listHost);
        if (countTag) countTag.textContent = `${allAnnouncements.length}/${MAX_ANNOUNCEMENTS}`;
    }, (err) => {
        console.error("[elon] o'qishda xatolik:", err);
    });
} catch (err){
    console.error("[elon] ulanishda xatolik:", err);
}

function renderAnnouncementBar(){
    if (!announcementBar || !announcementStage) return;

    if (announcementRotateTimer){
        clearInterval(announcementRotateTimer);
        announcementRotateTimer = null;
    }
    announcementStage.innerHTML = "";
    currentSlide = null;

    if (!allAnnouncements.length){
        announcementBar.hidden = true;
        return;
    }

    announcementBar.hidden = false;
    announcementIndex = 0;
    showAnnouncement(0);

    // 1 ta bo'lsa ham xuddi shu e'lon aylanib keladi; ko'p bo'lsa navbatma-navbat
    announcementRotateTimer = setInterval(() => {
        announcementIndex = (announcementIndex + 1) % allAnnouncements.length;
        showAnnouncement(announcementIndex);
    }, ANNOUNCEMENT_ROTATE_MS);
}

function showAnnouncement(idx){
    const item = allAnnouncements[idx];
    if (!item || !announcementStage) return;

    const slide = document.createElement("div");
    slide.className = "announcement-slide is-entering";
    slide.innerHTML = `<span>${escapeHTML(item.text || "")}</span>`;

    // eskisi pastga tushadi, yangisi shu zahoti tepadan uchib keladi
    const old = currentSlide;
    announcementStage.appendChild(slide);
    if (old){
        old.classList.remove("is-entering");
        old.classList.add("is-leaving");
        setTimeout(() => old.remove(), 650);
    }
    currentSlide = slide;
}

async function postAnnouncement(rawText, submitBtn){
    if (!isAuthorGoogle(currentUser)) return;
    const text = rawText.trim();
    if (!text) return;

    if (submitBtn) submitBtn.disabled = true;
    try {
        // 5 tadan oshsa — eng eskisini (ro'yxat boshidagi, chunki "asc" tartibda) o'chiramiz
        if (allAnnouncements.length >= MAX_ANNOUNCEMENTS){
            const toRemove = allAnnouncements.slice(0, allAnnouncements.length - MAX_ANNOUNCEMENTS + 1);
            await Promise.all(toRemove.map((a) => deleteDoc(doc(db, "announcements", a.id))));
        }
        await addDoc(collection(db, "announcements"), {
            text: text.slice(0, 200),
            createdAt: serverTimestamp()
        });
    } catch (err){
        console.error("[elon] qo'shishda xatolik:", err);
        alert("E'lonni qo'shib bo'lmadi.");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function deleteAnnouncement(id){
    try { await deleteDoc(doc(db, "announcements", id)); }
    catch (err){
        console.error("[elon] o'chirishda xatolik:", err);
        alert("E'lonni o'chirib bo'lmadi.");
    }
}

function renderAnnouncementAdminList(host){
    if (!host) return;
    if (!allAnnouncements.length){
        host.innerHTML = `<p class="announcement-admin-empty">Hozircha e'lonlar yo'q.</p>`;
        return;
    }
    host.innerHTML = allAnnouncements.slice().reverse().map((a) => {
        const created = a.createdAt?.toDate ? a.createdAt.toDate() : null;
        return `
            <div class="announcement-admin-item" data-id="${a.id}">
                <span class="announcement-admin-text">${escapeHTML(a.text || "")}</span>
                <span class="announcement-admin-time">${timeAgo(created)}</span>
                <button class="announcement-admin-delete" data-id="${a.id}" title="O'chirish"><i class="ri-delete-bin-6-line"></i></button>
            </div>
        `;
    }).join("");
    host.querySelectorAll(".announcement-admin-delete").forEach((btn) => {
        btn.addEventListener("click", () => deleteAnnouncement(btn.dataset.id));
    });
}

/* ==================================================================
   ADMIN PANEL — faqat donylogicstudios@gmail.com uchun
   ================================================================== */
adminPanelBtn?.addEventListener("click", openAdminPanel);

async function openAdminPanel(){
    if (!isAuthorGoogle(currentUser)) return;

    const overlay = document.createElement("div");
    overlay.className = "admin-overlay";
    overlay.innerHTML = `
        <div class="admin-modal">
            <div class="admin-modal-head">
                <h3><i class="ri-shield-star-fill"></i> Admin panel</h3>
                <button class="admin-close" aria-label="Yopish"><i class="ri-close-line"></i></button>
            </div>
            <div class="admin-modal-body">
                <div class="admin-section">
                    <div class="admin-section-title"><i class="ri-team-fill"></i> Foydalanuvchilar</div>
                    <p class="admin-loading">Foydalanuvchilar yuklanmoqda...</p>
                </div>

                <hr class="admin-divider">

                <div class="admin-section">
                    <div class="admin-section-title">
                        <i class="ri-megaphone-fill"></i> E'lonlar
                        <span class="admin-count-tag" data-announce-count>${allAnnouncements.length}/${MAX_ANNOUNCEMENTS}</span>
                    </div>
                    <form class="announcement-form">
                        <input type="text" maxlength="200" placeholder="Yangi e'lon matni (200 belgigacha)..." required>
                        <button type="submit" class="btn btn-primary"><i class="ri-send-plane-2-line"></i> <span>E'lon qilish</span></button>
                    </form>
                    <div class="announcement-admin-list"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector(".admin-close").addEventListener("click", close);

    const announceForm = overlay.querySelector(".announcement-form");
    announceForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = announceForm.querySelector("input");
        const btn = announceForm.querySelector("button");
        await postAnnouncement(input.value, btn);
        input.value = "";
    });
    renderAnnouncementAdminList(overlay.querySelector(".announcement-admin-list"));

    const usersSection = overlay.querySelectorAll(".admin-section")[0];
    try {
        const snap = await getDocs(collection(db, "users"));
        const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        users.sort((a, b) => (b.lastLogin?.toMillis?.() || 0) - (a.lastLogin?.toMillis?.() || 0));
        renderAdminTable(usersSection, users);
    } catch (err){
        console.error("[admin] foydalanuvchilarni yuklashda xato:", err);
        usersSection.querySelector(".admin-loading").textContent = `Yuklab bo'lmadi: ${err.message || ""}`;
    }
}

function fmtDate(ts){
    if (!ts?.toDate) return "—";
    return ts.toDate().toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function renderAdminTable(section, users){
    const now = Date.now();

    const rows = users.map((u) => {
        const isSelf = u.email === AUTHOR_EMAIL;
        const role = isSelf ? "author" : (u.role || (u.email === MANAGER_DEFAULT_EMAIL ? "manager" : null));
        const lastMs = u.lastLogin?.toMillis?.() || 0;
        const isRecentlyActive = now - lastMs < 5 * 60 * 1000;

        const actions = isSelf ? `<span class="admin-self-tag">Siz</span>` : `
            <div class="admin-actions">
                <select class="admin-role-select" data-uid="${u.uid}">
                    <option value="__none__" ${!role ? "selected" : ""}>Oddiy foydalanuvchi</option>
                    <option value="manager" ${role === "manager" ? "selected" : ""}>Community-manager</option>
                    <option value="admin" ${role === "admin" ? "selected" : ""}>Admin</option>
                    <option value="ceo_alfgamex" ${role === "ceo_alfgamex" ? "selected" : ""}>CEO of AlfGameX</option>
                </select>
                <button class="admin-block-btn ${u.blocked ? "is-blocked" : ""}" data-uid="${u.uid}" data-blocked="${!!u.blocked}">
                    <i class="ri-${u.blocked ? "lock-unlock-line" : "forbid-line"}"></i> ${u.blocked ? "Blokdan chiqarish" : "Bloklash"}
                </button>
            </div>
        `;

        return `
            <tr class="${u.blocked ? "admin-row-blocked" : ""}">
                <td class="admin-cell-user">
                    <img src="${escapeHTML(u.photoURL || "")}" alt="" referrerpolicy="no-referrer">
                    <span>${escapeHTML(u.displayName || "—")}</span>
                    ${roleBadgeHTML(role)}
                </td>
                <td>${escapeHTML(u.email || "—")}</td>
                <td>${fmtDate(u.createdAt)}</td>
                <td>
                    <span class="admin-activity-dot ${isRecentlyActive ? "is-online" : ""}"></span>
                    ${fmtDate(u.lastLogin)}
                </td>
                <td>${u.blocked ? '<span class="admin-status-blocked">Bloklangan</span>' : '<span class="admin-status-ok">Faol</span>'}</td>
                <td>${actions}</td>
            </tr>
        `;
    }).join("");

    section.innerHTML = `
        <div class="admin-section-title"><i class="ri-team-fill"></i> Foydalanuvchilar <span class="admin-count-tag">${users.length}</span></div>
        <div class="admin-table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Foydalanuvchi</th>
                        <th>Email</th>
                        <th>Ro'yxatdan o'tgan</th>
                        <th>Oxirgi faollik</th>
                        <th>Holat</th>
                        <th>Amallar</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;

    section.querySelectorAll(".admin-role-select").forEach((sel) => {
        sel.addEventListener("change", async () => {
            const uid = sel.dataset.uid;
            const value = sel.value === "__none__" ? null : sel.value;
            try {
                await updateDoc(doc(db, "users", uid), { role: value });
                invalidateRole(uid);
                renderComments();
            } catch (err){
                console.error("[admin] rol o'zgartirishda xato:", err);
                alert("Rolni o'zgartirib bo'lmadi.");
            }
        });
    });

    section.querySelectorAll(".admin-block-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
            const uid = btn.dataset.uid;
            const nextBlocked = btn.dataset.blocked !== "true";
            try {
                await updateDoc(doc(db, "users", uid), { blocked: nextBlocked });
                openAdminPanelRefresh(section);
            } catch (err){
                console.error("[admin] bloklashda xato:", err);
                alert("Bajarib bo'lmadi.");
            }
        });
    });
}

async function openAdminPanelRefresh(section){
    try {
        const snap = await getDocs(collection(db, "users"));
        const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
        users.sort((a, b) => (b.lastLogin?.toMillis?.() || 0) - (a.lastLogin?.toMillis?.() || 0));
        renderAdminTable(section, users);
    } catch (err){
        console.error("[admin] yangilashda xato:", err);
    }
}

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
