interface RecommendationRequest {
  params: Record<string, string>;
  user?: { claims?: { sub: string } };
}
const jsonWithStatus = (status: number, data: unknown) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' }
  });
import { storage } from '../storage';
import { TMDBService } from '../services/tmdb';
import {
  RecommendationConnector,
  type PersonalizationInput
} from '../services/recommendation-connector';
import { RecommendationEngine } from '../services/recommendation-engine';

interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  adult: boolean;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  original_language: string;
  original_title: string;
  popularity: number;
}

import { db } from '../db';
import { favoriteItems } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Initialize TMDb service and recommendation connector
const tmdbCredential =
  process.env.TMDB_API_KEY || process.env.TMDB_BEARER_TOKEN || '';
const tmdbService = new TMDBService(tmdbCredential);
const recommendationConnector = new RecommendationConnector();
// Initialize the enhanced recommendation engine
const recommendationEngine = new RecommendationEngine(tmdbCredential);

// Small in-memory caches to reduce latency on repeated requests
type CacheEntry<T> = { data: T; expiresAt: number; bytes: number };
const SIMILAR_CACHE = new Map<string, CacheEntry<Movie[]>>();
const BECAUSE_CACHE = new Map<
  string,
  CacheEntry<{
    recommendations: Movie[];
    sourceMovie: Movie | null;
    category: string;
  }>
>();
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours — recommendations don't change minute-to-minute
const TV_SIMILAR_CACHE = new Map<string, CacheEntry<any[]>>();
const MAX_CACHE_ENTRIES = 128;
const MAX_CACHE_BYTES = 4 * 1024 * 1024;
const validId = (value: number) =>
  Number.isInteger(value) && value > 0 && value <= 2_147_483_647;

function logFailure(operation: string) {
  console.warn('[Recommendations API]', { operation, type: 'service_failure' });
}

function getCache<T>(map: Map<string, CacheEntry<T>>, key: string): T | null {
  const now = Date.now();
  const entry = map.get(key);
  if (entry && entry.expiresAt > now) {
    map.delete(key);
    map.set(key, entry);
    return entry.data;
  }
  if (entry) map.delete(key);
  return null;
}
function setCache<T>(
  map: Map<string, CacheEntry<T>>,
  key: string,
  data: T,
  ttlMs = DEFAULT_TTL_MS
) {
  const now = Date.now();
  for (const [oldKey, entry] of map) {
    if (entry.expiresAt <= now) map.delete(oldKey);
  }
  map.delete(key);
  const bytes = Buffer.byteLength(JSON.stringify(data), 'utf8');
  if (bytes > 512 * 1024) return;
  let totalBytes = [...map.values()].reduce(
    (total, entry) => total + entry.bytes,
    0
  );
  while (
    map.size &&
    (map.size >= MAX_CACHE_ENTRIES || totalBytes + bytes > MAX_CACHE_BYTES)
  ) {
    const oldest = map.keys().next().value!;
    totalBytes -= map.get(oldest)!.bytes;
    map.delete(oldest);
  }
  map.set(key, { data, bytes, expiresAt: now + ttlMs });
}

// Utility: create a timeout promise
function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  onTimeout?: () => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      onTimeout?.();
      reject(new Error(`Timed out after ${ms}ms`));
    }, ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

/**
 * Get personalized recommendations for the authenticated user
 */
