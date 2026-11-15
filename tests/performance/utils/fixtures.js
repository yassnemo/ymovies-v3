import { movieIds, tvIds } from '../config/data.js';

export function media(type, id, index = 0) {
  return {
    id,
    media_type: type,
    ...(type === 'tv'
      ? { name: `Synthetic series ${id}`, first_air_date: '2020-01-01' }
      : { title: `Synthetic movie ${id}`, release_date: '2020-01-01' }),
    original_title: `Synthetic title ${id}`,
    original_language: 'en',
    origin_country: ['US'],
    overview: 'Synthetic catalog data for isolated YMovies performance tests.',
    adult: false,
    popularity: 100 - index,
    vote_average: 8,
    vote_count: 1000,
    genre_ids: [28, 18],
    genres: [{ id: 28, name: 'Action' }],
    poster_path: null,
    backdrop_path: null,
    runtime: 120,
    status: 'Released',
    tagline: 'Performance fixture',
    credits: { cast: [], crew: [] },
    videos: { results: [] },
    reviews: { results: [] },
    seasons:
      type === 'tv'
        ? [{ season_number: 1, name: 'Season 1', episode_count: 1 }]
        : [],
    number_of_seasons: 1,
    number_of_episodes: 1
  };
}
export const movies = movieIds.map((id, index) => media('movie', id, index));
export const shows = tvIds.map((id, index) => media('tv', id, index));

export async function catalogFixture(endpoint, params = {}) {
  // Upstream latency only applies on cache misses; real TMDBService caching and quotas remain active.
  await new Promise((resolve) => setTimeout(resolve, 5));
  const type = endpoint.includes('/tv') ? 'tv' : 'movie';
  const items = type === 'tv' ? shows : movies;
  const results =
    endpoint.includes('/all/') || endpoint === '/search/multi'
      ? [...movies, ...shows]
      : items;
  if (endpoint.startsWith('/genre/'))
    return {
      genres: [
        { id: 28, name: 'Action' },
        { id: 18, name: 'Drama' }
      ]
    };
  if (endpoint.endsWith('/images'))
    return { logos: [], backdrops: [], posters: [] };
  if (endpoint.endsWith('/watch/providers'))
    return {
      results: {
        US: {
          flatrate: [
            {
              provider_id: 8,
              provider_name: 'Synthetic provider',
              logo_path: null
            }
          ]
        }
      }
    };
  if (/\/season\/\d+$/.test(endpoint))
    return {
      episodes: [
        {
          id: 1,
          episode_number: 1,
          season_number: 1,
          name: 'Synthetic episode',
          overview: 'Fixture',
          runtime: 45,
          air_date: '2020-01-01'
        }
      ]
    };
  const match = endpoint.match(/^\/(movie|tv)\/(\d+)$/);
  if (match)
    return {
      ...media(match[1], Number(match[2])),
      similar: { results: items },
      recommendations: { results: items }
    };
  if (endpoint.endsWith('/videos') || endpoint.endsWith('/reviews'))
    return { results: [] };
  return {
    page: Number(params.page || 1),
    total_pages: 10,
    total_results: 30,
    results
  };
}

export const storage = {
  getUser: async (id) => ({ id, email: 'synthetic@example.invalid' }),
  getUserPreferences: async (userId) => ({
    userId,
    favoriteMovies: [],
    watchlist: [],
    watchHistory: [],
    likedGenres: ['Action'],
    dislikedGenres: [],
    collections: [],
    appSettings: { onboardingCompleted: true }
  }),
  getWatchlistItems: async (userId) => [{ userId, movieId: movieIds[0] }],
  getWatchHistory: async (userId) => [
    {
      userId,
      movieId: movieIds[1],
      rating: 4,
      watchProgress: 50,
      watchCount: 1
    }
  ],
  getRecentlyWatched: async () => [],
  getTopRatedMovies: async () => [],
  isInWatchlist: async (_, id) => id === movieIds[0]
};
export const supabaseAdmin = {
  auth: {
    getUser: async (token) =>
      /^perf-vu-[1-9]\d*$/.test(token)
        ? {
            data: { user: { id: token, email: 'synthetic@example.invalid' } },
            error: null
          }
        : { data: { user: null }, error: { message: 'Unauthorized' } }
  }
};

// An awaitable read-only query chain. Any database mutation fails closed.
const query = {
  from() {
    return this;
  },
  where() {
    return this;
  },
  orderBy() {
    return this;
  },
  limit() {
    return this;
  },
  then(resolve, reject) {
    return Promise.resolve([]).then(resolve, reject);
  }
};
export const db = { select: () => query };
export class RecommendationConnector {
  async isAvailable() {
    return true;
  }
  async getSimilarMovies() {
    return movies;
  }
  async getSimilarTV() {
    return shows;
  }
  async getBecauseYouLikedRecommendations() {
    return {
      recommendations: movies,
      sourceMovie: movies[0],
      category: 'Synthetic recommendations'
    };
  }
  async getPersonalizedRecommendations() {
    return {
      recommendation_categories: [
        { category: 'Synthetic recommendations', movies }
      ]
    };
  }
}
