// Bounded popular titles and query vocabulary avoid unbounded cold-cache traffic.
export const movieIds = [550, 27205, 157336];
export const tvIds = [1396, 1399, 66732];
export const queries = ['Matrix', 'Inception', 'Interstellar', 'Breaking Bad'];
export const pick = (values) =>
  values[Math.floor(Math.random() * values.length)];

export const endpoints = [
  'home',
  'home-feed',
  'movies',
  'tv',
  'search-page',
  'movie-detail',
  'tv-detail',
  'filter',
  'pagination',
  'genre-page',
  'provider-page',
  'genres',
  'popular',
  'search-api',
  'autocomplete',
  'discover-api',
  'movie-api',
  'watch-providers',
  'tv-season',
  'catalog-recommendations',
  'health',
  'auth-denied',
  'signin',
  'auth-user',
  'preferences',
  'watchlist',
  'watchlist-check',
  'history',
  'ai-personalized',
  'ai-similar',
  'ai-because',
  'ai-tv'
];
