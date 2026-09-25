import { Movie } from "@/types/movie";
import { API_BASE_URL } from "./apiConfig";
import { TVShow } from "@/types/tvshow";
import { getSimilarMovies } from "./tmdb";

/**
 * Get enhanced similar movies using the advanced recommendation algorithm
 */
export async function getEnhancedSimilarMovies(movieId: number): Promise<Movie[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommendations/similar/${movieId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Include auth token if user is authenticated
        ...(getAuthToken() && {
          'Authorization': `Bearer ${getAuthToken()}`
        })
      },
    });

    if (!response.ok) {
      console.warn(`Enhanced recommendations failed, status: ${response.status}`);
      // Fallback to TMDB similar movies if enhanced fails
      return getFallbackSimilarMovies(movieId);
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching enhanced similar movies:', error);
    // Fallback to TMDB similar movies if enhanced fails
    return getFallbackSimilarMovies(movieId);
  }
}

/**
 * Get "Because You Watched" style recommendations
 */
export async function getBecauseYouWatchedRecommendations(movieId: number): Promise<{
  recommendations: Movie[];
  sourceMovie: Movie;
  category: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommendations/because-you-liked/${movieId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() && {
          'Authorization': `Bearer ${getAuthToken()}`
        })
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      recommendations: data.recommendations || [],
      sourceMovie: data.sourceMovie,
      category: data.category || 'More Like This'
    };
  } catch (error) {
    console.error('Error fetching because you watched recommendations:', error);
    // Fallback to enhanced similar movies
    const fallbackMovies = await getEnhancedSimilarMovies(movieId);
    return {
      recommendations: fallbackMovies,
      sourceMovie: {} as Movie, // Empty movie object as fallback
      category: 'More Like This'
    };
  }
}

/**
 * Get enhanced similar TV shows using server-side blending
 */
export async function getEnhancedSimilarTV(tvId: number): Promise<TVShow[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tv/${tvId}/similar/enhanced`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() && {
          'Authorization': `Bearer ${getAuthToken()}`
        })
      },
    });

    if (!response.ok) {
      console.warn(`Enhanced TV similar failed, status: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching enhanced similar TV shows:', error);
    return [];
  }
}

/**
 * Fallback to basic TMDB similar movies
 */
async function getFallbackSimilarMovies(movieId: number): Promise<Movie[]> {
  try {
    return await getSimilarMovies(movieId);
  } catch (error) {
    console.error('Error fetching fallback similar movies:', error);
    return [];
  }
}

/**
 * Get authentication token from localStorage or auth context
 */
function getAuthToken(): string | null {
  try {
    // Try to get Supabase auth token from session
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.accessToken || null;
  } catch {
    return null;
  }
}

/**
 * Get personalized recommendation categories
 */
export async function getPersonalizedCategories(): Promise<Array<{
  category: string;
  movies: Movie[];
  recommendationType: string;
}>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/recommendations/personalized`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() && {
          'Authorization': `Bearer ${getAuthToken()}`
        })
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.recommendation_categories || [];
  } catch (error) {
    console.error('Error fetching personalized categories:', error);
    return [];
  }
}
