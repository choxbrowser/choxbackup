/* CHOX VIDEO
 * A Chox-branded video client shell inspired by privacy-focused desktop video clients.
 * It uses Chox's existing web-search endpoint and direct video embeds; it does not proxy
 * or bypass network controls.
 */

const CHOX_VIDEO_KEY = "choxVideoState";
let choxVideoState = loadChoxVideoState();

function loadChoxVideoState() {
    try {
        return JSON.parse(localStorage.getItem(CHOX_VIDEO_KEY)) || {
            history: [], favorites: [], subscriptions: []
        };
    } catch (_) {
        return { history: [], favorites: [], subscriptions: [] };
    }
}

function saveChoxVideoState() {
    localStorage.setItem(CHOX_VIDEO_KEY, JSON.stringify(choxVideoState));
}

function openChoxVideo(tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    tab.type = "chox-video";
    tab.title = "Chox Video";
    tab.url = "chox://video";
    tab.history = tab.history || [];
    tab.history.push(tab.url);
    tab.historyIndex = tab.history.length - 1;
    renderChoxVideo(tab);
    updateTabButton(tab);
    if (activeTabId === tab.id) updateAddressBar();
}

function renderChoxVideo(tab, view = "home", payload = "") {
    const page = document.getElementById("page-" + tab.id);
    if (!page) return;

    page.innerHTML = `
        <div class="chox-video-app">
            <aside class="chox-video-sidebar">
                <div class="chox-video-brand"><span>▶</span><b>Chox Video</b></div>
                <button class="cv-nav active" onclick="cvHome('${tab.id}')">⌂ <span>Home</span></button>
                <button class="cv-nav" onclick="cvSearchFocus('${tab.id}')">⌕ <span>Search</span></button>
                <button class="cv-nav" onclick="cvShowSaved('${tab.id}','history')">◷ <span>History</span></button>
                <button class="cv-nav" onclick="cvShowSaved('${tab.id}','favorites')">★ <span>Favorites</span></button>
                <button class="cv-nav" onclick="cvShowSaved('${tab.id}','subscriptions')">♟ <span>Subscriptions</span></button>
                <div class="cv-sidebar-note">Chox Video uses direct, supported video embeds and your existing Chox search service.</div>
            </aside>
            <section class="chox-video-main">
                <div class="cv-topbar">
                    <form class="cv-search" onsubmit="cvSearch(event, '${tab.id}')">
                        <input id="cv-search-${tab.id}" placeholder="Search videos..." autocomplete="off">
                        <button>Search</button>
                    </form>
                </div>
                <div id="cv-content-${tab.id}" class="cv-content"></div>
            </section>
        </div>
    `;

    if (view === "watch") cvWatch(tab.id, payload);
    else if (view === "results") cvRunSearch(tab.id, payload);
    else if (view === "saved") cvRenderSaved(tab.id, payload);
    else cvRenderHome(tab.id);
}

function cvHome(tabId) { renderChoxVideo(tabs.find(t => t.id === tabId), "home"); }

function cvSearchFocus(tabId) {
    const input = document.getElementById("cv-search-" + tabId);
    if (input) { input.focus(); input.select(); }
}

function cvSearch(event, tabId) {
    event.preventDefault();
    const input = document.getElementById("cv-search-" + tabId);
    const q = input?.value.trim();
    if (q) cvRunSearch(tabId, q);
}

