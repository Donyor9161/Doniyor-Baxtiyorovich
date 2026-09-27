/* =========================================================
   DONYLOGIC — Google login + Fikrlar + Hisoblagichlar (Firebase)
   ========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signInAnonymously,
    signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, deleteDoc, doc, getDoc, getDocs,
    onSnapshot, query, orderBy, where, serverTimestamp, Timestamp,
    runTransaction, writeBatch, limit
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDiocHJNETksW_WJcrd6CGJfIhA-RK0RMQ",
    authDomain: "donylogic-12f4b.firebaseapp.com",
    projectId: "donylogic-12f4b",
    storageBucket: "donylogic-12f4b.firebasestorage.app",
    messagingSenderId: "661119368716",
    appId: "1:661119368716:web:22c57597f1e523995ff829"
};

const PRUNE_AFTER_DAYS = 120;                  // shundan eski izohlar o'chirishga ruxsat etiladi
const PRUNE_CHECK_EVERY_MS = 24 * 60 * 60 * 1000;  // brauzerda kuniga 1 marta tekshirish
const AUTHOR_EMAIL = "donylogicstudios@gmail.com";  // Bosh muallif
const MANAGER_EMAIL = "qwdonyor@gmail.com";         // Kommunitet-menejer

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

console.info("[donylogic] comments.js (popup login versiyasi) yuklandi ✅");

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

function T(key){
    return window.DonylogicI18n ? window.DonylogicI18n.t(key) : key;
}

let currentUser = null;
let allComments = [];
let bannerInterval = null;

/* ---------------- auth: popup flow ---------------- */
let justLoggedIn = false;

googleLoginBtn?.addEventListener("click", () => loginWith(provider, "Google"));
githubLoginBtn?.addEventListener("click", () => loginWith(githubProvider, "GitHub"));

async function loginWith(authProvider, label){
    console.info(`[donylogic] ${label} login bosildi, popup ochilmoqda...`);
    try {
        const result = await signInWithPopup(auth, authProvider);
        if (result?.user){
            console.info(`[donylogic] ${label} login muvaffaqiyatli:`, result.user.displayName);
            justLoggedIn = true;
        }
    } catch (err){
        console.error(`[fikrlar] ${label} login xatosi:`, err.code, err.message);
        if (err.code === "auth/account-exists-with-different-credential"){
            alert("Bu email boshqa usul (masalan Google) orqali allaqachon ro'yxatdan o'tgan. O'sha usul bilan kiring.");
        } else if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request"){
            alert("Kirishda xatolik yuz berdi. Konsolni (F12) tekshiring yoki qayta urinib ko'ring.");
        }
    }
}

logoutBtn?.addEventListener("click", async () => {
    try { await signOut(auth); }
    catch (err){ console.error("[fikrlar] chiqish xatosi:", err); }
});

onAuthStateChanged(auth, (user) => {
    if (!user){
        signInAnonymously(auth).catch((err) => {
            console.error("[hisoblagich] anonim kirishda xato:", err);
        });
        return; 
    }

    if (user.isAnonymous){
        currentUser = null;
        if(googleLoginBtn) googleLoginBtn.hidden = false;
        if(githubLoginBtn) githubLoginBtn.hidden = false;
        if(userProfile) userProfile.hidden = true;
        if(commentForm) commentForm.hidden = true;
        if(commentsHint) commentsHint.hidden = false;
    } else {
        currentUser = user;
        if(googleLoginBtn) googleLoginBtn.hidden = true;
        if(githubLoginBtn) githubLoginBtn.hidden = true;
        if(userProfile) userProfile.hidden = false;
        if(userAvatar) userAvatar.src = user.photoURL || "";
        if(userName) userName.textContent = user.displayName || "Foydalanuvchi";
        if(commentForm) commentForm.hidden = false;
        if(commentsHint) commentsHint.hidden = true;

        registerUniqueUser(user.uid).then(() => {
            if (justLoggedIn){
                celebrateLogin();
                justLoggedIn = false;
            }
        });

        maybePruneOldComments();
    }

    // Admin panelni tekshirib yoqish va bannerlarni sozlash
    setupAdminPanel(user);
    setupAnnouncementsBanner(user);

    countVisitOnce();
    renderComments();
});

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

