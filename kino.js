/* =========================================================
   DONYLOGIC — Kinolar va seriallar bazasi (TMDB API)
   ========================================================= */
(() => {
    "use strict";

    // TMDB'ning v3 "API key"i — bu kalit ochiq (frontend) kodda ishlatilishi uchun
    // mo'ljallangan, Firebase apiKey kabi. Faqat o'qish huquqi beradi, maxfiy emas.
    const TMDB_API_KEY = "d76e12be5c55f3c980982a5f51907a97";
    const TMDB_BASE = "https://api.themoviedb.org/3";
    const IMG_POSTER = "https://image.tmdb.org/t/p/w342";
    const IMG_BACKDROP = "https://image.tmdb.org/t/p/w780";
    const IMG_BACKDROP_LARGE = "https://image.tmdb.org/t/p/w1280";
    const IMG_PROFILE = "https://image.tmdb.org/t/p/w185";
    const LANG = "uz-UZ"; // tarjima yo'q bo'lsa, TMDB o'zi inglizchaga tushadi

    const CATEGORIES = {
        movie: [
            { key: "trending", label: "Trend" },
            { key: "popular", label: "Mashhur" },
            { key: "top_rated", label: "Eng yuqori reyting" },
            { key: "now_playing", label: "Hozir kinoteatrlarda" }
        ],
        tv: [
            { key: "trending", label: "Trend" },
            { key: "popular", label: "Mashhur" },
            { key: "top_rated", label: "Eng yuqori reyting" },
            { key: "airing_today", label: "Bugun efirda" }
        ]
    };

    const state = {
        mediaType: "movie",
        category: "trending",
        query: "",
        page: 1,
        totalPages: 1,
        isLoading: false,
        requestToken: 0 // eski so'rovlar natijasi kech kelib, yangi natijani bosib ketmasligi uchun
    };

    const genreCache = { movie: null, tv: null };

    const grid = document.getElementById("kinoGrid");
    const emptyEl = document.getElementById("kinoEmpty");
    const loadingEl = document.getElementById("kinoLoading");
    const sentinel = document.getElementById("kinoSentinel");
    const mediaTabs = document.getElementById("kinoMediaTabs");
    const chipsHost = document.getElementById("kinoCategoryChips");
    const searchForm = document.getElementById("kinoSearchForm");
    const searchInput = document.getElementById("kinoSearchInput");
    const searchClear = document.getElementById("kinoSearchClear");
    const modalOverlay = document.getElementById("kinoModalOverlay");
    const modalBody = document.getElementById("kinoModalBody");
    const modalClose = document.getElementById("kinoModalClose");
    const top10Section = document.getElementById("kinoTop10");
    const top10Row = document.getElementById("kinoTop10Row");

    if (!grid) return; // bu sahifa kino.html emas

    function escapeHTML(str){
        const div = document.createElement("div");
        div.textContent = str == null ? "" : String(str);
        return div.innerHTML;
    }

    /* ---------------- janr kategoriyasi tugmalari ---------------- */
    function renderChips(){
        chipsHost.innerHTML = CATEGORIES[state.mediaType].map((c) => `
            <button type="button" class="kino-chip${c.key === state.category ? " is-active" : ""}" data-key="${c.key}">${c.label}</button>
        `).join("");
        chipsHost.querySelectorAll(".kino-chip").forEach((btn) => {
            btn.addEventListener("click", () => {
                if (state.query) {
                    state.query = "";
                    searchInput.value = "";
                    searchClear.hidden = true;
                }
                state.category = btn.dataset.key;
                chipsHost.querySelectorAll(".kino-chip").forEach((b) => b.classList.toggle("is-active", b === btn));
                resetAndLoad();
            });
        });
    }

    /* ---------------- media-turi tablari (Kinolar / Seriallar) ---------------- */
    mediaTabs.querySelectorAll(".kino-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
            if (tab.classList.contains("is-active")) return;
            mediaTabs.querySelectorAll(".kino-tab").forEach((t) => t.classList.toggle("is-active", t === tab));
            state.mediaType = tab.dataset.media;
            state.category = "trending";
            state.query = "";
            searchInput.value = "";
            searchClear.hidden = true;
            renderChips();
            resetAndLoad();
        });
    });

    /* ---------------- qidiruv (debounce bilan) ---------------- */
    let searchTimer = null;
    searchInput.addEventListener("input", () => {
        searchClear.hidden = !searchInput.value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            state.query = searchInput.value.trim();
            resetAndLoad();
        }, 350);
    });
    searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        clearTimeout(searchTimer);
        state.query = searchInput.value.trim();
        resetAndLoad();
    });
    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchClear.hidden = true;
        state.query = "";
        searchInput.focus();
        resetAndLoad();
    });

    /* ---------------- TMDB so'rovlari ---------------- */
    function buildListUrl(){
        const base = `${TMDB_BASE}`;
        if (state.query){
            return `${base}/search/${state.mediaType}?api_key=${TMDB_API_KEY}&language=${LANG}&query=${encodeURIComponent(state.query)}&page=${state.page}&include_adult=false`;
        }
        if (state.category === "trending"){
            return `${base}/trending/${state.mediaType}/week?api_key=${TMDB_API_KEY}&language=${LANG}&page=${state.page}`;
        }
        return `${base}/${state.mediaType}/${state.category}?api_key=${TMDB_API_KEY}&language=${LANG}&page=${state.page}`;
    }

    async function fetchGenres(mediaType){
        if (genreCache[mediaType]) return genreCache[mediaType];
        try {
            const res = await fetch(`${TMDB_BASE}/genre/${mediaType}/list?api_key=${TMDB_API_KEY}&language=${LANG}`);
            const data = await res.json();
            const map = {};
            (data.genres || []).forEach((g) => { map[g.id] = g.name; });
            genreCache[mediaType] = map;
            return map;
        } catch (err){
            console.error("[kino] janrlarni yuklashda xato:", err);
            genreCache[mediaType] = {};
            return {};
        }
    }

    function skeletonHTML(count){
        return Array.from({ length: count }, () => `<div class="kino-skeleton"></div>`).join("");
    }

    function resetAndLoad(){
        state.page = 1;
        state.totalPages = 1;
        emptyEl.hidden = true;

        // tab/chip/qidiruv almashganda to'satdan sakrab qolmasligi uchun — avval yumshoq
        // so'nadi, keyin skelet-plitkalar bilan almashadi
        grid.classList.add("is-switching");
        setTimeout(() => {
            grid.innerHTML = skeletonHTML(14);
            grid.classList.remove("is-switching");
            loadMore();
        }, 160);
    }

    async function loadMore(){
        if (state.isLoading) return;
        if (state.page > state.totalPages) return;

        state.isLoading = true;
        loadingEl.hidden = false;
        const myToken = ++state.requestToken;

        // SOQCHI (watchdog): agar 10 soniyadan keyin ham javob kelmasa (masalan, tarmoq
        // tiqilib qolsa yoki so'rov "osilib" qolsa), foydalanuvchiga buni ko'rsatamiz —
        // "Yuklanmoqda..." yozuvi hech qachon abadiy osilib qolmasligi kerak.
        const watchdog = setTimeout(() => {
            if (myToken !== state.requestToken) return;
            loadingEl.innerHTML = `<span>Ulanish juda uzoq davom etmoqda</span> <button type="button" class="kino-retry-btn" id="kinoRetryBtn">Qayta urinish</button>`;
            document.getElementById("kinoRetryBtn")?.addEventListener("click", () => {
                state.isLoading = false;
                loadingEl.innerHTML = `<i class="ri-loader-4-line"></i> Yuklanmoqda...`;
                loadMore();
            });
        }, 10000);

        try {
            const res = await fetch(buildListUrl());
            if (!res.ok) throw new Error(`TMDB ${res.status}`);
            const data = await res.json();

            if (myToken !== state.requestToken) return; // bu orada boshqa so'rov boshlanib ketgan

            state.totalPages = data.total_pages || 1;
            const results = data.results || [];

            if (state.page === 1){
                grid.innerHTML = ""; // skelet-plitkalarni tozalaymiz
                if (!results.length) emptyEl.hidden = false;
            }

            renderCards(results);
            state.page += 1;
        } catch (err){
            console.error("[kino] ro'yxatni yuklashda xato:", err);
            if (state.page === 1){
                grid.innerHTML = "";
                emptyEl.hidden = false;
                emptyEl.textContent = "Ma'lumotlarni yuklab bo'lmadi. Birozdan so'ng qayta urinib ko'ring.";
            }
        } finally {
            clearTimeout(watchdog);
            if (myToken === state.requestToken){
                state.isLoading = false;
                loadingEl.hidden = true;
                loadingEl.innerHTML = `<i class="ri-loader-4-line"></i> Yuklanmoqda...`;
            }
        }
    }

    function renderCards(items){
        const mediaType = state.mediaType;
        const html = items.map((item, i) => {
            const title = item.title || item.name || "Nomsiz";
            const dateStr = item.release_date || item.first_air_date;
            const year = dateStr ? dateStr.slice(0, 4) : "—";
            const rating = item.vote_average ? item.vote_average.toFixed(1) : "—";
            const poster = item.poster_path
                ? `<img src="${IMG_POSTER}${item.poster_path}" alt="${escapeHTML(title)}" loading="lazy" onload="this.classList.add('is-loaded')">`
                : `<div class="kino-poster-fallback"><i class="ri-image-line"></i></div>`;
            // har bir karta sal kechikib (stagger) paydo bo'ladi — bir vaqtda sakrab chiqmaydi
            const delay = Math.min(i, 20) * 28;
            return `
                <article class="kino-card kino-card-enter" style="animation-delay:${delay}ms" data-id="${item.id}" data-media="${mediaType}" tabindex="0" role="button" aria-label="${escapeHTML(title)}">
                    <div class="kino-poster">
                        ${poster}
                        <span class="kino-rating"><i class="ri-star-fill"></i> ${rating}</span>
                        <div class="kino-tile-overlay">
                            <h3 class="kino-card-title">${escapeHTML(title)}</h3>
                            <span class="kino-card-year">${year}</span>
                        </div>
                    </div>
                </article>
            `;
        }).join("");

        grid.insertAdjacentHTML("beforeend", html);

        grid.querySelectorAll(".kino-card:not([data-wired])").forEach((card) => {
            card.setAttribute("data-wired", "1");
            card.addEventListener("click", () => openModal(card.dataset.id, card.dataset.media));
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " "){
                    e.preventDefault();
                    openModal(card.dataset.id, card.dataset.media);
                }
            });
        });
    }

    /* ---------------- cheksiz skroll ---------------- */
    if ("IntersectionObserver" in window){
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) loadMore();
            });
        }, { rootMargin: "600px 0px" });
        io.observe(sentinel);
    }

    /* ---------------- batafsil modal ---------------- */
    async function openModal(id, mediaType){
        modalOverlay.hidden = false;
        document.body.classList.add("scroll-locked");
        modalBody.innerHTML = `
            <div class="kino-modal-skeleton">
                <div class="kino-skeleton kino-modal-skeleton-backdrop"></div>
                <div class="kino-modal-skeleton-row">
                    <div class="kino-skeleton kino-modal-skeleton-poster"></div>
                    <div class="kino-modal-skeleton-lines">
                        <div class="kino-skeleton kino-modal-skeleton-line" style="width:70%"></div>
                        <div class="kino-skeleton kino-modal-skeleton-line" style="width:40%"></div>
                    </div>
                </div>
            </div>
        `;
        // silliq ochilish animatsiyasi — bir freym kutamiz, shunda transition ishga tushadi
        requestAnimationFrame(() => modalOverlay.classList.add("is-open"));

        try {
            const [detail, genreMap] = await Promise.all([
                fetch(`${TMDB_BASE}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=${LANG}&append_to_response=credits`).then((r) => r.json()),
                fetchGenres(mediaType)
            ]);
            renderModal(detail, mediaType, genreMap);
        } catch (err){
            console.error("[kino] tafsilotlarni yuklashda xato:", err);
            modalBody.innerHTML = `<div class="kino-modal-content"><p>Ma'lumotlarni yuklab bo'lmadi.</p></div>`;
        }
    }

    function renderModal(item, mediaType, genreMap){
        const title = item.title || item.name || "Nomsiz";
        const dateStr = item.release_date || item.first_air_date;
        const year = dateStr ? dateStr.slice(0, 4) : "—";
        const rating = item.vote_average ? item.vote_average.toFixed(1) : "—";
        const voteCount = item.vote_count ? item.vote_count.toLocaleString("uz-UZ") : "0";

        let runtimeLabel = "";
        if (mediaType === "movie" && item.runtime){
            const h = Math.floor(item.runtime / 60);
            const m = item.runtime % 60;
            runtimeLabel = h ? `${h}s ${m}d` : `${m}d`;
        } else if (mediaType === "tv"){
            if (item.number_of_seasons) runtimeLabel = `${item.number_of_seasons} fasl`;
            if (item.episode_run_time && item.episode_run_time[0]) runtimeLabel += (runtimeLabel ? " · " : "") + `${item.episode_run_time[0]}d/qism`;
        }

        const genres = (item.genres && item.genres.length)
            ? item.genres.map((g) => `<span class="kino-genre-chip">${escapeHTML(g.name)}</span>`).join("")
            : "";

        const backdropStyle = item.backdrop_path
            ? `style="background-image:url('${IMG_BACKDROP}${item.backdrop_path}')"`
            : `style="background:var(--navy)"`;

        const posterHTML = item.poster_path
            ? `<img src="${IMG_POSTER}${item.poster_path}" alt="${escapeHTML(title)}" onload="this.classList.add('is-loaded')">`
            : `<div class="kino-poster-fallback"><i class="ri-image-line"></i></div>`;

        const cast = (item.credits && item.credits.cast ? item.credits.cast.slice(0, 8) : []);
        const castHTML = cast.length ? `
            <div class="kino-modal-section-title">Bosh rollarda</div>
            <div class="kino-modal-cast">
                ${cast.map((c) => `
                    <div class="kino-cast-item">
                        <div class="kino-cast-avatar">
                            ${c.profile_path ? `<img src="${IMG_PROFILE}${c.profile_path}" alt="${escapeHTML(c.name)}" onload="this.classList.add('is-loaded')">` : `<i class="ri-user-3-line"></i>`}
                        </div>
                        <div class="kino-cast-name">${escapeHTML(c.name)}</div>
                        <div class="kino-cast-character">${escapeHTML(c.character || "")}</div>
                    </div>
                `).join("")}
            </div>
        ` : "";

        const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${item.id}`;

        modalBody.innerHTML = `
            <div class="kino-modal-backdrop" ${backdropStyle}></div>
            <div class="kino-modal-head">
                <div class="kino-modal-poster">${posterHTML}</div>
                <div class="kino-modal-titleblock">
                    <h2 class="kino-modal-title">${escapeHTML(title)}</h2>
                    ${item.tagline ? `<p class="kino-modal-tagline">${escapeHTML(item.tagline)}</p>` : ""}
                </div>
            </div>
            <div class="kino-modal-content">
                <div class="kino-modal-meta">
                    <span class="kino-meta-rating"><i class="ri-star-fill"></i> ${rating} (${voteCount})</span>
                    <span><i class="ri-calendar-line"></i> ${year}</span>
                    ${runtimeLabel ? `<span><i class="ri-time-line"></i> ${runtimeLabel}</span>` : ""}
                </div>
                <div class="kino-modal-genres">${genres}</div>
                <p class="kino-modal-overview">${escapeHTML(item.overview) || "Tavsif mavjud emas."}</p>
                ${castHTML}
                <a class="kino-modal-link" href="${tmdbUrl}" target="_blank" rel="noopener"><i class="ri-external-link-line"></i> TMDB'da to'liq ko'rish</a>
            </div>
        `;
    }

    function closeModal(){
        modalOverlay.classList.remove("is-open");
        document.body.classList.remove("scroll-locked");
        setTimeout(() => {
            modalOverlay.hidden = true;
            modalBody.innerHTML = "";
        }, 280);
    }
    modalClose.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
    });

    /* ---------------- HERO KARUSEL + BUGUNGI TOP 10 ----------------
       Ikkalasi ham bitta "trending/movie/day" so'rovidan foydalanadi — ortiqcha
       so'rov yubormaslik uchun. */
    const carouselTrack = document.getElementById("kinoCarouselTrack");
    const carouselDots = document.getElementById("kinoCarouselDots");
    let carouselItems = [];
    let carouselIndex = 0;
    let carouselTimer = null;

    async function initCarousel(){
        if (!carouselTrack) return;
        try {
            const res = await fetch(`${TMDB_BASE}/trending/movie/day?api_key=${TMDB_API_KEY}&language=${LANG}`);
            const data = await res.json();
            const results = data.results || [];

            // Muharrir tanlovi (admin paneldan belgilanadi) — karuselda birinchi turadi
            const picked = await fetchEditorPicks();
            const pickedIds = new Set(picked.map((m) => m.id));
            const trending = results.filter((m) => m.backdrop_path && !pickedIds.has(m.id));
            carouselItems = [...picked, ...trending].slice(0, 6);
            if (carouselItems.length) renderCarousel();
            else carouselTrack.innerHTML = "";

            renderTop10(results.slice(0, 10));
        } catch (err){
            console.error("[kino] karusel/TOP10 yuklanmadi:", err);
            carouselTrack.innerHTML = "";
        }
    }

    // Firestore REST orqali ochiq o'qiladi (qoida: site_config — read: true), shuning uchun
    // bu klassik skriptga Firebase SDK ulash shart emas. Xato bo'lsa — jim o'tib ketadi.
    async function fetchEditorPicks(){
        try {
            const url = "https://firestore.googleapis.com/v1/projects/donylogic-12f4b/databases/(default)/documents/site_config/picks";
            const res = await fetch(url);
            if (!res.ok) return [];
            const doc = await res.json();
            const ids = (doc.fields?.ids?.arrayValue?.values || []).map((v) => Number(v.integerValue)).filter(Boolean).slice(0, 6);
            if (!ids.length) return [];
            const movies = await Promise.all(ids.map((id) =>
                fetch(`${TMDB_BASE}/movie/${id}?api_key=${TMDB_API_KEY}&language=${LANG}`).then((r) => r.ok ? r.json() : null).catch(() => null)
            ));
            return movies.filter((m) => m && m.backdrop_path).map((m) => ({ ...m, _pick: true }));
        } catch (err){
            console.warn("[kino] muharrir tanlovi o'qilmadi:", err);
            return [];
        }
    }

    function renderCarousel(){
        carouselTrack.innerHTML = carouselItems.map((m, i) => {
            const title = m.title || m.name || "";
            const overview = m.overview ? (m.overview.length > 150 ? m.overview.slice(0, 150) + "…" : m.overview) : "";
            const rating = m.vote_average ? m.vote_average.toFixed(1) : "—";
            return `
                <div class="kino-carousel-slide${i === 0 ? " is-active" : ""}">
                    <div class="kino-carousel-bg" style="background-image:url('${IMG_BACKDROP_LARGE}${m.backdrop_path}')"></div>
                    <div class="kino-carousel-fade"></div>
                    <div class="kino-carousel-info">
                        <span class="kino-carousel-tag">${m._pick ? '<i class="ri-vip-crown-2-fill"></i> Muharrir tanlovi' : '<i class="ri-fire-fill"></i> Bugungi trend'}</span>
                        <h2>${escapeHTML(title)}</h2>
                        ${overview ? `<p>${escapeHTML(overview)}</p>` : ""}
                        <div class="kino-carousel-actions">
                            <button type="button" class="btn btn-primary kino-carousel-open" data-id="${m.id}"><i class="ri-play-fill"></i> Batafsil</button>
                            <span class="kino-carousel-rating"><i class="ri-star-fill"></i> ${rating}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        carouselDots.innerHTML = carouselItems.map((_, i) => `
            <button type="button" class="kino-carousel-dot${i === 0 ? " is-active" : ""}" data-i="${i}" aria-label="Slayd ${i + 1}"></button>
        `).join("");

        carouselTrack.querySelectorAll(".kino-carousel-open").forEach((btn) => {
            btn.addEventListener("click", () => openModal(btn.dataset.id, "movie"));
        });
        carouselDots.querySelectorAll(".kino-carousel-dot").forEach((dot) => {
            dot.addEventListener("click", () => goToSlide(Number(dot.dataset.i), true));
        });

        startCarouselAuto();
    }

    function goToSlide(i, manual){
        carouselIndex = i;
        carouselTrack.querySelectorAll(".kino-carousel-slide").forEach((s, idx) => s.classList.toggle("is-active", idx === i));
        carouselDots.querySelectorAll(".kino-carousel-dot").forEach((d, idx) => d.classList.toggle("is-active", idx === i));
        if (manual) startCarouselAuto(); // qo'lda bosilganda taymer qaytadan boshlanadi
    }

    function startCarouselAuto(){
        clearInterval(carouselTimer);
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (carouselItems.length < 2) return;
        carouselTimer = setInterval(() => {
            goToSlide((carouselIndex + 1) % carouselItems.length, false);
        }, 5500);
    }

    /* ---------------- Bugungi TOP 10 (Netflix uslubidagi katta raqamlar) ---------------- */
    function renderTop10(items){
        if (!top10Section || !top10Row || !items.length) return;
        top10Section.hidden = false;
        top10Row.innerHTML = items.map((m, i) => {
            const title = m.title || m.name || "";
            const poster = m.poster_path
                ? `<img src="${IMG_POSTER}${m.poster_path}" alt="${escapeHTML(title)}" loading="lazy" onload="this.classList.add('is-loaded')">`
                : `<div class="kino-poster-fallback"><i class="ri-image-line"></i></div>`;
            return `
                <div class="kino-top10-item" data-id="${m.id}" tabindex="0" role="button" aria-label="${escapeHTML(title)}">
                    <span class="kino-top10-rank">${i + 1}</span>
                    <div class="kino-top10-poster">${poster}</div>
                </div>
            `;
        }).join("");

        top10Row.querySelectorAll(".kino-top10-item").forEach((el) => {
            el.addEventListener("click", () => openModal(el.dataset.id, "movie"));
            el.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " "){ e.preventDefault(); openModal(el.dataset.id, "movie"); }
            });
        });
    }

    /* ---------------- ishga tushirish ---------------- */
    renderChips();
    grid.innerHTML = skeletonHTML(14);
    loadMore();
    initCarousel();
})();