export async function getPersonalizedRecommendations(
  req: RecommendationRequest
) {
  try {
    // Handle user authentication safely
    const userId = req.user?.claims?.sub;

    if (!userId) {
      return jsonWithStatus(401, { message: 'Unauthorized' });
    }

    // Get user's data for recommendation engine
    const watchHistory = await storage.getWatchHistory(userId);
    const preferences = await storage.getUserPreferences(userId);

    if (await recommendationConnector.isAvailable()) {
      try {
        const userFavorites = await db
          .select()
          .from(favoriteItems)
          .where(eq(favoriteItems.userId, userId))
          .limit(100);
        const ratedMovies: PersonalizationInput['rated_movies'] = watchHistory
          .filter(
            (item) =>
              validId(item.movieId) &&
              typeof item.rating === 'number' &&
              Number.isFinite(item.rating) &&
              item.rating >= 0 &&
              item.rating <= 5
          )
          .slice(0, 100)
          .map((item) => ({ id: item.movieId, rating: item.rating! }));
        const ratedIds = new Set(ratedMovies.map((item) => item.id));
        for (const item of userFavorites) {
          if (
            validId(item.movieId) &&
            !ratedIds.has(item.movieId) &&
            ratedMovies.length < 100
          ) {
            ratedMovies.push({ id: item.movieId, rating: 5 });
            ratedIds.add(item.movieId);
          }
        }
        const genres = await tmdbService.getGenres();
        const genreIds = new Map(
          genres.map((genre) => [
            String(genre.name).toLowerCase(),
            genre.id as number
          ])
        );
        const likedGenres = (preferences?.likedGenres || [])
          .map((value) =>
            /^\d+$/.test(value)
              ? Number(value)
              : genreIds.get(value.toLowerCase()) || 0
          )
          .filter(validId)
          .slice(0, 50);
        const userData: PersonalizationInput = {
          watched_ids: watchHistory
            .map((item) => item.movieId)
            .filter(validId)
            .slice(0, 20),
          rated_movies: ratedMovies,
          liked_genres: [...new Set(likedGenres)]
        };
        const recommendationResponse =
          await recommendationConnector.getPersonalizedRecommendations(
            userData
          );
        return jsonWithStatus(200, recommendationResponse);
      } catch {
        logFailure('personalized_python');
      }
    }
    const enhancedRecommendations =
      await recommendationEngine.getPersonalizedRecommendations(userId, 15);
    return jsonWithStatus(200, {
      recommendation_categories: [
        { category: 'Recommended for you', movies: enhancedRecommendations }
      ]
    });
  } catch (error) {
    logFailure('personalized');
    return jsonWithStatus(500, {
      message: 'Failed to generate recommendations'
    });
  }
}

/**
 * Get similar movies based on a specific movie
 */
export async function getSimilarMovies(req: RecommendationRequest) {
  try {
    const movieId = /^\d+$/.test(req.params.movieId)
      ? Number(req.params.movieId)
      : NaN;

    if (!validId(movieId)) {
      return jsonWithStatus(400, { message: 'Invalid movie ID' });
    }

    // Get authenticated user ID for personalized filtering
    const userId = req.user?.claims?.sub;

    // Serve from cache if we have fresh data
    const cacheKey = `${userId || 'public'}:${movieId}`;
    const cached = getCache(SIMILAR_CACHE, cacheKey);
    if (cached) {
      return jsonWithStatus(200, cached);
    }

    // Start both sources so a slow service does not delay the fallback.
    const userIdOrAnonymous = userId || 'anonymous-user';
    const pythonPromise = recommendationConnector.getSimilarMovies(movieId, 15);
    const fallbackPromise = recommendationEngine.getEnhancedBecauseYouWatched(
      userIdOrAnonymous,
      movieId,
      15
    );
    // The Python result may win before this promise is awaited.
    void fallbackPromise.catch(() => {});

    try {
      // Prefer Python if it returns quickly
      const pythonFast = await withTimeout(pythonPromise, 2500).catch(
        () => null
      );
      if (pythonFast && pythonFast.length > 0) {
        setCache(SIMILAR_CACHE, cacheKey, pythonFast);
        return jsonWithStatus(200, pythonFast);
      }
    } catch {}

    // Fallback path
    const fallback = await fallbackPromise;
    if (fallback.length) setCache(SIMILAR_CACHE, cacheKey, fallback);
    return jsonWithStatus(200, fallback);
  } catch (error) {
    logFailure('similar_movies');
    return jsonWithStatus(500, { message: 'Failed to fetch similar movies' });
  }
}

