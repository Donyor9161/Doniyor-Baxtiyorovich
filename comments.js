/* =========================================================
   DONYLOGIC — Google/GitHub login + Fikrlar + Admin Panel + Banner
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

const AUTHOR_EMAIL = "donylogicstudios@gmail.com";  // Bosh muallif
const MANAGER_EMAIL = "qwdonyor@gmail.com";         // Kommunitet-menejer

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

function T(key){
    return window.DonylogicI18n ? window.DonylogicI18n.t(key) : key;
}

let currentUser = null;
let allComments = [];
let bannerInterval = null;

/* ---------------- auth flow ---------------- */
let justLoggedIn = false;

googleLoginBtn?.addEventListener("click", () => loginWith(provider, "Google"));
githubLoginBtn?.addEventListener("click", () => loginWith(githubProvider, "GitHub"));

async function loginWith(authProvider, label){
    try {
        const result = await signInWithPopup(auth, authProvider);
        if (result?.user){
            justLoggedIn = true;
        }
    } catch (err){
        console.error(`[fikrlar] ${label} login xatosi:`, err);
    }
}

logoutBtn?.addEventListener("click", async () => {
    try { await signOut(auth); }
    catch (err){ console.error("[fikrlar] chiqish xatosi:", err); }
});

onAuthStateChanged(auth, (user) => {
    if (!user){
        signInAnonymously(auth).catch((err) => console.error(err));
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
    }

    setupAdminPanel(user);
    setupAnnouncementsBanner(user);
    countVisitOnce();
    renderComments();
});

/* ---------------- visits ---------------- */
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
        console.error(err);
    }
}

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
        return false;
    }
}

function animateCount(el, to){
    if (!el) return;
    const from = Number(el.dataset.val || 0);
    if (from === to) return;
    el.dataset.val = to;
    el.textContent = to.toLocaleString("uz-UZ");
}

try {
    onSnapshot(doc(db, "stats", "registered"), (snap) => {
        const count = snap.exists() ? (snap.data().count || 0) : 0;
        animateCount(registeredCountEl, count);
    });
} catch (err){}

try {
    onSnapshot(doc(db, "stats", "visits"), (snap) => {
        const count = snap.exists() ? (snap.data().count || 0) : 0;
        animateCount(visitsCountEl, count);
    });
} catch (err){}

/* ---------------- Confetti ---------------- */
function celebrateLogin(){
    // confetti kodi...
}

/* ---------------- Comments ---------------- */
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
        alert("Xatolik yuz berdi.");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function deleteComment(id){
    try { await deleteDoc(doc(db, "comments", id)); }
    catch (err){ alert("O'chirib bo'lmadi."); }
}

function timeAgo(date){
    if (!date) return "";
    const diff = Math.max(0, (Date.now() - date.getTime()) / 1000);
    if (diff < 60) return T("just_now");
    if (diff < 3600) return `${Math.floor(diff / 60)} min oldin`;
    return `${Math.floor(diff / 3600)} soat oldin`;
}

function escapeHTML(str){
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function commentRowHTML(c, depth, parentAuthor){
    const isOwn = currentUser && c.uid === currentUser.uid;
    const isViewerAuthor = currentUser && currentUser.email === AUTHOR_EMAIL;
    const canDelete = isOwn || isViewerAuthor;

    let roleBadge = "";
    if (c.email === AUTHOR_EMAIL) {
        roleBadge = `<span class="role-badge author"><i class="ri-verified-badge-fill"></i> Loyiha muallifi</span>`;
    }

    return `
        <div class="comment-item" style="margin-left:${depth * 20}px" data-id="${c.id}">
            <img class="comment-avatar" src="${escapeHTML(c.photo || "")}" alt="">
            <div class="comment-body">
                <div class="comment-top">
                    <span class="comment-author">${escapeHTML(c.name)}</span>
                    ${roleBadge}
                </div>
                <p class="comment-text">${escapeHTML(c.text)}</p>
                ${canDelete ? `<button class="comment-delete" data-id="${c.id}">O'chirish</button>` : ""}
            </div>
        </div>
    `;
}

function renderComments(){
    if (!commentsList) return;
    if (!allComments.length){
        commentsList.innerHTML = `<p class="comments-empty">Hozircha fikrlar yo'q</p>`;
        return;
    }
    commentsList.innerHTML = allComments.map(c => commentRowHTML(c, 0, null)).join('');
    commentsList.querySelectorAll(".comment-delete").forEach(btn => {
        btn.addEventListener("click", () => deleteComment(btn.dataset.id));
    });
}

try {
    const q = query(collection(db, "comments"), orderBy("createdAt", "asc"));
    onSnapshot(q, (snapshot) => {
        allComments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        renderComments();
    });
} catch (err){}

