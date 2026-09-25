import axios from "axios";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type QueryParams = Record<string, string>;
type CacheState = "fresh" | "stale" | "expired";

export type TMDBCacheStatus = "HIT" | "MISS" | "STALE" | "COALESCED" | "FALLBACK";

export interface TMDBCachePolicy {
  freshMs: number;
  staleWhileRevalidateMs: number;
  staleIfErrorMs: number;
}

export interface TMDBFetchResult<T> {
  data: T;
  cacheStatus: TMDBCacheStatus;
  ageSeconds: number;
  browserMaxAgeSeconds: number;
  staleWhileRevalidateSeconds: number;
  staleIfErrorSeconds: number;
}

export class TMDBServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly retryable: boolean,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "TMDBServiceError";
  }
}

interface CacheEntry {
  data: unknown;
  storedAt: number;
  freshUntil: number;
  staleUntil: number;
  staleIfErrorUntil: number;
  sizeBytes: number;
  policy: TMDBCachePolicy;
}

interface SharedState {
  cache: Map<string, CacheEntry>;
  cacheBytes: number;
  notFound: Map<string, number>;
  inFlight: Map<string, Promise<CacheEntry>>;
  activeRequests: number;
  recentRequestStarts: number[];
  backoffUntil: number;
  consecutiveFailures: number;
}

interface TMDBServiceOptions {
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  request?: (endpoint: string, params: QueryParams) => Promise<unknown>;
  maxCacheEntries?: number;
  maxCacheBytes?: number;
}

const newState = (): SharedState => ({
  cache: new Map(),
  cacheBytes: 0,
  notFound: new Map(),
  inFlight: new Map(),
  activeRequests: 0,
  recentRequestStarts: [],
  backoffUntil: 0,
  consecutiveFailures: 0,
});
const sharedState = newState();

const PUBLIC_ENDPOINT_PATTERNS = [
  /^\/trending\/(movie|tv|all)\/(day|week)$/,
  /^\/movie\/(popular|top_rated|now_playing|upcoming)$/,
  /^\/tv\/(popular|top_rated|airing_today|on_the_air)$/,
  /^\/(movie|tv)\/\d+$/,
  /^\/(movie|tv)\/\d+\/(similar|recommendations|videos|reviews|images)$/,
  /^\/(movie|tv)\/\d+\/watch\/providers$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/genre\/(movie|tv)\/list$/,
  /^\/discover\/(movie|tv)$/,
  /^\/search\/(movie|tv|multi)$/,
  /^\/configuration\/(countries|languages)$/,
  /^\/collection\/\d+$/,
];

const ALLOWED_QUERY_PARAMS = new Set([
  "air_date.gte", "air_date.lte", "append_to_response", "first_air_date.gte",
  "first_air_date.lte", "first_air_date_year", "include_adult",
  "include_image_language", "language", "page", "primary_release_date.gte",
  "primary_release_date.lte", "primary_release_year", "query", "region",
  "release_date.gte", "release_date.lte", "sort_by", "timezone",
  "vote_average.gte", "vote_average.lte", "vote_count.gte", "vote_count.lte",
  "watch_region", "with_companies", "with_genres", "with_keywords",
  "with_origin_country", "with_original_language", "with_runtime.gte",
  "with_runtime.lte", "with_watch_providers", "without_genres",
]);

const SAFE_APPEND_RESPONSES = new Set([
  "aggregate_credits", "content_ratings", "credits", "external_ids", "images",
  "keywords", "recommendations", "release_dates", "reviews", "similar", "videos",
]);

