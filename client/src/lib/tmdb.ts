import { Movie } from "@/types/movie";
import { TVShow } from "@/types/tvshow";
import { TMDB_PROXY_URL } from "@/lib/apiConfig";
import { createTMDBRequestUrl } from "./tmdbUrl";

const inFlightRequests = new Map<string, Promise<unknown>>();

export class TMDBClientError extends Error {
  constructor(message: string, public readonly status: number, public readonly retryAfterSeconds?: number) {
    super(message);
    this.name = "TMDBClientError";
  }
}

/**
 * Helper function to make requests to TMDb API
 */
async function fetchFromTMDb<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const requestUrl = createTMDBRequestUrl(TMDB_PROXY_URL, endpoint, window.location.origin, params);
  const cacheKey = requestUrl.toString();
  const existing = inFlightRequests.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const request = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(cacheKey, {
        credentials: "omit",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        const retryAfter = Number(response.headers.get("Retry-After")) || undefined;
        throw new TMDBClientError(body.message || "Movie data is temporarily unavailable", response.status, retryAfter);
      }
      return await response.json() as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new TMDBClientError("Movie data request timed out", 503, 2);
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  })();

  inFlightRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (inFlightRequests.get(cacheKey) === request) inFlightRequests.delete(cacheKey);
  }
}

/**
 * Get trending movies
 */
export async function getTrendingMovies(timeWindow: 'day' | 'week' = 'week'): Promise<Movie[]> {
  const data = await fetchFromTMDb<{ results: Movie[] }>(`/trending/movie/${timeWindow}`);
  return data.results;
}

/**
 * Get popular movies
 */
export async function getPopularMovies(): Promise<Movie[]> {
  const data = await fetchFromTMDb<{ results: Movie[] }>("/movie/popular");
  return data.results;
}

/**

 * Get movie details by ID
 */
export async function getMovieDetails(movieId: number): Promise<Movie> {
  return fetchFromTMDb<Movie>(`/movie/${movieId}`, {
    append_to_response: "credits,videos,similar,recommendations"
  });
}

/**
 * Search for movies by query
 */
export async function searchMovies(query: string): Promise<Movie[]> {
  try {
    const data = await fetchFromTMDb<{ results: Movie[] }>("/search/movie", { query });
    return data.results;
  } catch (error) {
    console.error("Error searching movies:", error);
    // Return empty array on error to prevent UI crashes
    return [];
  }
}

/**
 * Get list of genres
 */
export async function getGenres(): Promise<{ id: number; name: string }[]> {
  const data = await fetchFromTMDb<{ genres: { id: number; name: string }[] }>("/genre/movie/list");
  return data.genres;
}

/**
 * Discover movies based on parameters
 */
export async function discoverMovies(params: Record<string, string> = {}): Promise<Movie[]> {
  const data = await fetchFromTMDb<{ results: Movie[] }>("/discover/movie", {
    sort_by: "popularity.desc",
    ...params
  });
  return data.results;
}

/**
 * Get similar movies for a movie ID
 */
export async function getSimilarMovies(movieId: number): Promise<Movie[]> {
  const data = await fetchFromTMDb<{ results: Movie[] }>(`/movie/${movieId}/similar`);
  return data.results;
}

/**
 * Get movie videos (trailers, etc)
 */
export async function getMovieVideos(movieId: number): Promise<{
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}[]> {
  const data = await fetchFromTMDb<{ results: {
    id: string;
    key: string;
    name: string;
    site: string;
    type: string;
  }[] }>(`/movie/${movieId}/videos`);
  return data.results;
}

/**
 * Get movie reviews
 */
export async function getMovieReviews(movieId: number): Promise<{
  id: string;
  author: string;
  content: string;
  created_at: string;
  url?: string;
  author_details: {
    username: string;
    rating?: number;
    avatar_path?: string;
  };
}[]> {
  const data = await fetchFromTMDb<{ results: {
    id: string;
    author: string;
    content: string;
    created_at: string;
    url?: string;
    author_details: {
      username: string;
      rating?: number;
      avatar_path?: string;
    };
  }[] }>(`/movie/${movieId}/reviews`);
  return data.results;
}

/**
 * Get trending TV shows
 */
export async function getTrendingTVShows(timeWindow: 'day' | 'week' = 'week'): Promise<TVShow[]> {
  const data = await fetchFromTMDb<{ results: TVShow[] }>(`/trending/tv/${timeWindow}`);
  return data.results;
}

/**
 * Get popular TV shows
 */
export async function getPopularTVShows(): Promise<TVShow[]> {
  const data = await fetchFromTMDb<{ results: TVShow[] }>("/tv/popular");
  return data.results;
}

