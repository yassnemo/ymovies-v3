import axios, { type AxiosInstance } from 'axios';
import { TMDBService } from './tmdb';

export interface PersonalizationInput {
  watched_ids: number[];
  rated_movies: { id: number; rating: number; genre_ids?: number[] }[];
  liked_genres: number[];
}

const validId = (value: number) =>
  Number.isInteger(value) && value > 0 && value <= 2_147_483_647;
const resultCount = (count: number) =>
  Number.isInteger(count) ? Math.max(1, Math.min(30, count)) : 10;

function serviceUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const loopback =
      url.hostname === 'localhost' ||
      url.hostname === '[::1]' ||
      /^127\.\d+\.\d+\.\d+$/.test(url.hostname);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
    ) {
      return null;
    }
    return url.href.replace(/\/+$/, '') + '/';
  } catch {
    return null;
  }
}

function logFailure(operation: string, error: unknown) {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  console.warn('[Recommendations]', {
    operation,
    type: axios.isAxiosError(error) ? 'upstream' : 'internal',
    status: Number.isInteger(status) ? status : undefined
  });
}

interface CacheEntry {
  data: any;
  expiresAt: number;
  bytes: number;
}

export class RecommendationConnector {
  private service: AxiosInstance | null = null;
  private tmdbService: TMDBService;
  private cache = new Map<string, CacheEntry>();
  private cacheBytes = 0;
  private readonly cacheTtlMs = 6 * 60 * 60 * 1000;
  private readonly maxCacheEntries = 128;
  private readonly maxCacheBytes = 8 * 1024 * 1024;
  private lastHealthAt = 0;
  private lastHealthOk = false;

  constructor(
    baseUrl = process.env.RECOMMENDATION_SERVICE_URL,
    tmdbApiKey = process.env.TMDB_API_KEY,
    token = process.env.RECOMMENDATION_SERVICE_TOKEN
  ) {
    this.tmdbService = new TMDBService(
      tmdbApiKey || process.env.TMDB_BEARER_TOKEN || ''
    );
    const url = serviceUrl(baseUrl);
    const credential = token?.trim();
    if (url && credential) {
      this.service = axios.create({
        baseURL: url,
        headers: { Authorization: `Bearer ${credential}` },
        timeout: 4000,
        maxRedirects: 0,
        maxContentLength: 1024 * 1024,
        maxBodyLength: 64 * 1024,
        validateStatus: (status) => status === 200
      });
    } else if (baseUrl || credential) {
      console.warn(
        '[Recommendations] Service disabled: configure a valid URL and service token.'
      );
    }
  }

  private removeCache(key: string) {
    const entry = this.cache.get(key);
    if (entry) this.cacheBytes -= entry.bytes;
    this.cache.delete(key);
  }

  private getCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.removeCache(key);
      return null;
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  private setCache(key: string, data: unknown) {
    const now = Date.now();
    for (const [oldKey, entry] of this.cache) {
      if (entry.expiresAt <= now) this.removeCache(oldKey);
    }
    this.removeCache(key);
    const bytes = Buffer.byteLength(JSON.stringify(data), 'utf8');
    if (bytes > 512 * 1024) return;
    while (
      this.cache.size &&
      (this.cache.size >= this.maxCacheEntries ||
        this.cacheBytes + bytes > this.maxCacheBytes)
    ) {
      this.removeCache(this.cache.keys().next().value!);
    }
    this.cache.set(key, { data, bytes, expiresAt: now + this.cacheTtlMs });
    this.cacheBytes += bytes;
  }

