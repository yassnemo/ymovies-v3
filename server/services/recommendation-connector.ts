import axios from 'axios';
import { WatchHistory } from '@shared/schema';
import { TMDBService } from './tmdb';

// Connection to the recommendation microservice
const RECOMMENDATION_SERVICE_URL = process.env.RECOMMENDATION_SERVICE_URL || 'http://localhost:5001';

/**
 * Service for connecting to the Python-based recommendation microservice
 */
export class RecommendationConnector {
  private baseUrl: string;
  private tmdbService: TMDBService;
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();
  private defaultTtlMs = 1000 * 60 * 60 * 6; // 6 hours — mirrors the API-layer cache
  private lastHealthOkAt = 0;
  private healthTtlMs = 1000 * 60 * 5; // health-check at most once every 5 minutes

  constructor(baseUrl = RECOMMENDATION_SERVICE_URL, tmdbApiKey = process.env.TMDB_API_KEY) {
    this.baseUrl = baseUrl;
    this.tmdbService = new TMDBService(tmdbApiKey || process.env.TMDB_BEARER_TOKEN || '');
  }

  /**
   * Check if the recommendation service is available
   * with configurable retry mechanism
   */
  async isAvailable(retries = 1, timeout = 2500): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthOkAt < this.healthTtlMs) {
      return true;
    }
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await axios.get(`${this.baseUrl}/health`, { timeout });
        if (response.status === 200) {
          this.lastHealthOkAt = Date.now();
          return true;
        }
      } catch (error) {
        if (attempt === retries) {
          console.error('Recommendation service health check failed:', error);
        } else {
          console.warn(`Recommendation service health check attempt ${attempt + 1} failed, retrying...`);
          // Wait a bit before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt)));
        }
      }
    }
    return false;
  }

  /**
   * Get similar movie recommendations
   */
  async getSimilarMovies(movieId: number, count = 10): Promise<any[]> {
    try {
      const cacheKey = `similar:${movieId}:${count}`;
      const cached = this.cache.get(cacheKey);
      const now = Date.now();
      if (cached && cached.expiresAt > now) return cached.data;
      // Prefer v2 engine if available
      let data: any[] = [];
      try {
        const v2 = await axios.get(`${this.baseUrl}/api/reco/v2/movie/${movieId}`, { timeout: 3500 });
        if (Array.isArray(v2.data) && v2.data.length) {
          data = v2.data.slice(0, count);
        }
      } catch {}
      if (!data.length) {
        const response = await axios.get(
          `${this.baseUrl}/recommendations/similar/${movieId}?count=${count}`,
          { timeout: 4000 }
        );
        data = response.data.recommendations || [];
      }
      this.cache.set(cacheKey, { data, expiresAt: now + this.defaultTtlMs });
      return data;
    } catch (error) {
      console.error(`Failed to get similar movies for ${movieId}:`, error);
      return this.getFallbackRecommendations(movieId);
    }
  }

  async getSimilarTV(tvId: number, count = 10): Promise<any[]> {
    try {
      const cacheKey = `similarTV:${tvId}:${count}`;
      const cached = this.cache.get(cacheKey);
      const now = Date.now();
      if (cached && cached.expiresAt > now) return cached.data;
      let data: any[] = [];
      try {
        const v2 = await axios.get(`${this.baseUrl}/api/reco/v2/tv/${tvId}`, { timeout: 3500 });
        if (Array.isArray(v2.data) && v2.data.length) {
          data = v2.data.slice(0, count);
        }
      } catch {}
      // Only cache successful non-empty results to avoid sticky empty caches
      if (data.length) {
        this.cache.set(cacheKey, { data, expiresAt: now + this.defaultTtlMs });
      }
      return data;
    } catch (error) {
      console.error(`Failed to get similar TV for ${tvId}:`, error);
      return [];
    }
  }

  /**
   * Get "Because you liked X" recommendations
   */
  async getBecauseYouLikedRecommendations(movieId: number, count = 10): Promise<any> {
    try {
      const cacheKey = `because:${movieId}:${count}`;
      const cached = this.cache.get(cacheKey);
      const now = Date.now();
      if (cached && cached.expiresAt > now) return cached.data;
      const response = await axios.get(
        `${this.baseUrl}/recommendations/because-you-liked/${movieId}?count=${count}`,
        { timeout: 5000 }
      );
      const category = `Because you liked ${response.data.source_movie?.title || 'this movie'}`;
      const data = {
        recommendations: response.data.recommendations || [],
        sourceMovie: response.data.source_movie,
        category
      };
      this.cache.set(cacheKey, { data, expiresAt: now + this.defaultTtlMs });
      return data;
    } catch (error) {
      console.error(`Failed to get "because you liked" recommendations for ${movieId}:`, error);
      return { recommendations: [], sourceMovie: null, category: 'Recommendations' };
    }
  }

  /**
   * Get personalized recommendations based on liked movies and watch history
   * With improved error handling and fallback mechanism
   */
  async getPersonalizedRecommendations(userData: any, count = 20): Promise<any> {
    try {
      // First check if the service is available before making the expensive call
      const isServiceUp = await this.isAvailable(1);
      
      if (!isServiceUp) {
        console.warn('Recommendation service is unavailable, using fallback mechanism');
        return this.generateFallbackPersonalizedRecommendations(userData, count);
      }
      
      // Use a longer timeout for this potentially complex operation
      const response = await axios.post(
        `${this.baseUrl}/recommendations/personalized?count=${count}`,
        userData,
        { timeout: 9000 } // 9 second timeout for complex recommendations
      );
      
      if (!response.data || !response.data.recommendation_categories || 
          response.data.recommendation_categories.length === 0) {
        console.warn('Received empty recommendations from service, using fallback');
        return this.generateFallbackPersonalizedRecommendations(userData, count);
      }
      
      return response.data;
    } catch (error) {
      console.error('Failed to get personalized recommendations:', error);
      return this.generateFallbackPersonalizedRecommendations(userData, count);
    }
  }
  
  /**
   * Generate fallback recommendations when the service is unavailable
   * This creates a more robust experience with multiple categories
   */
  private async generateFallbackPersonalizedRecommendations(userData: any, count = 20): Promise<any> {
    try {
      const categories = [];
      
      // Add a general recommendations category
      const popular = await this.getFallbackRecommendations();
      if (popular.length > 0) {
        categories.push({
          category: "Popular on Netflix",
          movies: popular.slice(0, count)
        });
      }
      
      // If user has liked movies, add recommendations based on a random liked movie
      if (userData.liked_movies && userData.liked_movies.length > 0) {
        const randomLikedMovieId = userData.liked_movies[Math.floor(Math.random() * userData.liked_movies.length)];
        const similarToLiked = await this.getFallbackRecommendations(randomLikedMovieId);
        
        if (similarToLiked.length > 0) {
          categories.push({
            category: "Because You Liked Similar Movies",
            movies: similarToLiked.slice(0, count)
          });
        }
      }
      
      // If the user has watch history, add trending recommendations
      if (userData.watch_history && userData.watch_history.length > 0) {
        const trending = await this.tmdbService.getTrending('week').catch(() => []);
        
        if (trending.length > 0) {
          categories.push({
            category: "Trending This Week",          movies: trending.slice(0, count)
          });
        }
      }
      
      return {
        recommendation_categories: categories.length > 0 ? categories : [{ 
          category: "Recommended for You", 
          movies: await this.getFallbackRecommendations() 
        }]
      };
    } catch (error) {
      console.error('Error in fallback recommendations generation:', error);
      return { 
        recommendation_categories: [{ 
          category: "Recommended for You", 
          movies: await this.getFallbackRecommendations() 
        }] 
      };
    }
  }

  /**
   * Get trending movie recommendations
   */
  async getTrendingRecommendations(count = 20): Promise<any[]> {
    try {
      const cacheKey = `trending:${count}`;
      const cached = this.cache.get(cacheKey);
      const now = Date.now();
      if (cached && cached.expiresAt > now) return cached.data;
      const response = await axios.get(
        `${this.baseUrl}/recommendations/trending?count=${count}`,
        { timeout: 4000 }
      );
      const data = response.data.recommendations || [];
      this.cache.set(cacheKey, { data, expiresAt: now + this.defaultTtlMs });
      return data;
    } catch (error) {
      console.error('Failed to get trending recommendations:', error);
      return [];
    }
  }

  /**
   * Enhanced fallback to TMDB API if recommendation service is unavailable
   * Provides better error handling and more diverse recommendations
   */
  async getFallbackRecommendations(movieId?: number): Promise<any[]> {
    try {
      const results = movieId
        ? await this.tmdbService.getMovieRecommendations(movieId)
        : await this.tmdbService.getPopular();
      
      // If we didn't get enough results, supplement with popular movies
      if (results.length < 5 && movieId) {
        const popularMovies = await this.tmdbService.getPopular();
        
        // Combine unique results based on movie ID
        const combinedResults = [...results];
        
        for (const movie of popularMovies) {
          if (!combinedResults.some(m => m.id === movie.id)) {
            combinedResults.push(movie);
          }
          
          // Stop once we have enough movies
          if (combinedResults.length >= 20) {
            break;
          }
        }
        
        return combinedResults;
      }
      
      return results;
    } catch (error) {
      console.error('Failed to get fallback recommendations:', error);
      
      // If the specific movie recommendation failed, try popular movies as a last resort
      if (movieId) {
        try {
          return await this.tmdbService.getPopular();
        } catch (secondError) {
          console.error('Failed to get even popular movies as fallback:', secondError);
          return [];
        }
      }
      
      return [];
    }
  }
}
