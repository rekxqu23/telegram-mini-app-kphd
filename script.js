const KINOPOISK_API_URL = 'https://kinopoiskapiunofficial.tech/api/';
const KINOPOISK_API_KEY = '7d4f6438-9c0e-465b-98d2-064339194187';

const queryInput = document.getElementById('query');
const resultsDiv = document.getElementById('results');
const modal = document.getElementById('modal');
const watchButton = document.getElementById('watchButton');
const closeSpan = document.querySelector('.close');

let currentPage = 1;
let isLoading = false;
let totalPages = Infinity;
let searchQuery = '';

const ITEMS_PER_PAGE = 20;

// Интеграция с Telegram Mini App
if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
}

// Закрытие модалки
closeSpan.addEventListener('click', () => { modal.style.display = 'none'; });
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
});

async function apiFetch(endpoint) {
    try {
        const response = await fetch(`${KINOPOISK_API_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'X-API-KEY': KINOPOISK_API_KEY,
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        showError('Ошибка при запросе к Kinopoisk API: ' + error.message);
        return null;
    }
}

// Поиск по нажатию Enter
queryInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        searchQuery = queryInput.value.trim();
        currentPage = 1;
        resultsDiv.innerHTML = '';
        isLoading = true;
        await loadMoreFilms();
        isLoading = false;
    }
});

async function loadMoreFilms() {
    if (isLoading || currentPage > totalPages) return;

    isLoading = true;
    let endpoint = searchQuery
        ? `v2.1/films/search-by-keyword?keyword=${encodeURIComponent(searchQuery)}&page=${currentPage}`
        : `v2.2/films/top?type=TOP_250_BEST_FILMS&page=${currentPage}`;

    const data = await apiFetch(endpoint);
    if (data) {
        if (searchQuery) {
            totalPages = Math.ceil(data.searchFilmsCountResult / ITEMS_PER_PAGE) || 1;
            displaySearchResults(data.films, data.searchFilmsCountResult);
        } else {
            totalPages = Math.ceil(250 / ITEMS_PER_PAGE) || 1; // Предполагаем 250 фильмов в топе
            displaySearchResults(data.films.slice(0, ITEMS_PER_PAGE), 250);
        }
        currentPage++;
    }
    isLoading = false;
}

function displaySearchResults(films, total) {
    films.forEach(film => {
        const card = createMovieCard(film);
        card.addEventListener('click', async () => {
            const fullMovie = await fetchMovieDetails(film.filmId || film.kinopoiskId);
            if (fullMovie) {
                showModal(fullMovie, film.filmId || film.kinopoiskId);
            }
        });
        resultsDiv.appendChild(card);
    });
}

// Бесконечная прокрутка
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 && !isLoading) {
        loadMoreFilms();
    }
});

window.addEventListener('load', async () => {
    await loadMoreFilms();
});

function createMovieCard(film) {
    const card = document.createElement('div');
    card.classList.add('movie-card');
    card.dataset.filmId = film.filmId || film.kinopoiskId;

    const img = film.posterUrl && film.posterUrl !== 'N/A' ? `<img src="${film.posterUrl}" alt="${film.nameRu || film.nameEn}">` : '<img src="https://via.placeholder.com/150" alt="No Poster">';
    let title = film.nameRu || film.nameEn;
    if (title.length > 16) {
        title = title.substring(0, 16) + '...';
    }
    const originalTitle = film.nameEn || film.nameRu;
    const year = film.year || 'N/A';
    const genres = film.genres ? film.genres.map(g => g.genre).join(', ') : '';
    const countries = film.countries ? film.countries.map(c => c.country).join(', ') : '';

    const info = `
        <div class="movie-info">
            <h2>${title} (${year})</h2>
            <p>${originalTitle} (${year})</p>
            <p>${genres} · ${countries}</p>
        </div>
    `;

    card.innerHTML = img + info;
    return card;
}

async function fetchMovieDetails(filmId) {
    return await apiFetch(`v2.2/films/${filmId}`);
}

function showModal(movie, filmId) {
    document.getElementById('modal-poster').src = movie.posterUrl || '';
    document.getElementById('modal-title').textContent = `${movie.nameRu || movie.nameOriginal} (${movie.year})`;
    document.getElementById('modal-rating').textContent = `Рейтинг: ${movie.ratingKinopoisk || ''}`;
    document.getElementById('modal-genre').textContent = `${movie.genres ? movie.genres.map(g => g.genre).join(', ') : ''}`;
    document.getElementById('modal-duration').textContent = `${movie.filmLength ? movie.filmLength + ' мин' : ''}`;
    document.getElementById('modal-country').textContent = `${movie.countries ? movie.countries.map(c => c.country).join(', ') : ''}`;
    document.getElementById('modal-plot').textContent = movie.description || '';

    modal.style.display = 'block';

    watchButton.onclick = () => {
        let url = `https://www.kinopoisk.one/film/${filmId}/`;
        window.open(url, '_blank');
    };
}

function showError(message) {
    const error = document.createElement('div');
    error.classList.add('error');
    error.textContent = message;
    resultsDiv.appendChild(error);
}