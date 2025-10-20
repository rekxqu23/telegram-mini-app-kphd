const KINOPOISK_API_URL = 'https://kinopoiskapiunofficial.tech/api/';
const KINOPOISK_API_KEY = '7d4f6438-9c0e-465b-98d2-064339194187';

const queryInput = document.getElementById('query');
const resultsDiv = document.getElementById('results');
const filmModal = document.getElementById('filmModal');
const watchButton = document.getElementById('watchButton');
const closeSpan = document.querySelector('.close');
const genreModal = document.getElementById('genreModal');
const closeGenreSpan = document.querySelector('.close-genre');
const genreOptions = document.getElementById('genre-options');
const menuModal = document.getElementById('menuModal');
const closeMenuSpan = document.querySelector('.close-menu');
const watchingList = document.getElementById('watching-list');
const favoritesList = document.getElementById('favorites-list');
const loading = document.getElementById('loading');

let currentPage = 1;
let isLoading = false;
let totalPages = Infinity;
let searchQuery = '';
let selectedGenres = [];

const ITEMS_PER_PAGE = 20;
let availableGenres = [];

function populateGenreOptions(genres) {
    genreOptions.innerHTML = '';
    genres.forEach(genre => {
        const button = document.createElement('button');
        button.className = 'genre-btn';
        button.textContent = genre;
        button.addEventListener('click', () => {
            const index = selectedGenres.indexOf(genre);
            if (index === -1) {
                selectedGenres.push(genre);
                button.classList.add('active');
            } else {
                selectedGenres.splice(index, 1);
                button.classList.remove('active');
            }
            resultsDiv.innerHTML = '';
            currentPage = 1;
            loadMoreFilms();
        });
        genreOptions.appendChild(button);
    });
}

function showGenreModal() {
    genreModal.style.display = 'block';
}

function showMenuModal() {
    menuModal.style.display = 'block';
    updateWatchingList();
    updateFavoritesList();
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab + '-tab').classList.add('active');
        });
    });
}

function showModal(movie, filmId) {
    document.getElementById('modal-poster').src = movie.posterUrl || '';
    document.getElementById('modal-title').textContent = `${movie.nameRu || movie.nameOriginal} (${movie.year})`;
    document.getElementById('modal-rating').textContent = `Рейтинг: ${movie.ratingKinopoisk || ''}`;
    document.getElementById('modal-genre').textContent = `${movie.genres ? movie.genres.map(g => g.genre).join(', ') : ''}`;
    document.getElementById('modal-duration').textContent = `${movie.filmLength ? movie.filmLength + ' мин' : ''}`;
    document.getElementById('modal-country').textContent = `${movie.countries ? movie.countries.map(c => c.country).join(', ') : ''}`;
    document.getElementById('modal-plot').textContent = movie.description || '';
    filmModal.style.display = 'block';
    watchButton.onclick = () => {
        saveToWatchingList(movie);
        saveToFavoritesList(movie);
        window.open(`https://www.kinopoisk.one/film/${filmId}/`, '_blank');
    };
}

// Закрытие модальных окон
closeSpan.addEventListener('click', () => { filmModal.style.display = 'none'; });
closeGenreSpan.addEventListener('click', () => { genreModal.style.display = 'none'; });
closeMenuSpan.addEventListener('click', () => { menuModal.style.display = 'none'; });
window.addEventListener('click', (e) => {
    if (e.target === filmModal) filmModal.style.display = 'none';
    if (e.target === genreModal) genreModal.style.display = 'none';
    if (e.target === menuModal) menuModal.style.display = 'none';
});

function saveToWatchingList(film) {
    let watchingListData = JSON.parse(localStorage.getItem('watchingList') || '[]');
    if (!watchingListData.some(item => item.filmId === film.filmId)) {
        watchingListData.push({
            filmId: film.filmId,
            title: film.nameRu || film.nameOriginal,
            poster: film.posterUrl || 'https://via.placeholder.com/150'
        });
        localStorage.setItem('watchingList', JSON.stringify(watchingListData));
    }
}

function saveToFavoritesList(film) {
    let favoritesListData = JSON.parse(localStorage.getItem('favoritesList') || '[]');
    if (!favoritesListData.some(item => item.filmId === film.filmId)) {
        favoritesListData.push({
            filmId: film.filmId,
            title: film.nameRu || film.nameOriginal,
            poster: film.posterUrl || 'https://via.placeholder.com/150'
        });
        localStorage.setItem('favoritesList', JSON.stringify(favoritesListData));
    }
}