function envNumber(name: string, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function cachePolicyFor(endpoint: string): TMDBCachePolicy {
  if (endpoint.startsWith("/configuration/") || endpoint.startsWith("/genre/")) {
    return { freshMs: DAY, staleWhileRevalidateMs: DAY, staleIfErrorMs: 7 * DAY };
  }
  if (endpoint.startsWith("/search/")) {
    return { freshMs: 15 * MINUTE, staleWhileRevalidateMs: 15 * MINUTE, staleIfErrorMs: 2 * HOUR };
  }
  if (endpoint.includes("/recommendations") || endpoint.includes("/similar")) {
    return { freshMs: 16 * HOUR, staleWhileRevalidateMs: 8 * HOUR, staleIfErrorMs: 3 * DAY };
  }
  if (endpoint.startsWith("/trending/") || endpoint.endsWith("/popular")) {
    return { freshMs: 1_015 * MINUTE, staleWhileRevalidateMs: 6 * HOUR, staleIfErrorMs: 2 * DAY };
  }
  if (/^\/(movie|tv)\/\d+$/.test(endpoint) || endpoint.startsWith("/collection/")) {
    return { freshMs: 624 * HOUR, staleWhileRevalidateMs: DAY, staleIfErrorMs: 7 * DAY };
  }
  if (endpoint.includes("/images") || endpoint.includes("/videos") || endpoint.includes("/watch/providers")) {
    return { freshMs: DAY, staleWhileRevalidateMs: 12 * HOUR, staleIfErrorMs: 3 * DAY };
  }
  return { freshMs: HOUR, staleWhileRevalidateMs: HOUR, staleIfErrorMs: DAY };
}

function getCacheState(entry: CacheEntry, now: number): CacheState {
  if (now < entry.freshUntil) return "fresh";
  if (now < entry.staleUntil) return "stale";
  return "expired";
}

function normalizeEndpoint(endpoint: string): string {
  const normalized = `/${endpoint}`.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  if (!PUBLIC_ENDPOINT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new TMDBServiceError("Unsupported TMDB resource", 404, false);
  }
  return normalized;
}

export function normalizeTMDBParams(params: QueryParams = {}): QueryParams {
  const normalized: QueryParams = {};
  for (const [key, rawValue] of Object.entries(params)) {
    if (!ALLOWED_QUERY_PARAMS.has(key)) {
      throw new TMDBServiceError("Unsupported TMDB query parameter", 400, false);
    }
    if (typeof rawValue !== "string" || rawValue.length > 500 || key.length > 64) {
      throw new TMDBServiceError("Invalid TMDB query parameter", 400, false);
    }
    let value = rawValue.trim();
    if (key === "query") {
      value = value.replace(/\s+/g, " ").toLocaleLowerCase("en-US");
      if (!value || value.length > 200) throw new TMDBServiceError("Invalid search query", 400, false);
    }
    if (key === "append_to_response") {
      const fields = value.split(",").map((field) => field.trim()).filter(Boolean);
      if (fields.some((field) => !SAFE_APPEND_RESPONSES.has(field))) {
        throw new TMDBServiceError("Unsupported appended TMDB resource", 400, false);
      }
      value = [...new Set(fields)].sort().join(",");
    }
    normalized[key] = value;
  }
  return Object.fromEntries(Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b)));
}

export function createTMDBCacheKey(endpoint: string, params: QueryParams = {}): string {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const normalizedParams = normalizeTMDBParams(params);
  return `${normalizedEndpoint}?${new URLSearchParams(normalizedParams).toString()}`;
}

export class TMDBService {
  private readonly baseUrl = "https://api.themoviedb.org/3";
  private readonly now: () => number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly requestOverride?: (endpoint: string, params: QueryParams) => Promise<unknown>;
  private readonly state: SharedState;
  private readonly maxCacheEntries: number;
  private readonly maxCacheBytes: number;

  constructor(private readonly apiKey: string, options: TMDBServiceOptions = {}) {
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.requestOverride = options.request;
    this.state = options.request ? newState() : sharedState;
    this.maxCacheEntries = options.maxCacheEntries ?? envNumber("TMDB_CACHE_MAX_ENTRIES", 500, 50, 2_000);
    this.maxCacheBytes = options.maxCacheBytes ?? envNumber("TMDB_CACHE_MAX_BYTES", 64 * 1024 * 1024, 8 * 1024 * 1024, 256 * 1024 * 1024);
    if (!apiKey && !options.request) {
      console.warn("TMDB service is disabled because the server-side TMDB_API_KEY is missing.");
    }
  }