/**
 * Get TV show details by ID
 */
export async function getTVShowDetails(tvId: number): Promise<TVShow> {
  return fetchFromTMDb<TVShow>(`/tv/${tvId}`, {
    append_to_response: "credits,videos,similar,recommendations"
  });
}

/**
 * Search for TV shows by query
 */
export async function searchTVShows(query: string): Promise<TVShow[]> {
  try {
    const data = await fetchFromTMDb<{ results: TVShow[] }>("/search/tv", { query });
    return data.results;
  } catch (error) {
    console.error("Error searching TV shows:", error);
    // Return empty array on error to prevent UI crashes
    return [];
  }
}

/**
 * Get list of TV genres
 */
export async function getTVGenres(): Promise<{ id: number; name: string }[]> {
  const data = await fetchFromTMDb<{ genres: { id: number; name: string }[] }>("/genre/tv/list");
  return data.genres;
}

/**
 * Discover TV shows based on parameters
 */
export async function discoverTVShows(params: Record<string, string> = {}): Promise<TVShow[]> {
  const data = await fetchFromTMDb<{ results: TVShow[] }>("/discover/tv", {
    sort_by: "popularity.desc",
    ...params
  });
  return data.results;
}

/**
 * Get similar TV shows for a TV show ID
 */
export async function getSimilarTVShows(tvId: number): Promise<TVShow[]> {
  const data = await fetchFromTMDb<{ results: TVShow[] }>(`/tv/${tvId}/similar`);
  return data.results;
}

/**
 * Get TV show videos (trailers, etc)
 */
export async function getTVShowVideos(tvId: number): Promise<any[]> {
  const data = await fetchFromTMDb<{ results: any[] }>(`/tv/${tvId}/videos`);
  return data.results;
}

/**
 * Get TV show reviews
 */
export async function getTVShowReviews(tvId: number): Promise<any[]> {
  const data = await fetchFromTMDb<{ results: any[] }>(`/tv/${tvId}/reviews`);
  return data.results;
}

/**
 * Get TV show episodes for a specific season
 */
export async function getTVShowEpisodes(tvId: number, seasonNumber: number): Promise<any[]> {
  const data = await fetchFromTMDb<{ episodes: any[] }>(`/tv/${tvId}/season/${seasonNumber}`);
  return data.episodes;
}

/**
 * Get TV show season details
 */
export async function getTVShowSeasonDetails(tvId: number, seasonNumber: number): Promise<any> {
  return fetchFromTMDb<any>(`/tv/${tvId}/season/${seasonNumber}`);
}

/**
 * Get top rated TV shows
 */
export async function getTopRatedTVShows(): Promise<TVShow[]> {
  const data = await fetchFromTMDb<{ results: TVShow[] }>("/tv/top_rated");
  return data.results;
}

/**
 * Get TV shows by genre ID with pagination support
 */
export async function getTVShowsByGenre(genreId: number, page: number = 1, sortBy: string = "popularity.desc"): Promise<TVShow[]> {
  const data = await fetchFromTMDb<{ results: TVShow[] }>("/discover/tv", {
    with_genres: genreId.toString(),
    page: page.toString(),
    sort_by: sortBy
  });
  return data.results;
}

/**
 * Get movies by genre ID with pagination support
 */
export async function getMoviesByGenre(genreId: number, page: number = 1, sortBy: string = "popularity.desc"): Promise<Movie[]> {
  const data = await fetchFromTMDb<{ results: Movie[] }>("/discover/movie", {
    with_genres: genreId.toString(),
    page: page.toString(),
    sort_by: sortBy
  });
  return data.results;
}

/**
 * Get TV shows airing today
 */
export async function getTVShowsAiringToday(): Promise<TVShow[]> {
  const data = await fetchFromTMDb<{ results: TVShow[] }>("/tv/airing_today");
  return data.results;
}

/**
 * Get TV shows on the air (currently airing)
 */
export async function getTVShowsOnTheAir(): Promise<TVShow[]> {
  const data = await fetchFromTMDb<{ results: TVShow[] }>("/tv/on_the_air");
  return data.results;
}

/**
 * Search for both movies and TV shows
 */
export type MediaItem = (Movie | TVShow) & { media_type: 'movie' | 'tv' };

export async function searchMulti(query: string): Promise<MediaItem[]> {
  try {
    const data = await fetchFromTMDb<{ results: MediaItem[] }>("/search/multi", { query });
    // Filter to only movies and TV shows (exclude people)
    const filteredResults = data.results.filter(item => 
      item.media_type === 'movie' || item.media_type === 'tv'
    );
    return filteredResults;
  } catch (error) {
    console.error("Error in multi search:", error);
    return [];
  }
}

