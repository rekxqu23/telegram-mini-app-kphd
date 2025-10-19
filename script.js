// script.js
const KINOPOISK_API_URL = 'https://kinopoiskapiunofficial.tech/api/';
const KINOPOISK_API_KEY = '7d4f6438-9c0e-465b-98d2-064339194187'; // Вставьте свой API ключ здесь. Получите на https://kinopoiskapiunofficial.tech

const form = document.getElementById('searchForm');
const resultsDiv = document.getElementById('results');
const modal = document.getElementById('modal');
const modalInfo = document.getElementById('modal-info');
const watchButton = document.getElementById('watchButton');
const closeSpan = document.querySelector('.close');

// Интеграция с Telegram Mini App
if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
}

// Закрытие модалки
closeSpan.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

async function apiFetch(endpoint) {
    if (!KINOPOISK_API_KEY) {
        showError('API ключ для Kinopoisk не указан. Пожалуйста, вставьте его в script.js');
        return null;
    }

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

// Автоматический показ топ фильмов при загрузке (как замена случайным)
window.addEventListener('load', async () => {
    resultsDiv.innerHTML = '';
    const randomPage = Math.floor(Math.random() * 13) + 1; // Топ 250, по 20 на страницу ~13 страниц
    const data = await apiFetch(`v2.2/films/top?type=TOP_250_BEST_FILMS&page=${randomPage}`);
    if (data && data.items) {
        displaySearchResults(data.items, 250); // Общее примерно 250
    }
});

function displaySearchResults(films, total) {
    const header = document.createElement('h2');
    header.textContent = `Фильмы (из ${total} результатов)`;
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

    const img = film.posterUrl !== 'N/A' && film.posterUrl ? `<img src="${film.posterUrl}" alt="${film.nameRu || film.nameEn}">` : '';

    const title = film.nameRu || film.nameEn;
    const year = film.year || '';
    const type = film.type || '';

    const info = `
        <div class="movie-info">
            <h2>${title} (${year})</h2>
            <p><strong>Тип:</strong> ${type}</p>
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
        <p><strong>Длительность:</strong> ${movie.filmLength ? movie.filmLength + ' мин' : 'N/A'}</p>
    `;

    modal.style.display = 'block';

    watchButton.onclick = () => {
        window.open(`https://www.kinopoisk.one/film/${filmId}/`, '_blank');
    };
}

function showError(message) {
    const error = document.createElement('div');
    error.classList.add('error');
    error.textContent = message;
    resultsDiv.appendChild(error);
}