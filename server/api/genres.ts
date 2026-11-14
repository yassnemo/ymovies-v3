// Genres API endpoint
import { type Request, type Response } from 'express';
import { TMDBService } from '../services/tmdb';

export async function getGenres(req: Request, res: Response) {
  try {
    // Get the TMDBService instance from app locals
    const tmdbService: TMDBService = req.app.locals.tmdbService;

    if (!tmdbService) {
      return res.status(500).json({
        error: 'TMDB service not initialized'
      });
    }

    // Fetch genres from TMDB
    const genres = await tmdbService.getGenres();

    return res.json(genres);
  } catch (error) {
    console.error('Error fetching genres:', error);
    return res.status(500).json({
      error: 'Failed to fetch genres'
    });
  }
}