/**
 * Get trending content (all media types)
 */
export async function getTrendingAll(timeWindow: 'day' | 'week' = 'week'): Promise<MediaItem[]> {
  const data = await fetchFromTMDb<{ results: MediaItem[] }>(`/trending/all/${timeWindow}`);
  return data.results;
}

/**
 * Get top-rated movies
 */
export async function getTopRatedMovies(): Promise<Movie[]> {
  const data = await fetchFromTMDb<{ results: Movie[] }>("/movie/top_rated");
  return data.results;
}

/**
 * Get now playing movies (in cinemas)
 */
export async function getNowPlayingMovies(): Promise<Movie[]> {
  const data = await fetchFromTMDb<{ results: Movie[] }>("/movie/now_playing");
  return data.results;
}

/**
 * Get upcoming movies
 */
export async function getUpcomingMovies(): Promise<Movie[]> {
  const data = await fetchFromTMDb<{ results: Movie[] }>("/movie/upcoming");
  return data.results;
}

/**
 * Get movie recommendations
 */
export async function getMovieRecommendations(movieId: number): Promise<Movie[]> {
  const data = await fetchFromTMDb<{ results: Movie[] }>(`/movie/${movieId}/recommendations`);
  return data.results;
}

/**
 * Get TV show recommendations
 */
export async function getTVShowRecommendations(tvId: number): Promise<TVShow[]> {
  const data = await fetchFromTMDb<{ results: TVShow[] }>(`/tv/${tvId}/recommendations`);
  return data.results;
}

/**
 * Get content by original language
 */
export async function getContentByLanguage(
  mediaType: 'movie' | 'tv', 
  language: string, 
  genreId?: number
): Promise<(Movie | TVShow)[]> {
  const params: Record<string, string> = {
    with_original_language: language,
    sort_by: "popularity.desc"
  };
  
  if (genreId) {
    params.with_genres = genreId.toString();
  }
  
  const data = await fetchFromTMDb<{ results: (Movie | TVShow)[] }>(`/discover/${mediaType}`, params);
  return data.results;
}

/**
 * Get content by runtime filter
 */
export async function getMoviesByRuntime(
  maxRuntime?: number, 
  minRuntime?: number,
  sortBy: string = "popularity.desc"
): Promise<Movie[]> {
  const params: Record<string, string> = {
    sort_by: sortBy
  };
  
  if (maxRuntime) {
    params['with_runtime.lte'] = maxRuntime.toString();
  }
  
  if (minRuntime) {
    params['with_runtime.gte'] = minRuntime.toString();
  }
  
  const data = await fetchFromTMDb<{ results: Movie[] }>("/discover/movie", params);
  return data.results;
}

/**
 * Get content by release date range
 */
export async function getMoviesByDateRange(
  startDate: string, 
  endDate: string,
  sortBy: string = "popularity.desc"
): Promise<Movie[]> {
  const params: Record<string, string> = {
    'primary_release_date.gte': startDate,
    'primary_release_date.lte': endDate,
    sort_by: sortBy
  };
  
  const data = await fetchFromTMDb<{ results: Movie[] }>("/discover/movie", params);
  return data.results;
}

/**
 * Get critically acclaimed content (high vote average with many votes)
 */
export async function getCriticallyAcclaimed(
  mediaType: 'movie' | 'tv',
  minVoteCount: number = 500,
  sortBy: string = "vote_average.desc"
): Promise<(Movie | TVShow)[]> {
  const params: Record<string, string> = {
    'vote_count.gte': minVoteCount.toString(),
    sort_by: sortBy
  };
  
  const data = await fetchFromTMDb<{ results: (Movie | TVShow)[] }>(`/discover/${mediaType}`, params);
  return data.results;
}

/**
 * Get hidden gems (good ratings but fewer votes)
 */
export async function getHiddenGems(
  mediaType: 'movie' | 'tv',
  minVoteCount: number = 100,
  maxVoteCount: number = 1000,
  minVoteAverage: number = 7.0
): Promise<(Movie | TVShow)[]> {
  const params: Record<string, string> = {
    'vote_count.gte': minVoteCount.toString(),
    'vote_count.lte': maxVoteCount.toString(),
    'vote_average.gte': minVoteAverage.toString(),
    sort_by: "vote_average.desc"
  };
  
  const data = await fetchFromTMDb<{ results: (Movie | TVShow)[] }>(`/discover/${mediaType}`, params);
  return data.results;
}

