import { type Request, type Response } from 'express';
import { storage } from '../storage';
import { insertWatchHistorySchema } from '#shared/schema.ts';
import { TMDBService } from '../services/tmdb';
import { RecommendationConnector } from '../services/recommendation-connector';

// Define an interface for the user object with claims
interface AuthUser {
  claims?: {
    sub: string;
    [key: string]: any;
  };
}

// Initialize TMDb service
const tmdbService = new TMDBService(process.env.TMDB_API_KEY || '');

// Initialize recommendation connector
const recommendationConnector = new RecommendationConnector();

/**
 * Get user's watch history
 */
export async function getWatchHistory(req: Request, res: Response) {
  try {
    const userId = (req.user as AuthUser | undefined)?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const watchHistory = await storage.getWatchHistory(userId);

    // Fetch movie details for each watch history item
    const historyWithDetails = await Promise.all(
      watchHistory.map(async (item) => {
        const movieDetails = await tmdbService.getMovieDetails(item.movieId);
        return {
          ...item,
          movie: movieDetails
        };
      })
    );

    return res.json(historyWithDetails);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching watch history:', errorMessage);
    return res.status(500).json({ message: 'Failed to fetch watch history' });
  }
}

/**
 * Update watch progress for a movie
 */
export async function updateWatchProgress(req: Request, res: Response) {
  try {
    const userId = (req.user as AuthUser | undefined)?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate request body
    try {
      const validatedData = insertWatchHistorySchema.parse({
        ...req.body,
        userId
      });

      const updatedHistory = await storage.updateWatchProgress(validatedData);
      return res.json(updatedHistory);
    } catch (validationError) {
      return res
        .status(400)
        .json({ message: 'Invalid data format', error: validationError });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error updating watch progress:', errorMessage);
    return res.status(500).json({ message: 'Failed to update watch progress' });
  }
}

/**
 * Get recently watched movies
 */
export async function getRecentlyWatched(req: Request, res: Response) {
  try {
    const userId = (req.user as AuthUser | undefined)?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    const recentlyWatched = await storage.getRecentlyWatched(userId, limit);

    // Fetch movie details for each recently watched item
    const historyWithDetails = await Promise.all(
      recentlyWatched.map(async (item) => {
        const movieDetails = await tmdbService.getMovieDetails(item.movieId);
        return {
          ...item,
          movie: movieDetails
        };
      })
    );

    return res.json(historyWithDetails);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error fetching recently watched:', errorMessage);
    return res
      .status(500)
      .json({ message: 'Failed to fetch recently watched movies' });
  }
}

/**
 * Get watch history for a specific movie
 */
export async function getWatchHistoryForMovie(req: Request, res: Response) {
  try {
    const userId = (req.user as AuthUser | undefined)?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const movieId = parseInt(req.params.movieId);

    if (isNaN(movieId)) {
      return res.status(400).json({ message: 'Invalid movie ID' });
    }

    const watchHistory = await storage.getWatchHistoryByMovieId(
      userId,
      movieId
    );

    if (!watchHistory) {
      return res
        .status(404)
        .json({ message: 'No watch history found for this movie' });
    }

    return res.json(watchHistory);
  } catch (error) {
    console.error('Error fetching watch history for movie:', error);
    return res
      .status(500)
      .json({ message: 'Failed to fetch watch history for movie' });
  }
}

/**
 * Rate a movie
 */
export async function rateMovie(req: Request, res: Response) {
  try {
    const userId = (req.user as AuthUser | undefined)?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const movieId = parseInt(req.params.movieId);
    const { rating } = req.body;

    if (isNaN(movieId)) {
      return res.status(400).json({ message: 'Invalid movie ID' });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: 'Rating must be a number between 1 and 5' });
    }

    const updatedHistory = await storage.saveRating(userId, movieId, rating);
    return res.json(updatedHistory);
  } catch (error) {
    console.error('Error rating movie:', error);
    return res.status(500).json({ message: 'Failed to rate movie' });
  }
}

/**
 * Get user's watching statistics
 */
export async function getWatchingStats(req: Request, res: Response) {
  try {
    const userId = (req.user as AuthUser | undefined)?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const stats = await storage.getWatchHistoryStats(userId);
    return res.json(stats);
  } catch (error) {
    console.error('Error fetching watching stats:', error);
    return res.status(500).json({ message: 'Failed to fetch watching stats' });
  }
}

/**
 * Get top rated movies for user
 */
export async function getTopRatedMovies(req: Request, res: Response) {
  try {
    const userId = (req.user as AuthUser | undefined)?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const topRated = await storage.getTopRatedMovies(userId, limit);

    // Fetch movie details for each top rated item
    const topRatedWithDetails = await Promise.all(
      topRated.map(async (item) => {
        const movieDetails = await tmdbService.getMovieDetails(item.movieId);
        return {
          ...item,
          movie: movieDetails
        };
      })
    );

    return res.json(topRatedWithDetails);
  } catch (error) {
    console.error('Error fetching top rated movies:', error);
    return res
      .status(500)
      .json({ message: 'Failed to fetch top rated movies' });
  }
}

/**
 * Get most watched movies for user
 */
export async function getMostWatchedMovies(req: Request, res: Response) {
  try {
    const userId = (req.user as AuthUser | undefined)?.claims?.sub;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const mostWatched = await storage.getMostWatchedMovies(userId, limit);

    // Fetch movie details for each most watched item
    const mostWatchedWithDetails = await Promise.all(
      mostWatched.map(async (item) => {
        const movieDetails = await tmdbService.getMovieDetails(item.movieId);
        return {
          ...item,
          movie: movieDetails
        };
      })
    );

    return res.json(mostWatchedWithDetails);
  } catch (error) {
    console.error('Error fetching most watched movies:', error);
    return res
      .status(500)
      .json({ message: 'Failed to fetch most watched movies' });
  }
}
