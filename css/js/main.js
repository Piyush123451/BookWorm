const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const bookGrid = document.getElementById("bookGrid");
const libraryGrid = document.getElementById("libraryGrid");
const libraryCount = document.getElementById("libraryCount");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const chips = document.querySelectorAll(".chip");

const PLACEHOLDER = "https://placehold.co/180x260/F0E8DC/70594B?text=No+Cover";
const LIB_KEY = "bookworm-library";

/* ---------- Library storage ---------- */
function getLibrary() {
    try { return JSON.parse(localStorage.getItem(LIB_KEY)) || []; }
    catch (e) { return []; }
}

function setLibrary(list) {
    try { localStorage.setItem(LIB_KEY, JSON.stringify(list)); } catch (e) {}
}

function isSaved(id) {
    return getLibrary().some(b => b.id === id);
}

// Returns true if the book is now saved, false if it was removed
function toggleSaved(book) {
    const lib = getLibrary();
    const i = lib.findIndex(b => b.id === book.id);
    if (i >= 0) lib.splice(i, 1);
    else lib.unshift(book);
    setLibrary(lib);
    return i < 0;
}

/* ---------- Normalize API + sample books into one shape ---------- */
function normalizeBook(raw) {
    return {
        id: raw.key || `sample-${raw.id}`,
        key: raw.key || null,
        title: raw.title || "Unknown title",
        author: raw.author_name?.join(", ") || raw.author || "Unknown author",
        year: raw.first_publish_year || null,
        cover: raw.cover_i
            ? `https://covers.openlibrary.org/b/id/${raw.cover_i}-M.jpg`
            : (raw.cover || null)
    };
}

/* ---------- Rendering ---------- */
function showMessage(container, text) {
    container.replaceChildren();
    const p = document.createElement("p");
    p.className = "empty-message";
    p.textContent = text;
    container.appendChild(p);
}

function updateHeart(btn, saved) {
    btn.textContent = saved ? "♥" : "♡";
    btn.classList.toggle("saved", saved);
    btn.setAttribute("aria-label", saved ? "Remove from library" : "Save to library");
}

function refreshHearts() {
    document.querySelectorAll(".save-btn").forEach(btn => {
        updateHeart(btn, isSaved(btn.dataset.id));
    });
}

function createCard(book) {
    const card = document.createElement("article");
    card.className = "book-card";

    const coverWrap = document.createElement("div");
    coverWrap.className = "book-cover";

    const img = document.createElement("img");
    img.alt = `Cover of ${book.title}`;
    img.loading = "lazy";
    img.src = book.cover || PLACEHOLDER;
    img.onerror = () => { img.onerror = null; img.src = PLACEHOLDER; };

    const heart = document.createElement("button");
    heart.type = "button";
    heart.className = "save-btn";
    heart.dataset.id = book.id;
    updateHeart(heart, isSaved(book.id));
    heart.addEventListener("click", e => {
        e.stopPropagation(); // don't open the book page
        toggleSaved(book);
        refreshHearts();
        renderLibrary();
    });

    coverWrap.append(img, heart);

    const info = document.createElement("div");
    info.className = "book-info";

    const title = document.createElement("h3");
    title.textContent = book.title;

    const author = document.createElement("p");
    author.textContent = book.author;

    const year = document.createElement("p");
    year.className = "book-genre";
    year.textContent = book.year ? `First published: ${book.year}` : "Year unavailable";

    info.append(title, author, year);
    card.append(coverWrap, info);

    if (book.key) {
        card.addEventListener("click", () => {
            window.open(`https://openlibrary.org${book.key}`, "_blank", "noopener,noreferrer");
        });
    }
    return card;
}

function renderBooks(list, container, emptyText, append = false) {
    if (!append) container.replaceChildren();
    if (list.length === 0 && !append) {
        showMessage(container, emptyText);
        return;
    }
    list.forEach(book => container.appendChild(createCard(book)));
}

function renderLibrary() {
    const lib = getLibrary();
    libraryCount.textContent = `${lib.length} ${lib.length === 1 ? "book" : "books"} saved`;
    document.getElementById("clearLibrary").hidden = lib.length === 0;
    renderBooks(lib, libraryGrid, "Your shelf is empty. Tap the ♡ on any book to save it here.");
}

/* ---------- Discover ---------- */
const discover = { query: "", page: 1, total: 0, loading: false };

async function loadDiscover(query, reset = true) {
    if (discover.loading) return;
    discover.loading = true;

    if (reset) {
        discover.query = query;
        discover.page = 1;
        showMessage(bookGrid, "Searching the library...");
        loadMoreBtn.hidden = true;
    } else {
        discover.page++;
        loadMoreBtn.textContent = "Loading...";
    }

    try {
        const { docs, total } = await searchBooks(discover.query, discover.page);
        discover.total = total;
        renderBooks(docs.map(normalizeBook), bookGrid, "No books found. Try another search.", !reset);
        const shown = bookGrid.querySelectorAll(".book-card").length;
        loadMoreBtn.hidden = shown >= total || docs.length === 0;
    } catch (err) {
        console.error("Book search error:", err);
        if (reset) {
            // Offline fallback: show the sample books
            renderBooks(books.map(normalizeBook), bookGrid, "");
        } else {
            discover.page--;
        }
    } finally {
        discover.loading = false;
        loadMoreBtn.textContent = "Load more books";
    }
}

function setActiveChip(chip) {
    chips.forEach(c => c.classList.toggle("active", c === chip));
}

function scrollToDiscover() {
    document.getElementById("discover").scrollIntoView();
}

/* ---------- Events ---------- */
chips.forEach(chip => {
    chip.addEventListener("click", () => {
        setActiveChip(chip);
        loadDiscover(chip.dataset.query);
    });
});

loadMoreBtn.addEventListener("click", () => loadDiscover(discover.query, false));

searchForm.addEventListener("submit", e => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;
    setActiveChip(null);
    loadDiscover(q);
    scrollToDiscover();
});

document.querySelectorAll(".genre-card").forEach(card => {
    card.addEventListener("click", () => {
        const query = card.dataset.query;
        const match = [...chips].find(c => c.dataset.query === query);
        setActiveChip(match || null);
        loadDiscover(query);
        scrollToDiscover();
    });
});

// "Surprise me" picks a random subject
document.getElementById("exploreAll").addEventListener("click", e => {
    e.preventDefault();
    const pick = chips[Math.floor(Math.random() * chips.length)];
    setActiveChip(pick);
    loadDiscover(pick.dataset.query);
});

document.getElementById("clearLibrary").addEventListener("click", () => {
    if (confirm("Remove all saved books from your library?")) {
        setLibrary([]);
        refreshHearts();
        renderLibrary();
    }
});

// Mobile menu
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
mobileMenuBtn.addEventListener("click", () => mobileMenu.classList.toggle("show"));
mobileMenu.querySelectorAll("a").forEach(a =>
    a.addEventListener("click", () => mobileMenu.classList.remove("show"))
);

/* ---------- Start ---------- */
renderLibrary();
loadDiscover(chips[0].dataset.query);