function updateWatchingList() {
    const watchingListData = JSON.parse(localStorage.getItem('watchingList') || '[]');
    watchingList.innerHTML = '';
    watchingListData.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<div class="watching-item" data-film-id="${item.filmId}"><img src="${item.poster}" alt="${item.title}"> ${item.title}</div> <button data-film-id="${item.filmId}">Удалить</button>`;
        li.querySelector('button').addEventListener('click', () => {
            removeFromWatchingList(item.filmId);
        });
        li.querySelector('.watching-item').addEventListener('click', async () => {
            const fullMovie = await fetchMovieDetails(item.filmId);
            if (fullMovie) {
                showModal(fullMovie, item.filmId);
            } else {
                showError('Не удалось загрузить данные фильма.');
            }
        });
        watchingList.appendChild(li);
    });
}

function updateFavoritesList() {
    const favoritesListData = JSON.parse(localStorage.getItem('favoritesList') || '[]');
    favoritesList.innerHTML = '';
    favoritesListData.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<div class="watching-item" data-film-id="${item.filmId}"><img src="${item.poster}" alt="${item.title}"> ${item.title}</div> <button data-film-id="${item.filmId}">Удалить</button>`;
        li.querySelector('button').addEventListener('click', () => {
            removeFromFavoritesList(item.filmId);
        });
        li.querySelector('.watching-item').addEventListener('click', async () => {
            const fullMovie = await fetchMovieDetails(item.filmId);
            if (fullMovie) {
                showModal(fullMovie, item.filmId);
            } else {
                showError('Не удалось загрузить данные фильма.');
            }
        });
        favoritesList.appendChild(li);
    });
}

function removeFromWatchingList(filmId) {
    let watchingListData = JSON.parse(localStorage.getItem('watchingList') || '[]');
    watchingListData = watchingListData.filter(item => item.filmId !== filmId);
    localStorage.setItem('watchingList', JSON.stringify(watchingListData));
    updateWatchingList();
}

function removeFromFavoritesList(filmId) {
    let favoritesListData = JSON.parse(localStorage.getItem('favoritesList') || '[]');
    favoritesListData = favoritesListData.filter(item => item.filmId !== filmId);
    localStorage.setItem('favoritesList', JSON.stringify(favoritesListData));
    updateFavoritesList();
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
        console.error('API Error:', error);
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
        loading.style.display = 'block';
        await loadMoreFilms();
        isLoading = false;
        loading.style.display = 'none';
    }
});

async function loadMoreFilms() {
    if (isLoading || currentPage > totalPages) return;

    isLoading = true;
    let endpoint = searchQuery
        ? `v2.1/films/search-by-keyword?keyword=${encodeURIComponent(searchQuery)}`
        : `v2.2/films/top?type=TOP_250_BEST_FILMS&page=${currentPage}`;

    const data = await apiFetch(endpoint);
    if (data) {
        if (searchQuery) {
            totalPages = Math.ceil((data.searchFilmsCountResult || data.films?.length || 0) / ITEMS_PER_PAGE) || 1;
            let filmsToShow = data.films?.slice(0, ITEMS_PER_PAGE) || [];
            if (selectedGenres.length > 0) {
                filmsToShow = filmsToShow.filter(film => 
                    film.genres && selectedGenres.every(genre => film.genres.some(g => g.genre === genre))
                );
            }
            displaySearchResults(filmsToShow, data.searchFilmsCountResult || filmsToShow.length);
        } else {
            totalPages = Math.ceil(250 / ITEMS_PER_PAGE) || 1;
            let filmsToShow = data.films?.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) || [];
            if (selectedGenres.length > 0) {
                filmsToShow = filmsToShow.filter(film => 
                    film.genres && selectedGenres.every(genre => film.genres.some(g => g.genre === genre))
                );
            }
            displaySearchResults(filmsToShow, 250);
        }
        currentPage++;
    } else {
        showError('Не удалось найти фильмы по запросу.');
    }
    isLoading = false;
}

function displaySearchResults(films, total) {
    if (!films || films.length === 0) {
        showError('Фильмы не найдены.');
        return;
    }
    films.forEach(film => {
        const card = createMovieCard(film);
        card.addEventListener('click', async () => {
            const fullMovie = await fetchMovieDetails(film.filmId || film.kinopoiskId);
            if (fullMovie) {
                showModal(fullMovie, film.filmId || film.kinopoiskId);
            } else {
                showError('Не удалось загрузить данные фильма.');
            }
        });
        resultsDiv.appendChild(card);
    });
}

// Бесконечная прокрутка
window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 && !isLoading) {
        isLoading = true;
        loading.style.display = 'block';
        loadMoreFilms();
        loading.style.display = 'none';
        isLoading = false;
    }
});

window.addEventListener('load', async () => {
    loading.style.display = 'block';
    const data = await apiFetch('v2.2/films/top?type=TOP_250_BEST_FILMS');
    if (data && data.films) {
        availableGenres = [...new Set(data.films.flatMap(film => film.genres?.map(g => g.genre) || []))].sort();
        populateGenreOptions(availableGenres);
    }
    await loadMoreFilms();
    loading.style.display = 'none';
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
    const data = await apiFetch(`v2.2/films/${filmId}`);
    if (data) {
        return data;
    }
    return null;
}

function showError(message) {
    const error = document.createElement('div');
    error.classList.add('error');
    error.textContent = message;
    resultsDiv.appendChild(error);
}

// Обработчики кнопок
document.querySelector('.category-btn').addEventListener('click', showGenreModal);
document.querySelector('.menu-btn').addEventListener('click', showMenuModal);