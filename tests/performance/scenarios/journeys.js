import {
  config,
  get,
  pause,
  html,
  results,
  array,
  detail,
  sessionToken
} from '../utils/client.js';
import { movieIds, tvIds, queries, pick } from '../config/data.js';

export function homepage() {
  get('/', 'home', html(true));
  pause();
  get('/home', 'home-feed', html(true));
  get(
    '/api/genres',
    'genres',
    (_, data) => Array.isArray(data) && data.length > 0
  );
  get(
    '/api/movies/popular',
    'popular',
    (_, data) => Array.isArray(data) && data.length > 0
  );
}
export function browsing() {
  get('/movies?category=popular', 'movies', html(true));
  pause();
  get('/tv?category=top_rated', 'tv', html(true));
  pause();
  get(
    '/api/tmdb/discover/movie?with_genres=28&sort_by=popularity.desc&page=1',
    'discover-api',
    results
  );
}
export function searching() {
  const query = encodeURIComponent(pick(queries));
  get(`/api/tmdb/search/multi?query=${query}`, 'autocomplete', results);
  pause();
  get(`/search?q=${query}`, 'search-page', html(true));
  pause();
  get(
    `/api/search?q=${query}`,
    'search-api',
    (_, data) => Array.isArray(data) && data.length > 0
  );
}
export function details() {
  const movie = pick(movieIds),
    tv = pick(tvIds);
  get(`/movie/${movie}`, 'movie-detail', html(true));
  get(
    `/api/tmdb/movie/${movie}/watch/providers`,
    'watch-providers',
    (_, data) => !!data?.results && typeof data.results === 'object'
  );
  pause();
  get(`/api/movies/${movie}`, 'movie-api', detail);
  get(
    `/api/tmdb/movie/${movie}/recommendations`,
    'catalog-recommendations',
    results
  );
  pause();
  get(`/tv/${tv}`, 'tv-detail', html(true));
  get(
    `/api/tmdb/tv/${tv}/season/1`,
    'tv-season',
    (_, data) => Array.isArray(data?.episodes) && data.episodes.length > 0
  );
}
export function filtering() {
  get(
    '/movies?genre=28&year=2020&sort=vote_average.desc&page=1',
    'filter',
    html(true)
  );
  pause();
  get('/movies?category=popular&page=2', 'pagination', html(true));
  pause();
  get('/genre/movie/action', 'genre-page', html(true));
  get('/provider/8', 'provider-page', html(true));
}
export function boundaries() {
  get('/api/health', 'health', (_, data) => data?.status === 'healthy');
  get('/signin', 'signin', html());
  get(
    '/api/preferences',
    'auth-denied',
    (_, data) => data?.message === 'Unauthorized',
    { status: 401 }
  );
}
export function authenticated() {
  const token = sessionToken();
  const options = { token };
  get(
    '/api/auth/user',
    'auth-user',
    (_, data) => typeof data?.id === 'string',
    options
  );
  get(
    '/api/preferences',
    'preferences',
    (_, data) =>
      Array.isArray(data?.watchlist) && Array.isArray(data?.likedGenres),
    options
  );
  pause();
  get('/api/watchlist', 'watchlist', array, options);
  get(
    `/api/watchlist/check/${pick(movieIds)}`,
    'watchlist-check',
    (_, data) => typeof data?.isInWatchlist === 'boolean',
    options
  );
  get('/api/history', 'history', array, options);
}
export function recommendations() {
  const movie = pick(movieIds);
  get(
    '/api/recommendations/personalized',
    'ai-personalized',
    (_, data) =>
      Array.isArray(data?.recommendation_categories) &&
      data.recommendation_categories.some((entry) => entry.movies?.length),
    { token: sessionToken() }
  );
  pause();
  get(
    `/api/recommendations/similar/${movie}`,
    'ai-similar',
    (_, data) => Array.isArray(data) && data.length > 0
  );
  get(
    `/api/recommendations/because-you-liked/${movie}`,
    'ai-because',
    (_, data) =>
      Array.isArray(data?.recommendations) && data.recommendations.length > 0
  );
  pause();
  get(
    `/api/tv/${pick(tvIds)}/similar/enhanced`,
    'ai-tv',
    (_, data) => Array.isArray(data) && data.length > 0
  );
}

export function allJourneys() {
  homepage();
  browsing();
  searching();
  details();
  filtering();
  boundaries();
  if (config.includeAuth) authenticated();
  if (config.includeAI) recommendations();
}

// Approximate guest-heavy mix; each iteration represents a short user visit.
export function mixedJourney() {
  const roll = Math.random();
  if (config.includeAI && roll < 0.05) recommendations();
  else if (config.includeAuth && roll < 0.15) authenticated();
  else if (roll < 0.35) homepage();
  else if (roll < 0.55) browsing();
  else if (roll < 0.75) searching();
  else if (roll < 0.9) details();
  else filtering();
}