/**
 * Get content by keywords
 */
export async function getContentByKeywords(
  mediaType: 'movie' | 'tv',
  keywordIds: number[],
  sortBy: string = "popularity.desc"
): Promise<(Movie | TVShow)[]> {
  const params: Record<string, string> = {
    with_keywords: keywordIds.join(','),
    sort_by: sortBy
  };
  
  const data = await fetchFromTMDb<{ results: (Movie | TVShow)[] }>(`/discover/${mediaType}`, params);
  return data.results;
}

/**
 * Get content by production company
 */
export async function getContentByCompany(
  mediaType: 'movie' | 'tv',
  companyIds: number[],
  sortBy: string = "popularity.desc"
): Promise<(Movie | TVShow)[]> {
  const params: Record<string, string> = {
    with_companies: companyIds.join(','),
    sort_by: sortBy
  };
  
  const data = await fetchFromTMDb<{ results: (Movie | TVShow)[] }>(`/discover/${mediaType}`, params);
  return data.results;
}

/**
 * Get collection details
 */
export async function getCollection(collectionId: number): Promise<{
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  parts: Movie[];
}> {
  return fetchFromTMDb<{
    id: number;
    name: string;
    overview: string;
    poster_path: string;
    backdrop_path: string;
    parts: Movie[];
  }>(`/collection/${collectionId}`);
}

// Search filter types
export interface SearchFilters {
  country?: string;
  language?: string;
  year?: number;
  rating?: number;
  sortBy?: 'popularity.desc' | 'popularity.asc' | 'release_date.desc' | 'release_date.asc' | 'vote_average.desc' | 'vote_average.asc';
  genre?: number;
}

// Client-side sort applied to search results (TMDB search endpoint ignores sort_by)
function applyClientSort<T extends { popularity: number; vote_average: number; release_date?: string; first_air_date?: string }>(
  items: T[],
  sortBy: string
): T[] {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'popularity.asc':  return a.popularity - b.popularity;
      case 'popularity.desc': return b.popularity - a.popularity;
      case 'vote_average.asc':  return a.vote_average - b.vote_average;
      case 'vote_average.desc': return b.vote_average - a.vote_average;
      case 'release_date.asc':
      case 'release_date.desc': {
        const da = a.release_date ?? a.first_air_date ?? '';
        const db = b.release_date ?? b.first_air_date ?? '';
        return sortBy === 'release_date.desc' ? db.localeCompare(da) : da.localeCompare(db);
      }
      default: return 0;
    }
  });
}

/**
 * Search movies by text query, then apply filters/sort client-side.
 * TMDB /search/movie only supports year and language server-side;
 * rating, genre, and sort_by must be applied after the response.
 */
export async function searchMoviesWithFilters(query: string, filters: SearchFilters = {}): Promise<Movie[]> {
  try {
    const params: Record<string, string> = { query };
    if (filters.year) params.primary_release_year = filters.year.toString();
    if (filters.language) params.language = filters.language;

    const data = await fetchFromTMDb<{ results: Movie[] }>("/search/movie", params);
    let results = data.results;

    if (filters.rating) results = results.filter(m => m.vote_average >= filters.rating!);
    if (filters.genre)  results = results.filter(m => (m.genre_ids ?? []).includes(filters.genre!));
    if (filters.sortBy) results = applyClientSort(results, filters.sortBy);

    return results;
  } catch (error) {
    console.error("Error in movie search with filters:", error);
    return [];
  }
}

/**
 * Search TV shows by text query, then apply filters/sort client-side.
 */
export async function searchTVShowsWithFilters(query: string, filters: SearchFilters = {}): Promise<TVShow[]> {
  try {
    const params: Record<string, string> = { query };
    if (filters.year) params.first_air_date_year = filters.year.toString();
    if (filters.language) params.language = filters.language;

    const data = await fetchFromTMDb<{ results: TVShow[] }>("/search/tv", params);
    let results = data.results;

    if (filters.rating) results = results.filter(s => s.vote_average >= filters.rating!);
    if (filters.genre)  results = results.filter(s => (s.genre_ids ?? []).includes(filters.genre!));
    if (filters.sortBy) results = applyClientSort(results, filters.sortBy);

    return results;
  } catch (error) {
    console.error("Error in TV show search with filters:", error);
    return [];
  }
}

/**
 * Discover movies using TMDB /discover/movie — supports all filter params server-side.
 * Used when there is no text query.
 */
