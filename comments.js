/* =========================================================
   DONYLOGIC — Google login + Fikrlar (Firebase)
   ========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
    getFirestore, collection, addDoc, deleteDoc, doc,
    onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDiocHJNETksW_WJcrd6CGJfIhA-RK0RMQ",
    authDomain: "donylogic-12f4b.firebaseapp.com",
    projectId: "donylogic-12f4b",
    storageBucket: "donylogic-12f4b.firebasestorage.app",
    messagingSenderId: "661119368716",
    appId: "1:661119368716:web:22c57597f1e523995ff829"
};

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

let currentUser = null;

/* ---------------- auth ---------------- */
googleLoginBtn?.addEventListener("click", async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (err){
        console.error("[fikrlar] login xatosi:", err);
        alert("Kirishda xatolik yuz berdi. Birozdan so'ng qayta urinib ko'ring.");
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
    } else {
        googleLoginBtn.hidden = false;
        userProfile.hidden = true;
        commentForm.hidden = true;
        commentsHint.hidden = false;
    }
    renderComments(lastSnapshotDocs);
});

/* ---------------- add comment ---------------- */
commentForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const text = commentText.value.trim();
    if (!text) return;

    const submitBtn = commentForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;

    try {
        await addDoc(collection(db, "comments"), {
            uid: currentUser.uid,
            name: currentUser.displayName || "Foydalanuvchi",
            photo: currentUser.photoURL || "",
            text: text.slice(0, 500),
            createdAt: serverTimestamp()
        });
        commentText.value = "";
    } catch (err){
        console.error("[fikrlar] yuborishda xatolik:", err);
        alert("Fikringizni yuborib bo'lmadi. Qayta urinib ko'ring.");
    } finally {
        submitBtn.disabled = false;
    }
});

/* ---------------- delete comment ---------------- */
async function deleteComment(id){
    try {
        await deleteDoc(doc(db, "comments", id));
    } catch (err){
        console.error("[fikrlar] o'chirishda xatolik:", err);
        alert("Fikrni o'chirib bo'lmadi. Qayta urinib ko'ring.");
    }
}

/* ---------------- render ---------------- */
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

let lastSnapshotDocs = [];

function renderComments(docs){
    lastSnapshotDocs = docs;
    if (!commentsList) return;

    if (!docs.length){
        commentsList.innerHTML = `<p class="comments-empty">Hali fikrlar yo'q — birinchi bo'lib fikr qoldiring!</p>`;
        return;
    }

    commentsList.innerHTML = docs.map((c) => {
        const isOwn = currentUser && c.uid === currentUser.uid;
        const created = c.createdAt?.toDate ? c.createdAt.toDate() : null;
        return `
            <div class="comment-item" data-id="${c.id}">
                <img class="comment-avatar" src="${escapeHTML(c.photo || "")}" alt="" referrerpolicy="no-referrer">
                <div class="comment-body">
                    <div class="comment-top">
                        <span class="comment-author">${escapeHTML(c.name || "Foydalanuvchi")}</span>
                        <span class="comment-time">${timeAgo(created)}</span>
                    </div>
                    <p class="comment-text">${escapeHTML(c.text || "")}</p>
                    ${isOwn ? `<button class="comment-delete" data-id="${c.id}"><i class="ri-delete-bin-6-line"></i> O'chirish</button>` : ""}
                </div>
            </div>
        `;
    }).join("");

    commentsList.querySelectorAll(".comment-delete").forEach((btn) => {
        btn.addEventListener("click", () => deleteComment(btn.dataset.id));
    });
}

/* ---------------- live listen ---------------- */
try {
    const q = query(collection(db, "comments"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderComments(docs);
    }, (err) => {
        console.error("[fikrlar] o'qishda xatolik:", err);
        if (commentsList) commentsList.innerHTML = `<p class="comments-empty">Fikrlarni yuklab bo'lmadi.</p>`;
    });
} catch (err){
    console.error("[fikrlar] ulanishda xatolik:", err);
}