  async getPublicResource<T = unknown>(endpoint: string, params: QueryParams = {}): Promise<TMDBFetchResult<T>> {
    const normalizedEndpoint = normalizeEndpoint(endpoint);
    const normalizedParams = normalizeTMDBParams(params);
    const cacheKey = createTMDBCacheKey(normalizedEndpoint, normalizedParams);
    const policy = cachePolicyFor(normalizedEndpoint);
    const now = this.now();
    const negativeUntil = this.state.notFound.get(cacheKey);
    if (negativeUntil && negativeUntil > now) throw new TMDBServiceError("TMDB resource not found", 404, false);
    if (negativeUntil) this.state.notFound.delete(cacheKey);

    const cached = this.touch(cacheKey);
    if (cached) {
      const state = getCacheState(cached, now);
      if (state === "fresh") return this.result<T>(cached, "HIT", now);
      if (state === "stale") {
        void this.refresh(cacheKey, normalizedEndpoint, normalizedParams, policy).catch(() => undefined);
        return this.result<T>(cached, "STALE", now);
      }
    }

    const existingRequest = this.state.inFlight.get(cacheKey);
    if (existingRequest) {
      if (cached && now < cached.staleIfErrorUntil) return this.result<T>(cached, "STALE", now);
      return this.result<T>(await existingRequest, "COALESCED", this.now());
    }

    if (this.state.backoffUntil > now) {
      if (cached && now < cached.staleIfErrorUntil) return this.result<T>(cached, "STALE", now);
      const fallback = this.findFallback(normalizedEndpoint, normalizedParams, now);
      if (fallback) return this.result<T>(fallback, "FALLBACK", now);
      throw new TMDBServiceError("TMDB is temporarily rate limited", 429, true, Math.max(1, Math.ceil((this.state.backoffUntil - now) / SECOND)));
    }

    try {
      return this.result<T>(await this.refresh(cacheKey, normalizedEndpoint, normalizedParams, policy), "MISS", this.now());
    } catch (error) {
      if (cached && this.now() < cached.staleIfErrorUntil) return this.result<T>(cached, "STALE", this.now());
      const fallback = this.findFallback(normalizedEndpoint, normalizedParams, this.now());
      if (fallback) return this.result<T>(fallback, "FALLBACK", this.now());
      throw error;
    }
  }

  private result<T>(entry: CacheEntry, cacheStatus: TMDBCacheStatus, now: number): TMDBFetchResult<T> {
    const isFresh = now < entry.freshUntil;
    return {
      data: entry.data as T,
      cacheStatus,
      ageSeconds: Math.max(0, Math.floor((now - entry.storedAt) / SECOND)),
      browserMaxAgeSeconds: isFresh ? Math.max(0, Math.floor((entry.freshUntil - now) / SECOND)) : 0,
      staleWhileRevalidateSeconds: Math.floor(entry.policy.staleWhileRevalidateMs / SECOND),
      staleIfErrorSeconds: Math.floor(entry.policy.staleIfErrorMs / SECOND),
    };
  }

