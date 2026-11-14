import { type Movie } from '#lib/types/movie.ts';
import {
  type ContentContext,
  type ScoreComponents,
  type TemporalRange
} from './types';

/**
 * Helper class for content analysis and classification
 */
export class ContentAnalyzer {
  private static readonly ANIMATION_GENRE = 16;
  private static readonly FAMILY_GENRE = 10751;
  private static readonly MATURE_GENRES = new Set([27, 53, 80]); // Horror, Thriller, Crime
  private static readonly FAMILY_FRIENDLY_GENRES = new Set([
    16, 10751, 35, 14, 12
  ]); // Animation, Family, Comedy, Fantasy, Adventure

  static analyzeContent(movie: Movie): ContentContext {
    const genres = new Set(movie.genre_ids || []);

    return {
      isAnimation: genres.has(this.ANIMATION_GENRE),
      isFamily: genres.has(this.FAMILY_GENRE),
      isMature: this.hasMatureContent(genres),
      contentGenres: genres
    };
  }

  static isFamilyContent(context: ContentContext): boolean {
    return context.isAnimation || context.isFamily;
  }

  static isFamilyAppropriate(context: ContentContext): boolean {
    return Array.from(context.contentGenres).some((genre) =>
      this.FAMILY_FRIENDLY_GENRES.has(genre)
    );
  }

  private static hasMatureContent(genres: Set<number>): boolean {
    return Array.from(genres).some((genre) => this.MATURE_GENRES.has(genre));
  }
}

/**
 * Helper class for temporal calculations
 */
export class TemporalCalculator {
  static getTemporalRange(sourceYear: number): TemporalRange {
    if (sourceYear >= 2015) {
      return { min: sourceYear - 8, max: sourceYear + 8 };
    } else if (sourceYear >= 2000) {
      return { min: sourceYear - 12, max: sourceYear + 12 };
    } else {
      return { min: sourceYear - 20, max: sourceYear + 20 };
    }
  }

  static calculateTemporalRelevance(movie: Movie, sourceMovie: Movie): number {
    const sourceYear = this.extractYear(sourceMovie.release_date);
    const movieYear = this.extractYear(movie.release_date);

    if (!sourceYear || !movieYear) return 0;

    const yearDiff = Math.abs(movieYear - sourceYear);

    if (sourceYear >= 2015) {
      return Math.max(0, (10 - yearDiff) / 10);
    } else if (sourceYear >= 2000) {
      return Math.max(0, (15 - yearDiff) / 15);
    } else {
      return Math.max(0, (25 - yearDiff) / 25);
    }
  }

  static extractYear(releaseDate?: string): number | null {
    if (!releaseDate) return null;
    const year = parseInt(releaseDate.split('-')[0]);
    return isNaN(year) ? null : year;
  }

  static getDecade(year: number): string {
    return `${Math.floor(year / 10) * 10}s`;
  }
}

/**
 * Helper class for genre-related calculations
 */
export class GenreAnalyzer {
  private static readonly GENRE_MAP: Record<number, string> = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Science Fiction',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
  };

  static getGenreName(genreId: number): string {
    return this.GENRE_MAP[genreId] || 'Movies';
  }

  static calculateGenreSimilarity(movie: Movie, sourceMovie: Movie): number {
    const sourceGenres = new Set(sourceMovie.genre_ids || []);
    const movieGenres = new Set(movie.genre_ids || []);

    if (sourceGenres.size === 0 || movieGenres.size === 0) return 0;

    const intersection = new Set(
      [...sourceGenres].filter((g) => movieGenres.has(g))
    );
    const union = new Set([...sourceGenres, ...movieGenres]);

    return intersection.size / union.size;
  }

  static calculateTitleSimilarity(title1: string, title2: string): number {
    if (title1 === title2) return 1.0;

    const words1 = new Set(
      title1
        .toLowerCase()
        .split(' ')
        .filter((w) => w.length > 2)
    );
    const words2 = new Set(
      title2
        .toLowerCase()
        .split(' ')
        .filter((w) => w.length > 2)
    );

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}
