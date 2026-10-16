
const API_URL = "https://api.tvmaze.com";

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const genreFilter = document.getElementById("genre-filter");
const randomButton = document.getElementById("random-button");
const favoritesButton = document.getElementById("favorites-button");
const results = document.getElementById("results");
const statusText = document.getElementById("status");
const resultsHeading = document.getElementById("results-heading");
const resultCount = document.getElementById("result-count");

let currentShows = [];
let favorites = new Set();
let showingFavorites = false;
let searchNumber = 0;

function cleanText(html) {
  const element = document.createElement("div");
  element.innerHTML = html || "";
  return element.textContent || element.innerText || "";
}

function setStatus(message) {
  statusText.textContent = message;
}

function showTitle(show) {
  return show.name || "Untitled show";
}

function renderShows() {
  results.replaceChildren();

  let shows = showingFavorites
    ? currentShows.filter(show => favorites.has(show.id))
    : currentShows;

  const selectedGenre = genreFilter.value;

  if (selectedGenre !== "all") {
    shows = shows.filter(show =>
      (show.genres || []).includes(selectedGenre)
    );
  }

  resultCount.textContent = `${shows.length} show${shows.length === 1 ? "" : "s"}`;

  if (shows.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = showingFavorites
      ? "No favorites in these results yet. Search for a show and tap ♥."
      : "No shows match this filter. Try another genre or search.";
    results.appendChild(empty);
    return;
  }

  shows.forEach(show => {
    const card = document.createElement("article");
    card.className = "show-card";

    const posterWrap = document.createElement("div");
    posterWrap.className = "poster-wrap";

    if (show.image && show.image.medium) {
      const image = document.createElement("img");
      image.src = show.image.medium;
      image.alt = `${showTitle(show)} poster`;
      image.loading = "lazy";
      posterWrap.appendChild(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "no-poster";
      placeholder.textContent = "📺 " + showTitle(show);
      posterWrap.appendChild(placeholder);
    }

    const content = document.createElement("div");
    content.className = "card-content";

    const title = document.createElement("h3");
    title.textContent = showTitle(show);
    content.appendChild(title);

    const meta = document.createElement("p");
    meta.className = "meta";

    const year = show.premiered
      ? show.premiered.slice(0, 4)
      : "Year unknown";

    const rating = show.rating && show.rating.average != null
      ? `⭐ ${show.rating.average}/10`
      : "Rating unavailable";

    meta.textContent = `${year} · ${rating}`;
    content.appendChild(meta);

    const genreList = document.createElement("div");
    genreList.className = "genres";

    (show.genres || []).forEach(genre => {
      const tag = document.createElement("span");
      tag.className = "genre-tag";
      tag.textContent = genre;
      genreList.appendChild(tag);
    });

    content.appendChild(genreList);

    const summary = document.createElement("p");
    summary.className = "summary";
    const plainSummary = cleanText(show.summary);

    summary.textContent = plainSummary
      ? plainSummary.slice(0, 190) +
        (plainSummary.length > 190 ? "…" : "")
      : "No summary is available for this show.";

    content.appendChild(summary);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const favorite = document.createElement("button");
    favorite.className = "favorite-button";
    favorite.textContent = favorites.has(show.id)
      ? "♥ Saved"
      : "♡ Favorite";

    favorite.setAttribute(
      "aria-pressed",
      String(favorites.has(show.id))
    );

    favorite.addEventListener("click", () => {
      if (favorites.has(show.id)) {
        favorites.delete(show.id);
      } else {
        favorites.add(show.id);
      }

      renderShows();
    });

    const details = document.createElement("button");
    details.className = "details-button";
    details.textContent = "More info ↗";

    details.addEventListener("click", () => {
      if (show.url) {
        window.open(show.url, "_blank", "noopener,noreferrer");
      }
    });

    actions.append(favorite, details);
    content.appendChild(actions);
    card.append(posterWrap, content);
    results.appendChild(card);
  });
}

async function searchShows(query) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    setStatus("Type a show title to start exploring.");
    return;
  }

  const requestNumber = ++searchNumber;
  showingFavorites = false;
  resultsHeading.textContent = "Your watchlist universe";
  setStatus("Rewinding the TV guide... 📼");
  results.replaceChildren();
  resultCount.textContent = "";

  try {
    const url = `${API_URL}/search/shows?q=${encodeURIComponent(trimmedQuery)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("The TV guide could not be loaded.");
    }

    const data = await response.json();

    if (requestNumber !== searchNumber) return;

    currentShows = data
      .map(item => item.show)
      .filter(Boolean);

    setStatus(
      currentShows.length
        ? `Found ${currentShows.length} results for "${trimmedQuery}"!`
        : `No shows found for "${trimmedQuery}". Try another title.`
    );

    renderShows();
  } catch (error) {
    if (requestNumber !== searchNumber) return;

    setStatus(
      "Oops! We couldn't reach the TV guide. Check your internet connection and try again."
    );
    results.replaceChildren();
    resultCount.textContent = "";
  }
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchShows(searchInput.value);
});

genreFilter.addEventListener("change", renderShows);

randomButton.addEventListener("click", () => {
  if (currentShows.length === 0) {
    setStatus("Search for some shows first, then let fate pick one! 🎲");
    return;
  }

  const selectedGenre = genreFilter.value;

  const pool = currentShows.filter(show =>
    selectedGenre === "all" ||
    (show.genres || []).includes(selectedGenre)
  );

  if (pool.length === 0) {
    setStatus("No shows match this genre. Choose another genre!");
    return;
  }

  showingFavorites = false;
  resultsHeading.textContent = "Your surprise pick 🎲";

  const pick = pool[Math.floor(Math.random() * pool.length)];

  currentShows = [pick];
  setStatus(`Tonight's pick is ${showTitle(pick)}!`);
  renderShows();
});

favoritesButton.addEventListener("click", () => {
  showingFavorites = !showingFavorites;

  resultsHeading.textContent = showingFavorites
    ? "Your favorite shows ♥"
    : "Your watchlist universe";

  setStatus(
    showingFavorites
      ? "Your saved favorites from this session."
      : "Back to your search results!"
  );

  renderShows();
});