  private async refresh(cacheKey: string, endpoint: string, params: QueryParams, policy: TMDBCachePolicy): Promise<CacheEntry> {
    const existing = this.state.inFlight.get(cacheKey);
    if (existing) return existing;

    const promise = (async () => {
      try {
        const data = await this.fetchWithResilience(endpoint, params);
        const storedAt = this.now();
        const entry: CacheEntry = {
          data,
          storedAt,
          freshUntil: storedAt + policy.freshMs,
          staleUntil: storedAt + policy.freshMs + policy.staleWhileRevalidateMs,
          staleIfErrorUntil: storedAt + policy.freshMs + policy.staleWhileRevalidateMs + policy.staleIfErrorMs,
          sizeBytes: Buffer.byteLength(JSON.stringify(data)),
          policy,
        };
        this.store(cacheKey, entry);
        return entry;
      } catch (error) {
        if (error instanceof TMDBServiceError && error.statusCode === 404) {
          // Five minutes is safely below the requested 3,060-second negative-cache ceiling.
          this.state.notFound.set(cacheKey, this.now() + 5 * MINUTE);
          this.trimNotFound();
        }
        throw error;
      }
    })();

    this.state.inFlight.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      if (this.state.inFlight.get(cacheKey) === promise) this.state.inFlight.delete(cacheKey);
    }
  }

  private async fetchWithResilience(endpoint: string, params: QueryParams): Promise<unknown> {
    if (!this.apiKey && !this.requestOverride) {
      throw new TMDBServiceError("TMDB service is not configured", 503, false);
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      this.reserveUpstreamRequest();
      try {
        const data = this.requestOverride
          ? await this.requestOverride(endpoint, params)
          : await this.requestTMDB(endpoint, params);
        this.state.consecutiveFailures = 0;
        this.state.backoffUntil = 0;
        return data;
      } catch (error) {
        const serviceError = this.toServiceError(error);
        if (serviceError.statusCode === 429) {
          const retryAfter = Math.min(300, Math.max(1, serviceError.retryAfterSeconds ?? 10));
          this.state.backoffUntil = Math.max(this.state.backoffUntil, this.now() + retryAfter * SECOND);
          throw new TMDBServiceError("TMDB is temporarily rate limited", 429, true, retryAfter);
        }
        const lastAttempt = attempt === 1;
        if (!serviceError.retryable || lastAttempt) {
          if (serviceError.retryable) this.recordFailure();
          throw serviceError;
        }
        await this.sleep(250 * (attempt + 1));
      } finally {
        this.state.activeRequests = Math.max(0, this.state.activeRequests - 1);
      }
    }
    throw new TMDBServiceError("TMDB is temporarily unavailable", 503, true, 2);
  }

  private reserveUpstreamRequest(): void {
    const now = this.now();
    if (this.state.backoffUntil > now) {
      throw new TMDBServiceError("TMDB is temporarily rate limited", 429, true, Math.ceil((this.state.backoffUntil - now) / SECOND));
    }
    this.state.recentRequestStarts = this.state.recentRequestStarts.filter((startedAt) => now - startedAt < SECOND);
    if (this.state.activeRequests >= 16 || this.state.recentRequestStarts.length >= 30) {
      throw new TMDBServiceError("TMDB request capacity is temporarily busy", 429, true, 1);
    }
    this.state.activeRequests += 1;
    this.state.recentRequestStarts.push(now);
  }

  private async requestTMDB(endpoint: string, params: QueryParams): Promise<unknown> {
    const usesBearer = this.apiKey.startsWith("ey");
    const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      headers: usesBearer ? { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" } : { Accept: "application/json" },
      params: usesBearer ? params : { ...params, api_key: this.apiKey },
      timeout: 4_500,
      validateStatus: () => true,
    });
    if (response.status >= 200 && response.status < 300) return response.data;
    if (response.status === 404) throw new TMDBServiceError("TMDB resource not found", 404, false);
    if (response.status === 429) {
      throw new TMDBServiceError("TMDB is temporarily rate limited", 429, true, this.parseRetryAfter(response.headers?.["retry-after"]));
    }
    if (response.status >= 500) throw new TMDBServiceError("TMDB is temporarily unavailable", 503, true, 2);
    throw new TMDBServiceError("TMDB rejected the request", response.status === 401 ? 503 : 400, false);
  }

  private toServiceError(error: unknown): TMDBServiceError {
    if (error instanceof TMDBServiceError) return error;
    if (axios.isAxiosError(error)) {
      const isTimeout = error.code === "ECONNABORTED" || error.code === "ETIMEDOUT";
      return new TMDBServiceError(isTimeout ? "TMDB request timed out" : "TMDB is temporarily unavailable", 503, true, 2);
    }
    return new TMDBServiceError("TMDB is temporarily unavailable", 503, true, 2);
  }

  private parseRetryAfter(value: unknown): number {
    if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return 10;
  }

  private recordFailure(): void {
    this.state.consecutiveFailures += 1;
    if (this.state.consecutiveFailures < 3) return;
    const exponent = Math.min(4, this.state.consecutiveFailures - 3);
    this.state.backoffUntil = Math.max(this.state.backoffUntil, this.now() + Math.min(60, 5 * 2 ** exponent) * SECOND);
  }

  private touch(cacheKey: string): CacheEntry | undefined {
    const entry = this.state.cache.get(cacheKey);
    if (!entry) return undefined;
    this.state.cache.delete(cacheKey);
    this.state.cache.set(cacheKey, entry);
    return entry;
  }

  private store(cacheKey: string, entry: CacheEntry): void {
    if (entry.sizeBytes > this.maxCacheBytes) return;
    const previous = this.state.cache.get(cacheKey);
    if (previous) this.state.cacheBytes -= previous.sizeBytes;
    this.state.cache.delete(cacheKey);
    this.state.cache.set(cacheKey, entry);
    this.state.cacheBytes += entry.sizeBytes;
    while (this.state.cache.size > this.maxCacheEntries || this.state.cacheBytes > this.maxCacheBytes) {
      const oldestKey = this.state.cache.keys().next().value as string | undefined;
      if (!oldestKey) break;
      const oldest = this.state.cache.get(oldestKey);
      this.state.cache.delete(oldestKey);
      if (oldest) this.state.cacheBytes -= oldest.sizeBytes;
    }
  }

  private trimNotFound(): void {
    const now = this.now();
    for (const [key, expiresAt] of this.state.notFound) {
      if (expiresAt <= now) this.state.notFound.delete(key);
    }
    while (this.state.notFound.size > Math.min(500, this.maxCacheEntries)) {
      const oldestKey = this.state.notFound.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.state.notFound.delete(oldestKey);
    }
  }

  private findFallback(endpoint: string, params: QueryParams, now: number): CacheEntry | undefined {
    const isListRequest = endpoint.startsWith("/search/")
      || endpoint.startsWith("/discover/")
      || endpoint.startsWith("/trending/")
      || /\/(popular|top_rated|now_playing|upcoming|airing_today|on_the_air)$/.test(endpoint);
    if (!isListRequest) return undefined;

    const mediaType = endpoint.includes("/tv") || endpoint.endsWith("/tv")
      ? "tv"
      : endpoint.includes("/movie") || endpoint.endsWith("/movie") ? "movie" : "all";
    const fallbackEndpoints = mediaType === "tv"
      ? ["/tv/popular", "/trending/tv/week"]
      : mediaType === "movie"
        ? ["/movie/popular", "/trending/movie/week"]
        : ["/trending/all/week", "/movie/popular"];
    const contextualParams = Object.fromEntries(
      Object.entries(params).filter(([key]) => key === "language" || key === "region" || key === "include_adult"),
    );
    for (const fallbackEndpoint of fallbackEndpoints) {
      for (const fallbackParams of [contextualParams, {}]) {
        const entry = this.touch(createTMDBCacheKey(fallbackEndpoint, fallbackParams));
        if (entry && now < entry.staleIfErrorUntil) return entry;
      }
    }
    return undefined;
  }

  private async fetchData<T>(endpoint: string, params: QueryParams = {}): Promise<T> {
    return (await this.getPublicResource<T>(endpoint, params)).data;
  }

  async getTrending(timeWindow: "day" | "week" = "week"): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>(`/trending/movie/${timeWindow}`);
    return data.results || [];
  }

  async getPopular(): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>("/movie/popular");
    return data.results || [];
  }

  async getMovieDetails(movieId: number): Promise<any> {
    return this.fetchData(`/movie/${movieId}`, { append_to_response: "credits,images,reviews,videos" });
  }

  async getMovieSummary(movieId: number): Promise<any> {
    return this.fetchData(`/movie/${movieId}`);
  }

  async getMovieRecommendations(movieId: number): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>(`/movie/${movieId}/recommendations`);
    return data.results || [];
  }

  async getMovieVideos(movieId: number): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>(`/movie/${movieId}/videos`);
    return data.results || [];
  }

  async getMovieReviews(movieId: number): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>(`/movie/${movieId}/reviews`);
    return data.results || [];
  }

  async getTopRated(): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>("/movie/top_rated");
    return data.results || [];
  }

  async getUpcoming(): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>("/movie/upcoming");
    return data.results || [];
  }

  async getNowPlaying(): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>("/movie/now_playing");
    return data.results || [];
  }

  async getSimilarMovies(movieId: number): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>(`/movie/${movieId}/similar`);
    return data.results || [];
  }

  async getTVDetails(tvId: number): Promise<any> {
    return this.fetchData(`/tv/${tvId}`, { append_to_response: "credits,images" });
  }

  async getSimilarTV(tvId: number): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>(`/tv/${tvId}/similar`);
    return data.results || [];
  }

  async getTVRecommendations(tvId: number): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>(`/tv/${tvId}/recommendations`);
    return data.results || [];
  }

  async searchMovies(query: string): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>("/search/movie", { query });
    return data.results || [];
  }

  async getGenres(): Promise<any[]> {
    const data = await this.fetchData<{ genres?: any[] }>("/genre/movie/list");
    return data.genres || [];
  }

  async discoverMovies(params: QueryParams = {}): Promise<any[]> {
    const data = await this.fetchData<{ results?: any[] }>("/discover/movie", params);
    return data.results || [];
  }

  async getMoviesByIds(movieIds: number[]): Promise<any[]> {
    if (!movieIds.length) return [];
    const uniqueIds = [...new Set(movieIds.filter(Number.isFinite))];
    const movies = await Promise.all(uniqueIds.map((id) => this.getMovieDetails(id).catch(() => null)));
    return movies.filter((movie) => movie !== null);
  }
}
