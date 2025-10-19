// script.js
const KINOPOISK_API_URL = 'https://kinopoiskapiunofficial.tech/api/';
const KINOPOISK_API_KEY = '7d4f6438-9c0e-465b-98d2-064339194187';

const form = document.getElementById('searchForm');
const resultsDiv = document.getElementById('results');
const modal = document.getElementById('modal');
const adblockModal = document.getElementById('adblockModal');
const modalInfo = document.getElementById('modal-info');
const watchButton = document.getElementById('watchButton');
const closeSpan = document.querySelector('.close');
const closeAdblockSpan = document.querySelector('.close-adblock');
const disableAdblockBtn = document.getElementById('disableAdblock');

// Интеграция с Telegram Mini App
if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
}

// Закрытие модалок
closeSpan.addEventListener('click', () => { modal.style.display = 'none'; });
closeAdblockSpan.addEventListener('click', () => { adblockModal.style.display = 'none'; });
disableAdblockBtn.addEventListener('click', () => { adblockModal.style.display = 'none'; });
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
    if (e.target === adblockModal) adblockModal.style.display = 'none';
});

// Детектор AdBlock
let adblockDetected = false;
function detectAdBlock() {
    const adElement = document.createElement('div');
    adElement.innerHTML = '&nbsp;';
    adElement.className = 'ads adsbox';
    document.body.appendChild(adElement);

    setTimeout(() => {
        if (adElement.offsetHeight === 0) {
            adblockDetected = true;
            showAdBlockModal();
        }
        document.body.removeChild(adElement);
    }, 3000);
}

function showAdBlockModal() {
    adblockModal.style.display = 'block';
}

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

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    resultsDiv.innerHTML = '';
    const query = document.getElementById('query').value.trim();

    if (!query) {
        showError('Введите название фильма');
        return;
    }

    const data = await apiFetch(`v2.1/films/search-by-keyword?keyword=${encodeURIComponent(query)}`);
    if (data && data.films) {
        displaySearchResults(data.films, data.searchFilmsCountResult);
    }
});

window.addEventListener('load', () => {
    detectAdBlock();
});

function displaySearchResults(films, total) {
    const header = document.createElement('h2');
    header.textContent = `Фильмы (из ${total} результатов) ${adblockDetected ? '(AdBlock может блокировать изображения)' : ''}`;
    resultsDiv.appendChild(header);

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

function createMovieCard(film) {
    const card = document.createElement('div');
    card.classList.add('movie-card');
    card.dataset.filmId = film.filmId || film.kinopoiskId;

    const img = film.posterUrl && film.posterUrl !== 'N/A' ? `<img src="${film.posterUrl}" alt="${film.nameRu || film.nameEn}">` : '';

    const title = film.nameRu || film.nameEn;
    const year = film.year || '';
    const type = film.type || '';
    const genres = film.genres ? film.genres.map(g => g.genre).join(', ') : 'N/A';
    const length = film.filmLength ? `${film.filmLength}мин` : 'N/A';

    const info = `
        <div class="movie-info">
            <h2>${title} (${year})</h2>
            <p><strong>Тип:</strong> ${type}</p>
            <p><strong>Жанр:</strong> ${genres}</p>
            <p><strong>Длительность:</strong> ${length}</p>
        </div>
    `;

    card.innerHTML = img + info;
    return card;
}

async function fetchMovieDetails(filmId) {
    return await apiFetch(`v2.2/films/${filmId}`);
}

function showModal(movie, filmId) {
    const genres = movie.genres ? movie.genres.map(g => g.genre).join(', ') : '';
    const countries = movie.countries ? movie.countries.map(c => c.country).join(', ') : '';

    modalInfo.innerHTML = `
        <h2>${movie.nameRu || movie.nameOriginal} (${movie.year})</h2>
        <p><strong>Тип:</strong> ${movie.type}</p>
        <p><strong>Режиссер:</strong> ${movie.directors ? movie.directors.join(', ') : 'N/A'}</p>
        <p><strong>Актеры:</strong> ${movie.actors ? movie.actors.join(', ') : 'N/A'}</p>
        <p><strong>Сюжет:</strong> ${movie.description || 'N/A'}</p>
        <p><strong>Рейтинг Kinopoisk:</strong> ${movie.ratingKinopoisk || 'N/A'}</p>
        <p><strong>Жанр:</strong> ${genres}</p>
        <p><strong>Страна:</strong> ${countries}</p>
        <p><strong>Длительность:</strong> ${movie.filmLength ? movie.filmLength + 'мин' : 'N/A'}</p>
        ${adblockDetected ? '<p><em>Совет: AdBlock активен — на внешних сайтах используй приватный режим для ad-free просмотра.</em></p>' : ''}
    `;

    modal.style.display = 'block';

    watchButton.onclick = () => {
        let url = `https://www.kinopoisk.one/film/${filmId}/`;
        if (adblockDetected) {
            if (confirm('AdBlock может не блокировать рекламу на kinopoisk.one. Открыть всё равно?')) {
                window.open(url, '_blank');
            }
        } else {
            window.open(url, '_blank');
        }
    };
}

function showError(message) {
    const error = document.createElement('div');
    error.classList.add('error');
    error.textContent = message;
    resultsDiv.appendChild(error);
}