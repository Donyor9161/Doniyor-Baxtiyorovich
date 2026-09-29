/* =========================================================
   KINO VA SERIALLAR BAZASI — TMDB API integration
   ========================================================= */
(() => {
    "use strict";

    // ——— TMDB konfiguratsiya ———
    // O'zingizning API kalitingizni qo'ying: https://www.themoviedb.org/settings/api
    const TMDB_KEY  = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3MmQ5YTUyYmY0ZDFhZGYxNjBhMjRhN2MzYjk2OTk1NCIsIm5iZiI6MTc1MDc2MjI2Mi40Miwic3ViIjoiNjgzYjMzNTY2MTA5NjBiOTQxYmE5MDg1Iiwic2NvcGVzIjpbImFwaV9yZWFkX2FjY2VzcyJdLCJ2ZXJzaW9uIjoxfQ.W6OT_2gy_S4OY1qlEL7Lia2bIu7-n9sEIPT0ov15gH8";
    const TMDB_BASE = "https://api.themoviedb.org/3";
    const IMG_BASE  = "https://image.tmdb.org/t/p";
    const LANG      = "uz-UZ";
    const LANG_FB   = "en-US"; // fallback

    // ——— DOM elementlari ———
    const searchInput  = document.getElementById("kinoSearch");
    const searchClear  = document.getElementById("kinoSearchClear");
    const tabsWrap     = document.getElementById("kinoTabs");
    const genresWrap   = document.getElementById("kinoGenres");
    const grid         = document.getElementById("kinoGrid");
    const loadMoreBtn  = document.getElementById("kinoLoadMore");
    const loadingEl    = document.getElementById("kinoLoading");
    const emptyEl      = document.getElementById("kinoEmpty");
    const resultsInfo  = document.getElementById("kinoResultsInfo");
    const modalOverlay = document.getElementById("kinoModal");
    const modalContent = document.getElementById("kinoModalContent");
    const modalClose   = document.getElementById("kinoModalClose");

    if (!grid) return; // sahifa topilmasa chiqib ketsin

    // ——— Holat ———
    let currentType  = "movie";
    let currentGenre = "";
    let currentQuery = "";
    let currentPage  = 1;
    let totalPages   = 1;
    let isLoading    = false;

    // ——— Janr nomlari (o'zbekcha) ———
    const genreNamesUz = {
        28: "Jangari", 12: "Sarguzasht", 16: "Animatsiya", 35: "Komediya",
        80: "Jinoyat", 99: "Hujjatli", 18: "Drama", 10751: "Oilaviy",
        14: "Fantaziya", 36: "Tarixiy", 27: "Dahshat", 10402: "Musiqiy",
        9648: "Sirli", 10749: "Romantik", 878: "Ilmiy-fantastik",
        10770: "TV film", 53: "Triller", 10752: "Urush", 37: "Vestern",
        10759: "Jangari & Sarguzasht", 10762: "Bolalar", 10763: "Yangiliklar",
        10764: "Realiti", 10765: "Ilmiy-fantastik & Fantaziya",
        10766: "Serial", 10767: "Tok-shou", 10768: "Urush & Siyosat"
    };

    // ——— API so'rovlar ———
    function tmdbHeaders() {
        return {
            accept: "application/json",
            Authorization: `Bearer ${TMDB_KEY}`
        };
    }

    async function tmdbFetch(path, params = {}) {
        const url = new URL(`${TMDB_BASE}${path}`);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
        const res = await fetch(url, { headers: tmdbHeaders() });
        if (!res.ok) throw new Error(`TMDB xato: ${res.status}`);
        return res.json();
    }

    // ——— Janrlarni yuklash ———
    async function loadGenres() {
        try {
            const data = await tmdbFetch(`/genre/${currentType}/list`, { language: LANG });
            renderGenres(data.genres || []);
        } catch (e) {
            console.error("Janrlar yuklanmadi:", e);
        }
    }

    function renderGenres(genres) {
        genresWrap.innerHTML = '<button class="genre-btn is-active" data-genre="">Barchasi</button>';
        genres.forEach(g => {
            const btn = document.createElement("button");
            btn.className = "genre-btn";
            btn.dataset.genre = g.id;
            btn.textContent = genreNamesUz[g.id] || g.name;
            genresWrap.appendChild(btn);
        });
    }

    // ——— Kinolarni yuklash ———
    async function loadItems(append = false) {
        if (isLoading) return;
        isLoading = true;

        if (!append) {
            grid.innerHTML = "";
            currentPage = 1;
            showLoading(true);
            showEmpty(false);
            loadMoreBtn.hidden = true;
            resultsInfo.hidden = true;
        }

        try {
            let data;
            if (currentQuery) {
                // Qidiruv
                data = await tmdbFetch(`/search/${currentType}`, {
                    query: currentQuery,
                    language: LANG,
                    page: currentPage,
                    include_adult: false
                });
            } else if (currentGenre) {
                // Janr bo'yicha
                data = await tmdbFetch(`/discover/${currentType}`, {
                    with_genres: currentGenre,
                    language: LANG,
                    page: currentPage,
                    sort_by: "popularity.desc",
                    include_adult: false
                });
            } else {
                // Trendlar
                data = await tmdbFetch(`/trending/${currentType}/week`, {
                    language: LANG,
                    page: currentPage
                });
            }

            totalPages = data.total_pages || 1;
            const items = data.results || [];

            if (!append && items.length === 0) {
                showEmpty(true);
            } else {
                showEmpty(false);
                renderCards(items, append);
            }

            // Qidiruv natijasi soni
            if (currentQuery && data.total_results > 0) {
                resultsInfo.textContent = `${data.total_results} ta natija topildi`;
                resultsInfo.hidden = false;
            } else {
                resultsInfo.hidden = true;
            }

            loadMoreBtn.hidden = currentPage >= totalPages;
        } catch (e) {
            console.error("Yuklanmadi:", e);
            if (!append) showEmpty(true);
        } finally {
            showLoading(false);
            isLoading = false;
        }
    }

    // ——— Kartochkalar ———
    function renderCards(items, append) {
        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const card = document.createElement("div");
            card.className = "kino-card";
            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");

            const title = item.title || item.name || "Nomsiz";
            const date = item.release_date || item.first_air_date || "";
            const year = date ? date.slice(0, 4) : "—";
            const rating = item.vote_average ? item.vote_average.toFixed(1) : "—";
            const ratingNum = item.vote_average || 0;
            const ratingClass = ratingNum >= 7.5 ? "high" : ratingNum >= 5.5 ? "mid" : "low";
            const posterPath = item.poster_path;
            const type = currentType === "movie" ? "Film" : "Serial";

            card.innerHTML = `
                ${posterPath
                    ? `<div class="kino-card-poster"><img src="${IMG_BASE}/w500${posterPath}" alt="${title}" loading="lazy"><div class="kino-card-rating ${ratingClass}"><i class="ri-star-fill"></i> ${rating}</div></div>`
                    : `<div class="kino-no-poster"><i class="ri-film-line"></i></div><div class="kino-card-rating ${ratingClass}" style="position:absolute"><i class="ri-star-fill"></i> ${rating}</div>`
                }
                <div class="kino-card-info">
                    <div class="kino-card-title">${title}</div>
                    <div class="kino-card-meta">
                        <span class="kino-card-year"><i class="ri-calendar-line"></i> ${year}</span>
                        <span class="kino-card-type">${type}</span>
                    </div>
                </div>
            `;

            // Klikni saqlash uchun item ma'lumotlarini closure orqali
            const itemId = item.id;
            const itemType = currentType;
            card.addEventListener("click", () => openModal(itemId, itemType));
            card.addEventListener("keydown", e => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openModal(itemId, itemType);
                }
            });

            fragment.appendChild(card);
        });

        if (append) {
            grid.appendChild(fragment);
        } else {
            grid.innerHTML = "";
            grid.appendChild(fragment);
        }
    }

    // ——— Modal ———
    async function openModal(id, type) {
        modalOverlay.hidden = false;
        document.body.style.overflow = "hidden";
        modalContent.innerHTML = `
            <div class="kino-loading" style="padding: 80px 0">
                <div class="kino-spinner-wrap"><i class="ri-loader-4-line kino-spinner"></i></div>
                <span>Yuklanmoqda...</span>
            </div>
        `;

        try {
            // Ma'lumotni uz tilida yuklash, fallback en
            let data = await tmdbFetch(`/${type}/${id}`, { language: LANG });
            if (!data.overview) {
                const fb = await tmdbFetch(`/${type}/${id}`, { language: LANG_FB });
                data.overview = fb.overview;
            }

            const title = data.title || data.name || "Nomsiz";
            const originalTitle = data.original_title || data.original_name || "";
            const date = data.release_date || data.first_air_date || "";
            const year = date ? date.slice(0, 4) : "—";
            const rating = data.vote_average ? data.vote_average.toFixed(1) : "—";
            const voteCount = data.vote_count || 0;
            const runtime = data.runtime || (data.episode_run_time && data.episode_run_time[0]) || null;
            const genres = (data.genres || []).map(g => genreNamesUz[g.id] || g.name);
            const overview = data.overview || "Ma'lumot mavjud emas.";
            const backdrop = data.backdrop_path ? `${IMG_BASE}/w1280${data.backdrop_path}` : "";
            const poster = data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : "";
            const status = data.status || "";
            const seasons = data.number_of_seasons || null;
            const episodes = data.number_of_episodes || null;
            const companies = (data.production_companies || []).map(c => c.name).slice(0, 3).join(", ");
            const countries = (data.production_countries || []).map(c => c.name).join(", ");
            const popularity = data.popularity ? Math.round(data.popularity) : null;

            // Status ni o'zbekchaga
            const statusMap = {
                "Released": "Chiqarilgan", "Returning Series": "Davom etmoqda",
                "Ended": "Tugallangan", "Canceled": "Bekor qilingan",
                "In Production": "Ishlab chiqilmoqda", "Planned": "Rejalashtirilgan",
                "Post Production": "Post-ishlov berish", "Rumored": "Mish-mish"
            };
            const statusUz = statusMap[status] || status;

            modalContent.innerHTML = `
                ${backdrop ? `<div class="kino-modal-backdrop"><img src="${backdrop}" alt=""></div>` : '<div style="height:40px"></div>'}
                <div class="kino-modal-detail">
                    <div class="kino-modal-header">
                        ${poster ? `<div class="kino-modal-poster-wrap"><img src="${poster}" alt="${title}"></div>` : ''}
                        <div class="kino-modal-title-block">
                            <h2 class="kino-modal-title">${title} ${originalTitle && originalTitle !== title ? `<em>(${originalTitle})</em>` : ''}</h2>
                            <div class="kino-modal-tags">
                                ${genres.map(g => `<span class="kino-modal-tag">${g}</span>`).join('')}
                            </div>
                            <div class="kino-modal-stats">
                                <span class="kino-modal-stat"><i class="ri-star-fill kino-modal-star"></i> <strong>${rating}</strong> (${voteCount.toLocaleString()})</span>
                                <span class="kino-modal-stat"><i class="ri-calendar-line"></i> <strong>${year}</strong></span>
                                ${runtime ? `<span class="kino-modal-stat"><i class="ri-time-line"></i> <strong>${runtime} daq.</strong></span>` : ''}
                                ${statusUz ? `<span class="kino-modal-stat"><i class="ri-information-line"></i> ${statusUz}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="kino-modal-overview-label">Tavsif</div>
                    <p class="kino-modal-overview">${overview}</p>

                    <div class="kino-modal-extra">
                        ${seasons ? `<div class="kino-modal-extra-card"><div class="kino-modal-extra-label">Fasllar / Epizodlar</div><div class="kino-modal-extra-value">${seasons} fasl · ${episodes} epizod</div></div>` : ''}
                        ${companies ? `<div class="kino-modal-extra-card"><div class="kino-modal-extra-label">Kompaniya</div><div class="kino-modal-extra-value">${companies}</div></div>` : ''}
                        ${countries ? `<div class="kino-modal-extra-card"><div class="kino-modal-extra-label">Mamlakat</div><div class="kino-modal-extra-value">${countries}</div></div>` : ''}
                        ${popularity ? `<div class="kino-modal-extra-card"><div class="kino-modal-extra-label">Mashhurlik</div><div class="kino-modal-extra-value">${popularity.toLocaleString()} ball</div></div>` : ''}
                    </div>
                </div>
            `;
        } catch (e) {
            console.error("Modal yuklanmadi:", e);
            modalContent.innerHTML = `
                <div class="kino-empty" style="padding: 60px 20px">
                    <i class="ri-error-warning-line"></i>
                    <p>Ma'lumot yuklanmadi</p>
                    <span>Iltimos, qaytadan urinib ko'ring</span>
                </div>
            `;
        }
    }

    function closeModal() {
        modalOverlay.hidden = true;
        document.body.style.overflow = "";
    }

    // ——— UI helpers ———
    function showLoading(show) {
        loadingEl.hidden = !show;
    }
    function showEmpty(show) {
        emptyEl.hidden = !show;
    }

    // ——— Debounce ———
    function debounce(fn, ms) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    // ——— Event listeners ———

    // Tablar
    tabsWrap.addEventListener("click", e => {
        const tab = e.target.closest(".kino-tab");
        if (!tab || tab.classList.contains("is-active")) return;
        tabsWrap.querySelectorAll(".kino-tab").forEach(t => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        currentType = tab.dataset.type;
        currentGenre = "";
        currentQuery = "";
        searchInput.value = "";
        searchClear.hidden = true;
        loadGenres();
        loadItems();
    });

    // Janrlar
    genresWrap.addEventListener("click", e => {
        const btn = e.target.closest(".genre-btn");
        if (!btn || btn.classList.contains("is-active")) return;
        genresWrap.querySelectorAll(".genre-btn").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        currentGenre = btn.dataset.genre;
        currentQuery = "";
        searchInput.value = "";
        searchClear.hidden = true;
        loadItems();
    });

    // Qidiruv
    const doSearch = debounce(() => {
        currentQuery = searchInput.value.trim();
        searchClear.hidden = !currentQuery;
        if (currentQuery) {
            // Janr filtrini tiklash
            genresWrap.querySelectorAll(".genre-btn").forEach(b => b.classList.remove("is-active"));
            const allBtn = genresWrap.querySelector('[data-genre=""]');
            if (allBtn) allBtn.classList.add("is-active");
            currentGenre = "";
        }
        loadItems();
    }, 400);

    searchInput.addEventListener("input", doSearch);

    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchClear.hidden = true;
        currentQuery = "";
        loadItems();
        searchInput.focus();
    });

    // Ko'proq yuklash
    loadMoreBtn.addEventListener("click", () => {
        currentPage++;
        loadItems(true);
    });

    // Modal yopish
    modalClose.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", e => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
    });

    // ——— Tema sinxronlash ———
    function initKinoTheme() {
        const toggle = document.getElementById("themeToggle");
        const STORAGE_KEY = "donylogic_theme";
        toggle?.addEventListener("click", () => {
            const current = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
            const next = current === "light" ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem(STORAGE_KEY, next);
            window.dispatchEvent(new CustomEvent("donylogic:themechange", { detail: { theme: next } }));
        });
    }

    // ——— Boshlash ———
    initKinoTheme();
    loadGenres();
    loadItems();
})();
