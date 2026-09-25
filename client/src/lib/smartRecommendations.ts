import { Movie } from "@/types/movie";
import { getEnhancedSimilarMovies, getBecauseYouWatchedRecommendations } from "./recommendations";
import { getSimilarMovies } from "./tmdb";

export interface RecommendationStrategy {
  name: string;
  description: string;
  priority: number;
  requiresAuth: boolean;
}

export interface EnhancedRecommendation {
  movies: Movie[];
  strategy: RecommendationStrategy;
  category: string;
  confidence: number;
  reasoning?: string;
}

export const RECOMMENDATION_STRATEGIES: Record<string, RecommendationStrategy> = {
  personalized: {
    name: "Personalized AI",
    description: "Based on your viewing history and preferences",
    priority: 1,
    requiresAuth: true
  },
  collaborative: {
    name: "Collaborative Filtering", 
    description: "Movies loved by users with similar tastes",
    priority: 2,
    requiresAuth: true
  },
  content_based: {
    name: "Content-Based",
    description: "Similar genres, cast, and themes",
    priority: 3,
    requiresAuth: false
  },
  hybrid: {
    name: "Hybrid Algorithm",
    description: "Combines multiple recommendation approaches",
    priority: 4,
    requiresAuth: false
  },
  fallback: {
    name: "TMDB Similar",
    description: "Basic similarity matching",
    priority: 5,
    requiresAuth: false
  }
};

export class SmartRecommendationEngine {
  private static instance: SmartRecommendationEngine;
  private cache = new Map<string, EnhancedRecommendation>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  static getInstance(): SmartRecommendationEngine {
    if (!SmartRecommendationEngine.instance) {
      SmartRecommendationEngine.instance = new SmartRecommendationEngine();
    }
    return SmartRecommendationEngine.instance;
  }

  private getCacheKey(movieId: number, isAuthenticated: boolean): string {
    return `recommendations_${movieId}_${isAuthenticated ? 'auth' : 'guest'}`;
  }

  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  async getSmartRecommendations(
    movieId: number, 
    isAuthenticated: boolean = false,
    limit: number = 15
  ): Promise<EnhancedRecommendation> {
    const cacheKey = this.getCacheKey(movieId, isAuthenticated);
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log(`Using cached recommendations for movie ${movieId}`);
        return cached;
      }
    }

    console.log(`Generating smart recommendations for movie ${movieId}, authenticated: ${isAuthenticated}`);

    try {
      let recommendation: EnhancedRecommendation;

      if (isAuthenticated) {
        // Try personalized recommendations first
        recommendation = await this.getPersonalizedRecommendations(movieId, limit);
      } else {
        // Use content-based for guests
        recommendation = await this.getContentBasedRecommendations(movieId, limit);
      }

      // Cache the result
      this.cache.set(cacheKey, recommendation);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

      return recommendation;
    } catch (error) {
      console.error('Error generating smart recommendations:', error);
      // Return fallback recommendations
      return this.getFallbackRecommendations(movieId, limit);
    }
  }

  private async getPersonalizedRecommendations(
    movieId: number, 
    limit: number
  ): Promise<EnhancedRecommendation> {
    try {
      const response = await getBecauseYouWatchedRecommendations(movieId);
      
      if (response.recommendations && response.recommendations.length > 0) {
        return {
          movies: response.recommendations.slice(0, limit),
          strategy: RECOMMENDATION_STRATEGIES.personalized,
          category: response.category || "Because you watched this",
          confidence: 0.9,
          reasoning: "AI analyzed your viewing patterns and preferences to find movies you'll love"
        };
      }
    } catch (error) {
      console.warn('Personalized recommendations failed, falling back to content-based');
    }

    // Fallback to content-based
    return this.getContentBasedRecommendations(movieId, limit);
  }

  private async getContentBasedRecommendations(
    movieId: number, 
    limit: number
  ): Promise<EnhancedRecommendation> {
    try {
      const movies = await getEnhancedSimilarMovies(movieId);
      
      if (movies && movies.length > 0) {
        return {
          movies: movies.slice(0, limit),
          strategy: RECOMMENDATION_STRATEGIES.content_based,
          category: "More Like This",
          confidence: 0.7,
          reasoning: "Matched based on genre, cast, director, and thematic similarities"
        };
      }
    } catch (error) {
      console.warn('Content-based recommendations failed, using fallback');
    }

    // Final fallback
    return this.getFallbackRecommendations(movieId, limit);
  }

  private async getFallbackRecommendations(
    movieId: number, 
    limit: number
  ): Promise<EnhancedRecommendation> {
    try {
      // Use basic TMDB similar movies as last resort
      const movies = await getSimilarMovies(movieId);

      if (movies.length > 0) {
        return {
          movies: movies.slice(0, limit),
          strategy: RECOMMENDATION_STRATEGIES.fallback,
          category: "Similar Movies",
          confidence: 0.4,
          reasoning: "Basic similarity matching from movie database"
        };
      }
    } catch (error) {
      console.error('Even fallback recommendations failed:', error);
    }

    // Return empty result if everything fails
    return {
      movies: [],
      strategy: RECOMMENDATION_STRATEGIES.fallback,
      category: "Recommendations Unavailable",
      confidence: 0,
      reasoning: "Unable to load recommendations at this time"
    };
  }

  /**
   * Get recommendation quality metrics for analytics
   */
  getQualityMetrics(recommendation: EnhancedRecommendation): {
    diversity: number;
    novelty: number;
    relevance: number;
    overall: number;
  } {
    const movieCount = recommendation.movies.length;
    
    if (movieCount === 0) {
      return { diversity: 0, novelty: 0, relevance: 0, overall: 0 };
    }

    // Calculate diversity (variety of genres)
    const genres = new Set();
    recommendation.movies.forEach(movie => {
      movie.genre_ids?.forEach(genreId => genres.add(genreId));
    });
    const diversity = Math.min(genres.size / 10, 1); // Normalize to 0-1

    // Calculate novelty (mix of popular and lesser-known movies)
    const avgPopularity = recommendation.movies.reduce((sum, movie) => 
      sum + (movie.popularity || 0), 0) / movieCount;
    const novelty = Math.max(0, 1 - (avgPopularity / 100)); // Higher score for lower popularity

    // Relevance is based on strategy confidence
    const relevance = recommendation.confidence;

    // Overall quality score
    const overall = (diversity * 0.3 + novelty * 0.2 + relevance * 0.5);

    return {
      diversity: Math.round(diversity * 100) / 100,
      novelty: Math.round(novelty * 100) / 100,
      relevance: Math.round(relevance * 100) / 100,
      overall: Math.round(overall * 100) / 100
    };
  }

  /**
   * Clear cache (useful for testing or when user preferences change)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log('Recommendation cache cleared');
  }
}