/* ---------------- unique-user registration + live counter ---------------- */
async function registerUniqueUser(uid){
    const userRef = doc(db, "users", uid);
    const existing = await getDoc(userRef);
    if (existing.exists()) return false;

    try {
        await runTransaction(db, async (tx) => {
            const freshSnap = await tx.get(userRef);
            if (freshSnap.exists()) return;

            const statsRef = doc(db, "stats", "registered");
            const statsSnap = await tx.get(statsRef);
            const current = statsSnap.exists() ? (statsSnap.data().count || 0) : 0;

            tx.set(userRef, { 
                uid: uid,
                email: currentUser.email || "Anonim",
                name: currentUser.displayName || "Foydalanuvchi",
                createdAt: serverTimestamp() 
            });
            tx.set(statsRef, { count: current + 1 });
        });
        return true;
    } catch (err){
        console.error("[hisoblagich] ro'yxatga olishda xatolik:", err);
        return false;
    }
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
        const count = snap.exists() ? (snap.data().count || 0) : 0;
        animateCount(registeredCountEl, count);
    });
} catch (err){ console.error("[hisoblagich] o'qishda xatolik:", err); }

try {
    onSnapshot(doc(db, "stats", "visits"), (snap) => {
        const count = snap.exists() ? (snap.data().count || 0) : 0;
        animateCount(visitsCountEl, count);
    });
} catch (err){ console.error("[hisoblagich] tashriflarni o'qishda xatolik:", err); }

try {
    onSnapshot(doc(db, "stats", "donations"), (snap) => {
        if (!snap.exists() || !donationsTotalEl) return;
        const data = snap.data();
        const total = data.total || 0;
        const currency = data.currency || "so'm";
        donationsTotalEl.textContent = `${total.toLocaleString("uz-UZ")} ${currency}`;
    });
} catch (err){ console.error("[donat] o'qishda xatolik:", err); }