/* ---------------- 2, 3, 4. ADMIN PANEL & ANNOUNCEMENTS BANNER ---------------- */
function setupAdminPanel(user) {
    const openBtn = document.getElementById('openAdminPanelBtn');
    const modal = document.getElementById('authorDashboardModal');
    const closeBtn = document.getElementById('closeAdminPanelBtn');
    const broadcastForm = document.getElementById('broadcastForm');
    const broadcastInput = document.getElementById('broadcastInput');

    if (!modal) return;

    // 1. Oddiy userlarga admin panel tugmasi mutlaqo ko'rinmasin
    if (user && user.email === AUTHOR_EMAIL) {
        if (openBtn) openBtn.hidden = false;
    } else {
        if (openBtn) openBtn.hidden = true;
        modal.hidden = true;
        return;
    }

    if (openBtn) {
        openBtn.onclick = async () => {
            modal.hidden = false;
            document.getElementById('dashVisits').innerText = document.getElementById('visitsCount')?.innerText || '0';
            document.getElementById('dashRegistered').innerText = document.getElementById('registeredCount')?.innerText || '0';
            
            // 3. Muallif uchun maxsus ma'lumotlar: Ro'yxatdan o'tganlar ro'yxati
            const usersListContainer = document.getElementById('adminRegisteredUsersList');
            if (usersListContainer) {
                usersListContainer.innerHTML = "Yuklanmoqda...";
                try {
                    const usersSnap = await getDocs(collection(db, "users"));
                    let userHtml = "<ul style='max-height:150px; overflow-y:auto; text-align:left; font-size:13px;'>";
                    usersSnap.forEach(docSnap => {
                        const uData = docSnap.data();
                        userHtml += `<li><b>${escapeHTML(uData.name || 'User')}</b> (${escapeHTML(uData.email || 'Nomaʼlum')} )</li>`;
                    });
                    userHtml += "</ul>";
                    usersListContainer.innerHTML = userHtml;
                } catch(e) {
                    usersListContainer.innerHTML = "Ro'yxatni olishda xatolik.";
                }
            }
        };
    }

    if (closeBtn) closeBtn.onclick = () => { modal.hidden = true; };

    // 2. Muallif xabar yuborganda Firestore'ga yozish va barchaga alert chiqarish
    if (broadcastForm) {
        broadcastForm.onsubmit = async (e) => {
            e.preventDefault();
            const text = broadcastInput.value.trim();
            if (!text) return;

            try {
                // Oxirgi xabarlarni limit 5 qilish uchun avval eskirganlarini tozalash ham mumkin
                await addDoc(collection(db, "announcements"), {
                    text: text,
                    createdAt: serverTimestamp()
                });
                broadcastInput.value = '';
                modal.hidden = true;
                alert("E'lon muvaffaqiyatli yuborildi va barchaga tarqatildi!");
            } catch (err) {
                console.error("Xatolik:", err);
            }
        };
    }
}

/* 4. Banner va har 3 sekundda 5 ta xabarni almashtirib ko'rsatish */
function setupAnnouncementsBanner(user) {
    let bannerContainer = document.getElementById('donylogicAnnouncementsBanner');
    
    // Muallifga banner ko'rinmaydi
    if (user && user.email === AUTHOR_EMAIL) {
        if (bannerContainer) bannerContainer.style.display = 'none';
        return;
    }

    // Agar HTML da banner elementi bo'lmasa, uni Donylogic logosi yoniga avtomatik yaratamiz
    if (!bannerContainer) {
        const logoEl = document.querySelector('.logo, img[alt*="Logo"], [class*="logo"]'); 
        bannerContainer = document.createElement('div');
        bannerContainer.id = 'donylogicAnnouncementsBanner';
        bannerContainer.style.cssText = "margin-left: 15px; color: #4fd8ff; font-size: 14px; font-weight: 500; display: inline-block; max-width: 350px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
        
        if (logoEl && logoEl.parentNode) {
            logoEl.parentNode.insertBefore(bannerContainer, logoEl.nextSibling);
        } else {
            document.body.prepend(bannerContainer);
        }
    }

    bannerContainer.style.display = 'inline-block';

    // Real-time e'lonlarni tinglash (Faqat oxirgi 5 tasi saqlanadi, 6-chisi o'chiriladi)
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(5));
    
    onSnapshot(q, (snapshot) => {
        let messages = [];
        let docsToDelete = [];

        snapshot.docs.forEach((docSnap, index) => {
            messages.push(docSnap.data().text);
        });

        // 2-talab: Har safar yangi xabar kelganda hamma user ekraniga alert chiqishi
        // (Faqatgina oxirgi qo'shilgan xabar bo'yicha tekshiramiz)
        if (!window.lastAlertedId && snapshot.docs.length > 0) {
            window.lastAlertedId = snapshot.docs[0].id;
        } else if(snapshot.docs.length > 0 && window.lastAlertedId !== snapshot.docs[0].id) {
            window.lastAlertedId = snapshot.docs[0].id;
            alert("📢 Loyiha muallifidan xabar:\n\n" + snapshot.docs[0].data().text);
        }

        if (bannerInterval) clearInterval(bannerInterval);
        if (messages.length === 0) {
            bannerContainer.innerHTML = "";
            return;
        }

        let currentIndex = 0;
        bannerContainer.innerHTML = `🔔 Loyiha muallifi: ${escapeHTML(messages[currentIndex])}`;

        // 4-talab: Har 3 sekundda ketma-ket almashib turishi
        if (messages.length > 1) {
            bannerInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % messages.length;
                bannerContainer.innerHTML = `🔔 Loyiha muallifi: ${escapeHTML(messages[currentIndex])}`;
            }, 3000);
        }
    });
}