export async function discoverMoviesWithFilters(filters: SearchFilters = {}): Promise<Movie[]> {
  try {
    const params: Record<string, string> = {
      sort_by: filters.sortBy || 'popularity.desc',
    };
    if (filters.year)     params.primary_release_year = filters.year.toString();
    if (filters.language) params.with_original_language = filters.language;
    if (filters.rating)   params['vote_average.gte'] = filters.rating.toString();
    if (filters.genre)    params.with_genres = filters.genre.toString();
    if (filters.country)  params.with_origin_country = filters.country;

    const data = await fetchFromTMDb<{ results: Movie[] }>("/discover/movie", params);
    return data.results;
  } catch (error) {
    console.error("Error discovering movies with filters:", error);
    return [];
  }
}

/**
 * Discover TV shows using TMDB /discover/tv — supports all filter params server-side.
 * Used when there is no text query.
 */
export async function discoverTVShowsWithFilters(filters: SearchFilters = {}): Promise<TVShow[]> {
  try {
    const params: Record<string, string> = {
      sort_by: filters.sortBy || 'popularity.desc',
    };
    if (filters.year)     params.first_air_date_year = filters.year.toString();
    if (filters.language) params.with_original_language = filters.language;
    if (filters.rating)   params['vote_average.gte'] = filters.rating.toString();
    if (filters.genre)    params.with_genres = filters.genre.toString();
    if (filters.country)  params.with_origin_country = filters.country;

    const data = await fetchFromTMDb<{ results: TVShow[] }>("/discover/tv", params);
    return data.results;
  } catch (error) {
    console.error("Error discovering TV shows with filters:", error);
    return [];
  }
}

/**
 * Get list of countries for filtering
 */
export async function getCountries(): Promise<{ iso_3166_1: string; english_name: string }[]> {
  try {
    const data = await fetchFromTMDb<{ iso_3166_1: string; english_name: string }[]>("/configuration/countries");
    return data;
  } catch (error) {
    console.error("Error fetching countries:", error);
    return [];
  }
}

/**
 * Get list of languages for filtering
 */
export async function getLanguages(): Promise<{ iso_639_1: string; english_name: string; name: string }[]> {
  try {
    const data = await fetchFromTMDb<{ iso_639_1: string; english_name: string; name: string }[]>("/configuration/languages");
    return data;
  } catch (error) {
    console.error("Error fetching languages:", error);
    return [];
  }
}

/**
 * Get movie watch providers by region
 */
export async function getMovieWatchProviders(movieId: number, region: string = "US"): Promise<any | null> {
  try {
    const data = await fetchFromTMDb<{ results: Record<string, any> }>(`/movie/${movieId}/watch/providers`);
    return data.results?.[region] || null;
  } catch {
    return null;
  }
}

/**
 * Get TV show watch providers by region
 */
export async function getTVWatchProviders(tvId: number, region: string = "US"): Promise<any | null> {
  try {
    const data = await fetchFromTMDb<{ results: Record<string, any> }>(`/tv/${tvId}/watch/providers`);
    return data.results?.[region] || null;
  } catch {
    return null;
  }
}

/**
 * ================================
 * Title Logo Helpers (TMDB Images)
 * ================================
 */

export interface TMDBImageAsset {
  aspect_ratio: number;
  file_path: string;
  height: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
  width: number;
}

export async function getMovieLogos(movieId: number): Promise<TMDBImageAsset[]> {
  try {
    const data = await fetchFromTMDb<{ logos: TMDBImageAsset[] }>(`/movie/${movieId}/images`, {
      include_image_language: "en,null"
    });
    return data.logos || [];
  } catch (error) {
    console.error("Error fetching movie logos:", error);
    return [];
  }
}

export async function getTVLogos(tvId: number): Promise<TMDBImageAsset[]> {
  try {
    const data = await fetchFromTMDb<{ logos: TMDBImageAsset[] }>(`/tv/${tvId}/images`, {
      include_image_language: "en,null"
    });
    return data.logos || [];
  } catch (error) {
    console.error("Error fetching TV logos:", error);
    return [];
  }
}

export function pickBestLogo(logos: TMDBImageAsset[]): TMDBImageAsset | null {
  if (!logos || logos.length === 0) return null;

  // Prefer English, then language-agnostic (null), then any
  const languagePriority = (lang: string | null) =>
    lang === "en" ? 2 : lang === null ? 1 : 0;

  const sorted = [...logos].sort((a, b) => {
    const langDiff = languagePriority(b.iso_639_1) - languagePriority(a.iso_639_1);
    if (langDiff !== 0) return langDiff;
    if (b.vote_average !== a.vote_average) return b.vote_average - a.vote_average;
    if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
    return b.width - a.width;
  });

  return sorted[0] || null;
}
