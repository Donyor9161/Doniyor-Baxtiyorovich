/* =========================================================
   DONYLOGIC — Google login + Fikrlar + Hisoblagichlar (Firebase)
   ========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup,
    signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, deleteDoc, doc, getDoc, getDocs,
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

const PRUNE_AFTER_DAYS = 120;                      // shundan eski izohlar o'chirishga ruxsat etiladi
const PRUNE_CHECK_EVERY_MS = 24 * 60 * 60 * 1000;  // brauzerda kuniga 1 marta tekshirish

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

/* ---------------- DOM refs ---------------- */
const googleLoginBtn = document.getElementById("googleLoginBtn");
const userProfile    = document.getElementById("userProfile");
const userAvatar     = document.getElementById("userAvatar");
const userName       = document.getElementById("userName");
const logoutBtn      = document.getElementById("logoutBtn");
const commentForm    = document.getElementById("commentForm");
const commentText    = document.getElementById("commentText");
const commentsHint   = document.getElementById("commentsHint");
const commentsList   = document.getElementById("commentsList");
const registeredCountEl = document.getElementById("registeredCount");
const donationsTotalEl  = document.getElementById("donationsTotal");

let currentUser = null;
let allComments = [];

/* ---------------- auth: popup flow ---------------- */
let justLoggedIn = false;

googleLoginBtn?.addEventListener("click", async () => {
    try {
        const result = await signInWithPopup(auth, provider);
        if (result?.user){
            justLoggedIn = true;
        }
    } catch (err){
        console.error("[fikrlar] login xatosi:", err);
        if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request"){
            alert("Kirishda xatolik yuz berdi. Konsolni (F12) tekshiring yoki qayta urinib ko'ring.");
        }
    }
});

logoutBtn?.addEventListener("click", async () => {
    try { await signOut(auth); }
    catch (err){ console.error("[fikrlar] chiqish xatosi:", err); }
});

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user){
        googleLoginBtn.hidden = true;
        userProfile.hidden = false;
        userAvatar.src = user.photoURL || "";
        userName.textContent = user.displayName || "Foydalanuvchi";
        commentForm.hidden = false;
        commentsHint.hidden = true;

        registerUniqueUser(user.uid).then(() => {
            if (justLoggedIn){
                celebrateLogin();
                justLoggedIn = false;
            }
        });

        maybePruneOldComments();
    } else {
        googleLoginBtn.hidden = false;
        userProfile.hidden = true;
        commentForm.hidden = true;
        commentsHint.hidden = false;
    }
    renderComments();
});

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

            tx.set(userRef, { createdAt: serverTimestamp() });
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

/* ---------------- render (with nested replies) ---------------- */
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

function commentRowHTML(c, depth){
    const isOwn = currentUser && c.uid === currentUser.uid;
    const created = c.createdAt?.toDate ? c.createdAt.toDate() : null;
    return `
        <div class="comment-item" style="margin-left:${depth * 34}px" data-id="${c.id}">
            <img class="comment-avatar" src="${escapeHTML(c.photo || "")}" alt="" referrerpolicy="no-referrer">
            <div class="comment-body">
                <div class="comment-top">
                    <span class="comment-author">${escapeHTML(c.name || "Foydalanuvchi")}</span>
                    <span class="comment-time">${timeAgo(created)}</span>
                </div>
                <p class="comment-text">${escapeHTML(c.text || "")}</p>
                <div class="comment-actions">
                    ${currentUser ? `<button class="comment-reply-btn" data-id="${c.id}"><i class="ri-reply-line"></i> Javob yozish</button>` : ""}
                    ${isOwn ? `<button class="comment-delete" data-id="${c.id}"><i class="ri-delete-bin-6-line"></i> O'chirish</button>` : ""}
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
        return;
    }

    const byParent = new Map();
    allComments.forEach((c) => {
        const key = c.parentId || "root";
        if (!byParent.has(key)) byParent.set(key, []);
        byParent.get(key).push(c);
    });

    let html = "";
    function walk(parentKey, depth){
        const items = byParent.get(parentKey) || [];
        items.forEach((c) => {
            html += commentRowHTML(c, depth);
            walk(c.id, depth + 1);
        });
    }
    walk("root", 0);

    commentsList.innerHTML = html;

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