async function cvRunSearch(tabId, query) {
    const content = document.getElementById("cv-content-" + tabId);
    if (!content) return;
    content.innerHTML = `<div class="cv-loading">Searching Chox Video...</div>`;
    try {
        const response = await fetch("/api/search?q=" + encodeURIComponent(query + " site:youtube.com/watch"));
        if (!response.ok) throw new Error("Search failed");
        const data = await response.json();
        const items = (data.results || []).filter(r => /youtube\.com\/watch|youtu\.be\//i.test(r.url));
        content.innerHTML = `
            <div class="cv-heading"><h1>Video results</h1><p>${escapeHTML(query)}</p></div>
            <div class="cv-grid">${items.length ? items.map(cvCard).join("") : `<div class="cv-empty">No compatible video results were returned.</div>`}</div>
        `;
    } catch (error) {
        content.innerHTML = `<div class="cv-empty"><h2>Couldn't load video search</h2><p>Check that the Chox server and search API are running.</p></div>`;
    }
}

function cvRenderHome(tabId) {
    const content = document.getElementById("cv-content-" + tabId);
    const recent = choxVideoState.history.slice(0, 6);
    content.innerHTML = `
        <div class="cv-hero">
            <div><span class="cv-pill">CHOX VIDEO</span><h1>Your video space.</h1><p>A clean, Chox-branded video interface with local history and favorites.</p></div>
            <button onclick="cvSearchFocus('${tabId}')">Start searching</button>
        </div>
        <div class="cv-heading"><h2>Quick start</h2></div>
        <div class="cv-feature-row">
            <button onclick="cvShowSaved('${tabId}','history')">◷<b>History</b><span>Continue watching</span></button>
            <button onclick="cvShowSaved('${tabId}','favorites')">★<b>Favorites</b><span>Your saved videos</span></button>
            <button onclick="cvShowSaved('${tabId}','subscriptions')">♟<b>Subscriptions</b><span>Local channel list</span></button>
        </div>
        ${recent.length ? `<div class="cv-heading"><h2>Recently watched</h2></div><div class="cv-grid">${recent.map(cvCard).join("")}</div>` : ""}
    `;
}

function cvCard(item) {
    const url = item.url || "";
    const title = item.title || "Video";
    const thumb = item.thumbnail || youtubeThumb(url);
    return `
        <article class="cv-card" onclick="cvWatch(activeTabId, '${escapeJS(url)}')">
            <div class="cv-thumb">${thumb ? `<img src="${escapeAttr(thumb)}" loading="lazy" alt="">` : "▶"}</div>
            <div class="cv-card-body"><h3>${escapeHTML(title)}</h3><p>${escapeHTML(item.domain || "Video")}</p></div>
            <button class="cv-fav" title="Save favorite" onclick="event.stopPropagation(); cvFavorite(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(item))}')))">★</button>
        </article>
    `;
}

function cvWatch(tabId, url) {
    const tab = tabs.find(t => t.id === tabId);
    const content = document.getElementById("cv-content-" + tabId);
    if (!tab || !content) return;
    const id = extractYouTubeId(url);
    if (!id) {
        content.innerHTML = `<div class="cv-empty"><h2>Unsupported video link</h2><p>Open a supported video URL from search results.</p></div>`;
        return;
    }
    const item = { url, title: "YouTube video", thumbnail: youtubeThumb(url), domain: "YouTube" };
    choxVideoState.history = [item, ...choxVideoState.history.filter(x => x.url !== url)].slice(0, 50);
    saveChoxVideoState();
    content.innerHTML = `
        <button class="cv-back" onclick="cvHome('${tabId}')">← Back to Chox Video</button>
        <div class="cv-player-wrap">
            <iframe class="cv-player" src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="Chox Video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
        <div class="cv-watch-info"><div><span class="cv-pill">NOW PLAYING</span><h1>YouTube video</h1><p>Playback is provided by the supported video embed.</p></div><button onclick="cvFavorite(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(item))}')))" >★ Save</button></div>
    `;
    tab.title = "Chox Video";
    updateTabButton(tab);
}

function cvFavorite(item) {
    if (!item?.url) return;
    const exists = choxVideoState.favorites.some(x => x.url === item.url);
    if (exists) choxVideoState.favorites = choxVideoState.favorites.filter(x => x.url !== item.url);
    else choxVideoState.favorites.unshift(item);
    saveChoxVideoState();
}

function cvShowSaved(tabId, kind) { renderChoxVideo(tabs.find(t => t.id === tabId), "saved", kind); }

function cvRenderSaved(tabId, kind) {
    const content = document.getElementById("cv-content-" + tabId);
    let list = [];
    let label = kind;
    if (kind === "history") list = choxVideoState.history;
    if (kind === "favorites") list = choxVideoState.favorites;
    if (kind === "subscriptions") list = choxVideoState.subscriptions;
    content.innerHTML = `<div class="cv-heading"><h1>${escapeHTML(label[0].toUpperCase()+label.slice(1))}</h1><p>Stored locally in this browser.</p></div><div class="cv-grid">${list.length ? list.map(cvCard).join("") : `<div class="cv-empty">Nothing here yet.</div>`}</div>`;
}

function extractYouTubeId(url) {
    try {
        const u = new URL(url);
        if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0];
        if (u.hostname.includes("youtube.com")) return u.searchParams.get("v") || u.pathname.split("/embed/")[1]?.split("/")[0] || u.pathname.split("/shorts/")[1]?.split("/")[0];
    } catch (_) {}
    return null;
}

function youtubeThumb(url) {
    const id = extractYouTubeId(url);
    return id ? `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg` : "";
}

function escapeJS(value) { return String(value).replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/\n/g,"\\n").replace(/\r/g,"\\r"); }
function escapeAttr(value) { return String(value).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