/**
 * Get trending movies with loading delay simulation for demonstration
 */
export async function getTrendingWithDelay(req: RecommendationRequest) {
  try {
    const movies = await tmdbService.getTrending();

    return jsonWithStatus(200, movies);
  } catch (error) {
    logFailure('trending');
    return jsonWithStatus(500, { message: 'Failed to fetch trending movies' });
  }
}

/**
 * Get "Because you liked X" style recommendations
 */
export async function getBecauseYouLikedRecommendations(
  req: RecommendationRequest
) {
  try {
    const movieId = /^\d+$/.test(req.params.movieId)
      ? Number(req.params.movieId)
      : NaN;

    if (!validId(movieId)) {
      return jsonWithStatus(400, { message: 'Invalid movie ID' });
    }

    // Get authenticated user ID for personalized filtering
    const userId = req.user?.claims?.sub;

    // Serve from cache if available
    const cacheKey = `${userId || 'public'}:${movieId}`;
    const cached = getCache(BECAUSE_CACHE, cacheKey);
    if (cached) {
      return jsonWithStatus(200, cached);
    }

    const sourceMovie = await tmdbService.getMovieDetails(movieId);
    const category = `Because you liked ${sourceMovie?.title || 'this movie'}`;

    // Hedge: Python vs enhanced TS fallback
    const pythonPromise =
      recommendationConnector.getBecauseYouLikedRecommendations(movieId, 12);
    const fallbackPromise = recommendationEngine
      .getEnhancedBecauseYouWatched(userId || 'anonymous-user', movieId, 12)
      .then((recs) => ({ recommendations: recs, sourceMovie, category }));
    void fallbackPromise.catch(() => {});

    let payload;
    try {
      const pythonFast = await withTimeout(pythonPromise, 2500).catch(
        () => null
      );
      payload = pythonFast ?? (await fallbackPromise);
    } catch {
      payload = await fallbackPromise;
    }

    if (payload.recommendations.length)
      setCache(BECAUSE_CACHE, cacheKey, payload);
    return jsonWithStatus(200, payload);
  } catch (error) {
    logFailure('because_you_liked');
    return jsonWithStatus(500, { message: 'Failed to get recommendations' });
  }
}

/**
 * Get enhanced similar TV shows (blended TMDB similar + recommendations with light scoring)
 */
export async function getSimilarTVShowsEnhanced(req: RecommendationRequest) {
  try {
    const tvId = /^\d+$/.test(req.params.tvId) ? Number(req.params.tvId) : NaN;

    if (!validId(tvId)) {
      return jsonWithStatus(400, { message: 'Invalid TV ID' });
    }

    const cacheKey = `${tvId}`;
    const cached = getCache(TV_SIMILAR_CACHE, cacheKey);
    if (cached) {
      return jsonWithStatus(200, cached);
    }

    // Hedge: prefer Python v2 microservice if it responds quickly; otherwise use enhanced TS engine, then TMDB
    const pythonPromise = recommendationConnector.getSimilarTV(tvId, 15);
    const enhancedPromise = recommendationEngine.getEnhancedSimilarTV(tvId, 15);
    void enhancedPromise.catch(() => {});

    let result: any[] | null = null;
    try {
      const pythonFast = await withTimeout(pythonPromise, 2500).catch(
        () => null
      );
      if (pythonFast && pythonFast.length) {
        result = pythonFast;
      }
    } catch {}

    if (!result) {
      const enhanced = await enhancedPromise;
      result =
        enhanced && enhanced.length
          ? enhanced
          : await tmdbService.getSimilarTV(tvId);
    }

    if (result.length) setCache(TV_SIMILAR_CACHE, cacheKey, result);
    return jsonWithStatus(200, result);
  } catch (error) {
    logFailure('similar_tv');
    return jsonWithStatus(500, { message: 'Failed to fetch similar TV shows' });
  }
}