/* ---------------- login celebration (confetti) ---------------- */
function celebrateLogin(){
    const colors = ["#4fd8ff", "#7c5cff", "#ff4fd8", "#ffd166", "#ffffff"];
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.inset = "0";
    host.style.zIndex = "10000";
    host.style.pointerEvents = "none";
    host.style.overflow = "hidden";
    document.body.appendChild(host);

    const count = 120;
    for (let i = 0; i < count; i++){
        const p = document.createElement("span");
        const size = 6 + Math.random() * 8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const startX = 50 + (Math.random() - 0.5) * 20;
        const dx = (Math.random() - 0.5) * 100;
        const dy = 40 + Math.random() * 55;
        const rot = Math.random() * 720 - 360;
        const delay = Math.random() * 0.15;
        const dur = 1.4 + Math.random() * 0.9;

        p.style.position = "absolute";
        p.style.left = `${startX}%`;
        p.style.top = "38%";
        p.style.width = `${size}px`;
        p.style.height = `${size * 0.5}px`;
        p.style.background = color;
        p.style.borderRadius = "2px";
        p.style.opacity = "0";
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
    if (!currentUser) return;
    const text = rawText.trim();
    if (!text) return;

    if (submitBtn) submitBtn.disabled = true;
    try {
        let finalName = currentUser.displayName || "Foydalanuvchi";
        if (currentUser.email === AUTHOR_EMAIL) {
            finalName = "Loyiha muallifi: " + finalName;
        }

        await addDoc(collection(db, "comments"), {
            uid: currentUser.uid,
            email: currentUser.email || "",
            name: finalName,
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

/* ---------------- render (with nested replies) ---------------- */
function timeAgo(date){
    if (!date) return "";
    const diff = Math.max(0, (Date.now() - date.getTime()) / 1000);
    if (diff < 60) return T("just_now");
    if (diff < 3600) return `${Math.floor(diff / 60)} ${T("minutes_ago")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ${T("hours_ago")}`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ${T("days_ago")}`;
    return date.toLocaleDateString(window.DonylogicI18n?.getLang() === "en" ? "en-US" : window.DonylogicI18n?.getLang() === "ru" ? "ru-RU" : "uz-UZ");
}

function escapeHTML(str){
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function commentRowHTML(c, depth, parentAuthor){
    const isOwn = currentUser && c.uid === currentUser.uid;
    const isViewerAuthor = currentUser && currentUser.email === AUTHOR_EMAIL;
    const isViewerManager = currentUser && currentUser.email === MANAGER_EMAIL;
    const canDelete = isOwn || isViewerAuthor || isViewerManager;

    const created = c.createdAt?.toDate ? c.createdAt.toDate() : null;
    const replyToHTML = parentAuthor
        ? `<span class="reply-to-label"><i class="ri-corner-down-right-line"></i> ${T("reply_to")} ${escapeHTML(parentAuthor)}</span>`
        : "";

    let roleBadge = "";
    let extraClass = "";

    if (c.email === AUTHOR_EMAIL) {
        roleBadge = `<span class="role-badge author">
            <i class="ri-verified-badge-fill animated-verify-icon"></i> Loyiha muallifi
        </span>`;
        extraClass = "comment-author-special";
    } else if (c.email === MANAGER_EMAIL) {
        roleBadge = `<span class="role-badge manager"><i class="ri-shield-user-fill"></i> Kommunitet-menejer</span>`;
    }

    return `
        <div class="comment-item ${extraClass}" style="margin-left:${depth * 34}px" data-id="${c.id}">
            <img class="comment-avatar" src="${escapeHTML(c.photo || "")}" alt="" referrerpolicy="no-referrer">
            <div class="comment-body">
                ${replyToHTML}
                <div class="comment-top">
                    <span class="comment-author">${escapeHTML(c.name || "Foydalanuvchi")}</span>
                    ${roleBadge}
                    <span class="comment-time">${timeAgo(created)}</span>
                </div>
                <p class="comment-text">${escapeHTML(c.text || "")}</p>
                <div class="comment-actions">
                    ${currentUser ? `<button class="comment-reply-btn" data-id="${c.id}"><i class="ri-reply-line"></i> ${T("reply_btn")}</button>` : ""}
                    ${canDelete ? `<button class="comment-delete" data-id="${c.id}"><i class="ri-delete-bin-6-line"></i> ${isOwn ? T("delete_btn") : T("delete_admin_btn")}</button>` : ""}
                </div>
                <div class="reply-form-slot" data-slot-for="${c.id}"></div>
            </div>
        </div>
    `;
}

function renderComments(){
    if (!commentsList) return;

    if (!allComments.length){
        commentsList.innerHTML = `<p class="comments-empty">${T("comments_empty")}</p>`;
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
        commentsCountEl.textContent = `${allComments.length} ${T("comments_count_one")}`;
    }

    commentsList.querySelectorAll(".comment-delete").forEach((btn) => {
        btn.addEventListener("click", () => deleteComment(btn.dataset.id));
    });

    commentsList.querySelectorAll(".comment-reply-btn").forEach((btn) => {
        btn.addEventListener("click", () => toggleReplyForm(btn.dataset.id));
    });
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
        <textarea maxlength="500" rows="2" placeholder="${T("reply_placeholder")}" required></textarea>
        <button type="submit" class="btn btn-ghost">${T("comment_send")}</button>
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
        if (commentsList) commentsList.innerHTML = `<p class="comments-empty">${T("comments_error")}</p>`;
    });
} catch (err){
    console.error("[fikrlar] ulanishda xatolik:", err);
}

/* ---------------- til almashtirilganda dinamik matnlarni yangilash ---------------- */
document.addEventListener("donylogic:langchange", () => {
    renderComments();
});

/* ---------------- donate: copy card numbers ---------------- */
document.querySelectorAll("[data-copy-card]").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const value = btn.getAttribute("data-copy-card");
        try {
            await navigator.clipboard.writeText(value);
            const original = btn.innerHTML;
            btn.innerHTML = `<i class="ri-check-line"></i> ${T("donate_copied")}`;
            setTimeout(() => { btn.innerHTML = original; }, 1600);
        } catch (err){
            console.error("[donat] nusxalashda xatolik:", err);
        }
    });
});

/* ---------------- Muallif panelini boshqarish ---------------- */
function setupAdminPanel(user) {
    const openBtn = document.getElementById('openAdminPanelDbBtn') || document.getElementById('openAdminPanelBtn');
    const modal = document.getElementById('authorDashboardModal');
    const closeBtn = document.getElementById('closeAdminPanelBtn');
    const broadcastForm = document.getElementById('broadcastForm');
    const broadcastInput = document.getElementById('broadcastInput');

    if (!modal) return;

    // 1. Veb sahifada oddiy userlarga admin panelini ochish tugmasi mutlaqo ko'rinmasin
    if (user && user.email === AUTHOR_EMAIL) {
        if (openBtn) openBtn.hidden = false;
    } else {
        if (openBtn) openBtn.hidden = true;
        modal.hidden = true;
        return;
    }

    // 2. Tugmani bosganda oynani ochish va maxsus statistikalar/ro'yxatni yuklash
    if (openBtn) {
        openBtn.onclick = async () => {
            modal.hidden = false;
            document.getElementById('dashVisits').innerText = document.getElementById('visitsCount')?.innerText || '0';
            document.getElementById('dashRegistered').innerText = document.getElementById('registeredCount')?.innerText || '0';
            const dashComments = document.getElementById('dashComments');
            if(dashComments) dashComments.innerText = document.querySelectorAll('.comment-item').length || '0';
            
            // 3. Loyiha muallifi admin panelida o'ziga xos, oddiy userlar ko'rmaydigan ro'yxatdan o'tganlar ro'yxati
            // Agar modal ichida shunday id li element mavjud bo'lmasa, uni qidirib topamiz yoki yaratamiz
            let usersListContainer = document.getElementById('adminRegisteredUsersList');
            if (!usersListContainer) {
                usersListContainer = document.createElement('div');
                usersListContainer.id = 'adminRegisteredUsersList';
                usersListContainer.style.cssText = "margin-top: 15px; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px;";
                modal.querySelector('.modal-content, form, div') || modal.appendChild(usersListContainer);
            }

            usersListContainer.innerHTML = "<p style='font-size:13px; color:#aaa;'>Ro'yxatdan o'tganlar yuklanmoqda...</p>";
            try {
                const usersSnap = await getDocs(collection(db, "users"));
                let userHtml = "<h4 style='margin-bottom:8px; font-size:14px; color:#4fd8ff;'>Ro'yxatdan o'tgan foydalanuvchilar:</h4><ul style='max-height:160px; overflow-y:auto; text-align:left; font-size:13px; padding-left:15px;'>";
                usersSnap.forEach(docSnap => {
                    const uData = docSnap.data();
                    let dateStr = "";
                    if (uData.createdAt && uData.createdAt.toDate) {
                        dateStr = uData.createdAt.toDate().toLocaleDateString();
                    }
                    userHtml += `<li style="margin-bottom:4px;"><b>${escapeHTML(uData.name || 'User')}</b> — <span style="color:#aaa;">${escapeHTML(uData.email || 'Nomaʼlum')}</span> <small>(${dateStr})</small></li>`;
                });
                userHtml += "</ul>";
                usersListContainer.innerHTML = userHtml;
            } catch(e) {
                usersListContainer.innerHTML = "<p style='color:red;'>Ro'yxatni olishda xatolik yuz berdi.</p>";
            }
        };
    }

    // 3. Yopish tugmasi
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.hidden = true;
        };
    }

    // 4. Modal tashqarisiga bosganda yopish
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.hidden = true;
        }
    };

    // 5. E'lon (Broadcast) yuborish va 5 tadan oshig'ini (6-chisini) avtomatik o'chirish logikasi
    if (broadcastForm) {
        broadcastForm.onsubmit = async (e) => {
            e.preventDefault();
            const text = broadcastInput.value.trim();
            if (!text) return;

            try {
                // Yangi e'lonni Firestore'ga qo'shish
                await addDoc(collection(db, "announcements"), {
                    text: text,
                    createdAt: serverTimestamp()
                });

                // Limit: Agar xabarlar soni 5 tadan oshib ketsa, eng eski (6-chi va undan narigi)larini o'chirish
                const snapshot = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc")));
                if (snapshot.docs.length > 5) {
                    const batch = writeBatch(db);
                    for (let i = 5; i < snapshot.docs.length; i++) {
                        batch.delete(snapshot.docs[i].ref);
                    }
                    await batch.commit();
                }

                broadcastInput.value = '';
                modal.hidden = true;
                alert("E'lon muvaffaqiyatli yuborildi!");
            } catch (err) {
                console.error("Xatolik:", err);
                alert("Xatolik yuz berdi.");
            }
        };
    }
}

/* ---------------- 4. BANNER (Donylogic logosi o'ng tomonida) ---------------- */
function setupAnnouncementsBanner(user) {
    let bannerContainer = document.getElementById('donylogicAnnouncementsBanner');
    
    // Muallifga bu banner ko'rinmaydi
    if (user && user.email === AUTHOR_EMAIL) {
        if (bannerContainer) bannerContainer.style.display = 'none';
        return;
    }

    // Agar HTML faylda banner konteyneri bo'lmasa, uni Donylogic logosi o'ng tomoniga o'zi joylashtiradi
    if (!bannerContainer) {
        const logoEl = document.querySelector('.logo, img[alt*="Logo"], [class*="logo"]'); 
        bannerContainer = document.createElement('div');
        bannerContainer.id = 'donylogicAnnouncementsBanner';
        bannerContainer.style.cssText = "margin-left: 15px; color: #4fd8ff; font-size: 14px; font-weight: 500; display: inline-block; max-width: 380px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: middle;";
        
        if (logoEl && logoEl.parentNode) {
            logoEl.parentNode.insertBefore(bannerContainer, logoEl.nextSibling);
        } else {
            document.body.prepend(bannerContainer);
        }
    }

    bannerContainer.style.display = 'inline-block';

    // Eng oxirgi yozilgan 5 ta xabarni olish
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(5));
    
    onSnapshot(q, (snapshot) => {
        let messages = [];
        snapshot.docs.forEach((docSnap) => {
            messages.push(docSnap.data().text);
        });

        if (bannerInterval) clearInterval(bannerInterval);
        if (messages.length === 0) {
            bannerContainer.innerHTML = "";
            return;
        }

        let currentIndex = 0;
        bannerContainer.innerHTML = `📢 ${escapeHTML(messages[currentIndex])}`;

        // Har 3 sekundda ketma-ket almashib turishi
        if (messages.length > 1) {
            bannerInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % messages.length;
                bannerContainer.innerHTML = `📢 ${escapeHTML(messages[currentIndex])}`;
            }, 3000);
        }
    });
}

// Misol uchun banner xabarlarini almashtiruvchi funksiya mantiqi:
function initAnnouncementCarousel(messages) {
    const banner = document.getElementById('donylogicAnnouncementsBanner');
    if (!banner || !messages || messages.length === 0) return;

    let currentIndex = 0;
    
    // HTML elementlarni yaratib qo'yamiz
    banner.innerHTML = '';
    const itemElements = messages.map((msg, index) => {
        const div = document.createElement('div');
        div.className = 'announcement-item' + (index === 0 ? ' active' : '');
        div.textContent = msg;
        banner.appendChild(div);
        return div;
    });

    if (messages.length <= 1) return;

    // Har 3 sekundda almashish
    setInterval(() => {
        const prevIndex = currentIndex;
        currentIndex = (currentIndex + 1) % messages.length;

        // Eskisini pastga tushirib yuboramiz (exit)
        itemElements[prevIndex].classList.remove('active');
        itemElements[prevIndex].classList.add('exit');

        // Yangisini tayyorlaymiz va tepadan tushiramiz
        itemElements[currentIndex].classList.remove('exit');
        itemElements[currentIndex].classList.add('active');

        // O'tish tugagach, eski elementning 'exit' klassini tozalab qo'yamiz
        setTimeout(() => {
            itemElements[prevIndex].classList.remove('exit');
        }, 500); // 0.5s transition vaqtiga moslab

    }, 3000);
}
