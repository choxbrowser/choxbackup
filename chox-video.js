/* =========================================================
   CHOX VIDEO
   Chox-branded video client
   ========================================================= */

(function () {
    "use strict";

    const STORAGE_KEY = "choxVideoState";

    let state = {
        history: [],
        favorites: [],
        subscriptions: []
    };

    // ---------------------------------------------------------
    // Storage
    // ---------------------------------------------------------

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (saved) {
                state = {
                    ...state,
                    ...JSON.parse(saved)
                };
            }
        } catch (error) {
            console.error("Chox Video storage error:", error);
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error("Chox Video save error:", error);
        }
    }

    loadState();

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------

    function escapeHTML(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getYouTubeId(url) {
        if (!url) return null;

        try {
            const parsed = new URL(url);

            if (parsed.hostname.includes("youtu.be")) {
                return parsed.pathname.substring(1);
            }

            if (
                parsed.hostname.includes("youtube.com") ||
                parsed.hostname.includes("youtube-nocookie.com")
            ) {
                return (
                    parsed.searchParams.get("v") ||
                    parsed.pathname.split("/").filter(Boolean).pop()
                );
            }
        } catch (error) {
            const match = url.match(
                /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/
            );

            return match ? match[1] : null;
        }

        return null;
    }

    function youtubeUrl(id) {
        return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    }

    function thumbnailUrl(id) {
        return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
    }

    // ---------------------------------------------------------
    // Main Chox Video launcher
    // ---------------------------------------------------------

    window.openChoxVideo = function (tabId) {
        if (typeof window.tabs === "undefined") {
            console.error("Chox tabs system was not found.");
            return;
        }

        const tab = window.tabs.find(t => t.id === tabId);

        if (!tab) {
            console.error("Chox tab not found:", tabId);
            return;
        }

        tab.type = "chox-video";
        tab.url = "chox://video";
        tab.title = "Chox Video";

        if (typeof window.renderTabs === "function") {
            window.renderTabs();
        }

        renderChoxVideo(tabId);
    };

    // ---------------------------------------------------------
    // Render
    // ---------------------------------------------------------

    window.renderChoxVideo = function (tabId) {
        const container = document.getElementById(`page-${tabId}`);

        if (!container) {
            console.error("Chox Video container not found.");
            return;
        }

        container.innerHTML = `
            <div class="chox-video-app">

                <aside class="chox-video-sidebar">

                    <div class="cv-brand">
                        <div class="cv-brand-icon">C</div>
                        <span>Chox Video</span>
                    </div>

                    <button class="cv-nav active" onclick="cvHome('${tabId}')">
                        <span>⌂</span>
                        Home
                    </button>

                    <button class="cv-nav" onclick="cvSearchFocus('${tabId}')">
                        <span>⌕</span>
                        Search
                    </button>

                    <button class="cv-nav" onclick="cvShowSaved('${tabId}', 'history')">
                        <span>◷</span>
                        History
                    </button>

                    <button class="cv-nav" onclick="cvShowSaved('${tabId}', 'favorites')">
                        <span>★</span>
                        Favorites
                    </button>

                    <button class="cv-nav" onclick="cvShowSaved('${tabId}', 'subscriptions')">
                        <span>♥</span>
                        Subscriptions
                    </button>

                    <div class="cv-sidebar-bottom">
                        <div class="cv-sidebar-label">
                            Chox Video
                        </div>

                        <div class="cv-sidebar-small">
                            Your videos. Your way.
                        </div>
                    </div>

                </aside>

                <main class="chox-video-main">

                    <header class="cv-header">

                        <button
                            class="cv-mobile-menu"
                            onclick="cvToggleSidebar('${tabId}')"
                        >
                            ☰
                        </button>

                        <form
                            class="cv-search"
                            onsubmit="cvRunSearch(event, '${tabId}')"
                        >
                            <input
                                id="cv-search-${tabId}"
                                type="text"
                                placeholder="Search videos..."
                                autocomplete="off"
                            />

                            <button type="submit">
                                🔍
                            </button>
                        </form>

                    </header>

                    <section
                        id="cv-content-${tabId}"
                        class="cv-content"
                    ></section>

                </main>

            </div>
        `;

        cvRenderHome(tabId);
    };

    // ---------------------------------------------------------
    // Home
    // ---------------------------------------------------------

    window.cvHome = function (tabId) {
        cvSetActiveNav(tabId, 0);
        cvRenderHome(tabId);
    };

    window.cvRenderHome = function (tabId) {
        const content = document.getElementById(`cv-content-${tabId}`);

        if (!content) return;

        content.innerHTML = `
            <div class="cv-welcome">
                <div class="cv-welcome-icon">
                    ▶
                </div>

                <h1>Welcome to Chox Video</h1>

                <p>
                    Search and watch videos with the Chox interface.
                </p>

                <button
                    class="cv-primary-button"
                    onclick="cvSearchFocus('${tabId}')"
                >
                    Search videos
                </button>
            </div>

            ${
                state.history.length
                    ? `
                    <div class="cv-section">
                        <div class="cv-section-title">
                            Continue watching
                        </div>

                        <div class="cv-grid">
                            ${state.history
                                .slice(0, 8)
                                .map(video => createVideoCard(video, tabId))
                                .join("")}
                        </div>
                    </div>
                    `
                    : ""
            }

            ${
                state.favorites.length
                    ? `
                    <div class="cv-section">
                        <div class="cv-section-title">
                            Favorites
                        </div>

                        <div class="cv-grid">
                            ${state.favorites
                                .slice(0, 8)
                                .map(video => createVideoCard(video, tabId))
                                .join("")}
                        </div>
                    </div>
                    `
                    : ""
            }
        `;
    };

    // ---------------------------------------------------------
    // Search
    // ---------------------------------------------------------

    window.cvSearchFocus = function (tabId) {
        const input = document.getElementById(`cv-search-${tabId}`);

        if (input) {
            input.focus();
        }

        cvSetActiveNav(tabId, 1);
    };

    window.cvSearch = async function (query, tabId) {
        query = String(query || "").trim();

        if (!query) {
            cvRenderHome(tabId);
            return;
        }

        const content = document.getElementById(`cv-content-${tabId}`);

        if (!content) return;

        content.innerHTML = `
            <div class="cv-loading">
                <div class="cv-spinner"></div>
                <p>Searching Chox Video...</p>
            </div>
        `;

        try {
            const response = await fetch(
                `/api/search?q=${encodeURIComponent(
                    query + " site:youtube.com/watch"
                )}`
            );

            if (!response.ok) {
                throw new Error("Search request failed.");
            }

            const data = await response.json();

            const rawResults =
                data.results ||
                data.web ||
                data.items ||
                [];

            const results = rawResults
                .map(item => {
                    const url =
                        item.url ||
                        item.link ||
                        item.href ||
                        "";

                    const id = getYouTubeId(url);

                    if (!id) return null;

                    return {
                        id,
                        title:
                            item.title ||
                            item.name ||
                            "Untitled video",
                        description:
                            item.description ||
                            item.snippet ||
                            "",
                        url: youtubeUrl(id),
                        thumbnail: thumbnailUrl(id)
                    };
                })
                .filter(Boolean);

            renderSearchResults(results, query, tabId);

        } catch (error) {
            console.error("Chox Video search error:", error);

            content.innerHTML = `
                <div class="cv-error">
                    <div class="cv-error-icon">!</div>

                    <h2>Search unavailable</h2>

                    <p>
                        Chox Video could not reach the search service.
                    </p>

                    <button
                        class="cv-primary-button"
                        onclick="cvSearch('${escapeHTML(query)}', '${tabId}')"
                    >
                        Try again
                    </button>
                </div>
            `;
        }
    };

    window.cvRunSearch = function (event, tabId) {
        event.preventDefault();

        const input = document.getElementById(`cv-search-${tabId}`);

        if (!input) return;

        cvSearch(input.value, tabId);
    };

    function renderSearchResults(results, query, tabId) {
        const content = document.getElementById(`cv-content-${tabId}`);

        if (!content) return;

        if (!results.length) {
            content.innerHTML = `
                <div class="cv-empty">
                    <div class="cv-empty-icon">⌕</div>

                    <h2>No videos found</h2>

                    <p>
                        Try searching for something else.
                    </p>
                </div>
            `;

            return;
        }

        content.innerHTML = `
            <div class="cv-page-heading">
                <h1>Search results</h1>
                <p>
                    Results for
                    <strong>${escapeHTML(query)}</strong>
                </p>
            </div>

            <div class="cv-grid">
                ${results
                    .map(video => createVideoCard(video, tabId))
                    .join("")}
            </div>
        `;
    }

    // ---------------------------------------------------------
    // Video Cards
    // ---------------------------------------------------------

    function createVideoCard(video, tabId) {
        const safeId = escapeHTML(video.id);
        const safeTitle = escapeHTML(video.title);
        const safeDescription = escapeHTML(video.description);

        return `
            <article class="cv-card">

                <button
                    class="cv-thumbnail-button"
                    onclick="cvWatch('${safeId}', '${tabId}')"
                >
                    <img
                        class="cv-thumbnail"
                        src="${thumbnailUrl(safeId)}"
                        alt=""
                        loading="lazy"
                        onerror="this.style.display='none'"
                    />

                    <span class="cv-play">
                        ▶
                    </span>
                </button>

                <div class="cv-card-info">

                    <button
                        class="cv-card-title"
                        onclick="cvWatch('${safeId}', '${tabId}')"
                    >
                        ${safeTitle}
                    </button>

                    ${
                        safeDescription
                            ? `
                            <p class="cv-card-description">
                                ${safeDescription}
                            </p>
                            `
                            : ""
                    }

                    <div class="cv-card-actions">

                        <button
                            onclick="cvWatch('${safeId}', '${tabId}')"
                        >
                            ▶ Watch
                        </button>

                        <button
                            onclick="cvFavorite('${safeId}')"
                        >
                            ★ Save
                        </button>

                    </div>

                </div>

            </article>
        `;
    }

    // ---------------------------------------------------------
    // Watch
    // ---------------------------------------------------------

    window.cvWatch = function (videoId, tabId) {
        if (!videoId) return;

        const video = {
            id: videoId,
            title: "Chox Video",
            description: "",
            url: youtubeUrl(videoId),
            thumbnail: thumbnailUrl(videoId),
            watchedAt: Date.now()
        };

        state.history = [
            video,
            ...state.history.filter(item => item.id !== videoId)
        ].slice(0, 100);

        saveState();

        const content = document.getElementById(`cv-content-${tabId}`);

        if (!content) return;

        content.innerHTML = `
            <div class="cv-player-page">

                <button
                    class="cv-back-button"
                    onclick="cvHome('${tabId}')"
                >
                    ← Back
                </button>

                <div class="cv-player-wrapper">

                    <iframe
                        class="cv-player"
                        src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(
                            videoId
                        )}"
                        title="Chox Video Player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen
                        referrerpolicy="strict-origin-when-cross-origin"
                    ></iframe>

                </div>

                <div class="cv-player-info">

                    <h1>Chox Video</h1>

                    <div class="cv-player-actions">

                        <button
                            onclick="cvFavorite('${escapeHTML(videoId)}')"
                        >
                            ★ Add to Favorites
                        </button>

                        <button
                            onclick="window.open('${youtubeUrl(
                                videoId
                            )}', '_blank', 'noopener,noreferrer')"
                        >
                            Open video
                        </button>

                    </div>

                </div>

            </div>
        `;
    };

    // ---------------------------------------------------------
    // Favorites
    // ---------------------------------------------------------

    window.cvFavorite = function (videoId) {
        if (!videoId) return;

        const existing = state.favorites.find(
            video => video.id === videoId
        );

        if (existing) {
            state.favorites = state.favorites.filter(
                video => video.id !== videoId
            );
        } else {
            state.favorites.unshift({
                id: videoId,
                title: "Chox Video",
                description: "",
                url: youtubeUrl(videoId),
                thumbnail: thumbnailUrl(videoId),
                savedAt: Date.now()
            });
        }

        saveState();

        console.log("Chox Video favorites updated.");
    };

    // ---------------------------------------------------------
    // Saved pages
    // ---------------------------------------------------------

    window.cvShowSaved = function (tabId, type) {
        const navIndex = {
            history: 2,
            favorites: 3,
            subscriptions: 4
        };

        cvSetActiveNav(
            tabId,
            navIndex[type] !== undefined ? navIndex[type] : 0
        );

        cvRenderSaved(tabId, type);
    };

    window.cvRenderSaved = function (tabId, type) {
        const content = document.getElementById(`cv-content-${tabId}`);

        if (!content) return;

        const titles = {
            history: "History",
            favorites: "Favorites",
            subscriptions: "Subscriptions"
        };

        const items = state[type] || [];

        if (!items.length) {
            content.innerHTML = `
                <div class="cv-empty">

                    <div class="cv-empty-icon">
                        ${
                            type === "history"
                                ? "◷"
                                : type === "favorites"
                                ? "★"
                                : "♥"
                        }
                    </div>

                    <h2>
                        No ${escapeHTML(
                            titles[type].toLowerCase()
                        )} yet
                    </h2>

                    <p>
                        Videos you save here will appear in this section.
                    </p>

                </div>
            `;

            return;
        }

        content.innerHTML = `
            <div class="cv-page-heading">
                <h1>${escapeHTML(titles[type])}</h1>
                <p>
                    ${items.length} saved item${
            items.length === 1 ? "" : "s"
        }
                </p>
            </div>

            <div class="cv-grid">
                ${items
                    .map(video => createVideoCard(video, tabId))
                    .join("")}
            </div>
        `;
    };

    // ---------------------------------------------------------
    // Navigation
    // ---------------------------------------------------------

    function cvSetActiveNav(tabId, index) {
        const container = document.getElementById(`page-${tabId}`);

        if (!container) return;

        const buttons = container.querySelectorAll(".cv-nav");

        buttons.forEach((button, i) => {
            button.classList.toggle("active", i === index);
        });
    }

    window.cvToggleSidebar = function (tabId) {
        const container = document.getElementById(`page-${tabId}`);

        if (!container) return;

        const sidebar = container.querySelector(
            ".chox-video-sidebar"
        );

        if (sidebar) {
            sidebar.classList.toggle("open");
        }
    };

    // ---------------------------------------------------------
    // Keyboard shortcuts
    // ---------------------------------------------------------

    document.addEventListener("keydown", function (event) {
        const activeInput =
            document.activeElement &&
            (
                document.activeElement.tagName === "INPUT" ||
                document.activeElement.tagName === "TEXTAREA"
            );

        if (activeInput) return;

        if (event.key === "/") {
            const input = document.querySelector(
                ".cv-search input"
            );

            if (input) {
                event.preventDefault();
                input.focus();
            }
        }
    });

})();