  async isAvailable(retries = 1, timeout = 2500): Promise<boolean> {
    if (!this.service) return false;
    const ttl = this.lastHealthOk ? 5 * 60 * 1000 : 30 * 1000;
    if (this.lastHealthAt && Date.now() - this.lastHealthAt < ttl)
      return this.lastHealthOk;
    const attempts = Number.isInteger(retries)
      ? Math.max(0, Math.min(1, retries))
      : 0;
    for (let attempt = 0; attempt <= attempts; attempt++) {
      try {
        const response = await this.service.get('health', {
          timeout: Math.max(100, Math.min(2500, timeout))
        });
        if (response.data?.status !== 'healthy')
          throw new Error('Invalid health response');
        this.lastHealthAt = Date.now();
        this.lastHealthOk = true;
        return true;
      } catch (error) {
        if (attempt === attempts) logFailure('health', error);
      }
    }
    this.lastHealthAt = Date.now();
    this.lastHealthOk = false;
    return false;
  }

  private async similar(
    media: 'movie' | 'tv',
    id: number,
    count: number
  ): Promise<any[]> {
    if (!this.service || !validId(id)) return [];
    const limit = resultCount(count);
    const key = `${media}:${id}:${limit}`;
    const cached = this.getCache(key);
    if (cached) return cached;
    try {
      const response = await this.service.get(`api/reco/v2/${media}/${id}`);
      if (!Array.isArray(response.data))
        throw new Error('Invalid recommendations response');
      const data = response.data.slice(0, limit);
      if (data.length) this.setCache(key, data);
      return data;
    } catch (error) {
      logFailure(media, error);
      return [];
    }
  }

  getSimilarMovies(movieId: number, count = 10): Promise<any[]> {
    return this.similar('movie', movieId, count);
  }

  getSimilarTV(tvId: number, count = 10): Promise<any[]> {
    return this.similar('tv', tvId, count);
  }

  async getBecauseYouLikedRecommendations(
    movieId: number,
    count = 10
  ): Promise<any | null> {
    const recommendations = await this.getSimilarMovies(movieId, count);
    if (!recommendations.length) return null;
    const sourceMovie = await this.tmdbService.getMovieDetails(movieId);
    return {
      recommendations,
      sourceMovie,
      category: `Because you liked ${sourceMovie?.title || 'this movie'}`
    };
  }

  async getPersonalizedRecommendations(
    input: PersonalizationInput
  ): Promise<any> {
    if (!this.service) throw new Error('Recommendation service is unavailable');
    // Copy only the bounded contract. Never send account identifiers or full history rows.
    const data: PersonalizationInput = {
      watched_ids: input.watched_ids.filter(validId).slice(0, 20),
      liked_genres: input.liked_genres.filter(validId).slice(0, 50),
      rated_movies: input.rated_movies
        .filter(
          (item) =>
            validId(item.id) &&
            Number.isFinite(item.rating) &&
            item.rating >= 0 &&
            item.rating <= 5
        )
        .slice(0, 100)
        .map((item) => ({
          id: item.id,
          rating: item.rating,
          genre_ids: item.genre_ids?.filter(validId).slice(0, 50) || []
        }))
    };
    try {
      const response = await this.service.post(
        'recommendations/personalized',
        data,
        { timeout: 9000 }
      );
      if (
        !Array.isArray(response.data?.recommendation_categories) ||
        !response.data.recommendation_categories.some(
          (category: any) =>
            Array.isArray(category?.movies) && category.movies.length
        )
      ) {
        throw new Error('Empty recommendations response');
      }
      return response.data;
    } catch (error) {
      logFailure('personalized', error);
      throw new Error('Recommendation service is unavailable');
    }
  }

  async getTrendingRecommendations(count = 20): Promise<any[]> {
    return (await this.tmdbService.getTrending()).slice(0, resultCount(count));
  }

  async getFallbackRecommendations(movieId?: number): Promise<any[]> {
    try {
      if (movieId !== undefined && !validId(movieId)) return [];
      return movieId
        ? await this.tmdbService.getMovieRecommendations(movieId)
        : await this.tmdbService.getPopular();
    } catch (error) {
      logFailure('fallback', error);
      return [];
    }
  }
}
