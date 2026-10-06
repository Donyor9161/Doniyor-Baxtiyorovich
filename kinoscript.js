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

    function resetAndLoad(){
        state.page = 1;
        state.totalPages = 1;
        grid.innerHTML = "";
        emptyEl.hidden = true;
        loadMore();
    }

    async function loadMore(){
        if (state.isLoading) return;
        if (state.page > state.totalPages) return;

        state.isLoading = true;
        loadingEl.hidden = false;
        const myToken = ++state.requestToken;

        try {
            const res = await fetch(buildListUrl());
            if (!res.ok) throw new Error(`TMDB ${res.status}`);
            const data = await res.json();

            if (myToken !== state.requestToken) return; // bu orada boshqa so'rov boshlanib ketgan

            state.totalPages = data.total_pages || 1;
            const results = data.results || [];

            if (state.page === 1 && !results.length){
                emptyEl.hidden = false;
            }

            renderCards(results);
            state.page += 1;
        } catch (err){
            console.error("[kino] ro'yxatni yuklashda xato:", err);
            if (state.page === 1){
                emptyEl.hidden = false;
                emptyEl.textContent = "Ma'lumotlarni yuklab bo'lmadi. Birozdan so'ng qayta urinib ko'ring.";
            }
        } finally {
            if (myToken === state.requestToken){
                state.isLoading = false;
                loadingEl.hidden = true;
            }
        }
    }

    function renderCards(items){
        const mediaType = state.mediaType;
        const html = items.map((item) => {
            const title = item.title || item.name || "Nomsiz";
            const dateStr = item.release_date || item.first_air_date;
            const year = dateStr ? dateStr.slice(0, 4) : "—";
            const rating = item.vote_average ? item.vote_average.toFixed(1) : "—";
            const poster = item.poster_path
                ? `<img src="${IMG_POSTER}${item.poster_path}" alt="${escapeHTML(title)}" loading="lazy">`
                : `<div class="kino-poster-fallback"><i class="ri-image-line"></i></div>`;
            return `
                <article class="kino-card" data-id="${item.id}" data-media="${mediaType}" tabindex="0" role="button" aria-label="${escapeHTML(title)}">
                    <div class="kino-poster">
                        ${poster}
                        <span class="kino-rating"><i class="ri-star-fill"></i> ${rating}</span>
                    </div>
                    <div class="kino-card-info">
                        <h3 class="kino-card-title">${escapeHTML(title)}</h3>
                        <span class="kino-card-year">${year}</span>
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
        modalBody.innerHTML = `<p class="admin-loading">Yuklanmoqda...</p>`;

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
            ? `<img src="${IMG_POSTER}${item.poster_path}" alt="${escapeHTML(title)}">`
            : `<div class="kino-poster-fallback"><i class="ri-image-line"></i></div>`;

        const cast = (item.credits && item.credits.cast ? item.credits.cast.slice(0, 8) : []);
        const castHTML = cast.length ? `
            <div class="kino-modal-section-title">Bosh rollarda</div>
            <div class="kino-modal-cast">
                ${cast.map((c) => `
                    <div class="kino-cast-item">
                        <div class="kino-cast-avatar">
                            ${c.profile_path ? `<img src="${IMG_PROFILE}${c.profile_path}" alt="${escapeHTML(c.name)}">` : `<i class="ri-user-3-line"></i>`}
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
        modalOverlay.hidden = true;
        document.body.classList.remove("scroll-locked");
        modalBody.innerHTML = "";
    }
    modalClose.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
    });

    /* ---------------- ishga tushirish ---------------- */
    renderChips();
    loadMore();
})();
