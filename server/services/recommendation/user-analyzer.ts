import { storage } from '../../storage';
import { TMDBService } from '../tmdb';
import { type UserProfile, type RecommendationQuery } from './types';
import { TemporalCalculator } from './content-helpers';
import { type WatchHistory } from '#shared/schema.ts';
/**
 * Class responsible for analyzing user preferences and behavior
 */
export class UserPreferenceAnalyzer {
  constructor(private tmdbService: TMDBService) {}
  /**
   * Analyze user preferences based on watch history and ratings
   */
  async analyzeUserPreferences(userId: string): Promise<UserProfile> {
    try {
      const watchHistory = await storage.getWatchHistory(userId);
      const analysisData = await this.gatherAnalysisData(watchHistory);
      return {
        preferredDecades: this.calculatePreferredDecades(
          analysisData.movieYears
        ),
        preferredGenres: this.calculatePreferredGenres(
          analysisData.genreCounts
        ),
        avgQualityThreshold: this.calculateQualityThreshold(
          analysisData.qualityScores
        ),
        preferredLanguages: this.calculatePreferredLanguages(
          analysisData.languageCounts
        ),
        recentWatchingPatterns: this.calculateWatchingPatterns(watchHistory)
      };
    } catch (error) {
      console.error('Error analyzing user preferences:');
      return this.getDefaultProfile();
    }
  }
  /**
   * Calculate implicit rating based on watch behavior
   */
  static calculateImplicitRating(history: WatchHistory): number {
    let rating = 3; // Base neutral rating
    rating += this.getWatchProgressBonus(history.watchProgress ?? undefined);
    rating += this.getRewatchBonus(history.watchCount ?? undefined);
    rating += this.getRecencyBonus(history.watchedAt?.toISOString());
    rating += this.getWatchDurationBonus(history.watchDuration ?? undefined);
    return Math.max(1, Math.min(5, rating));
  }
  private async gatherAnalysisData(watchHistory: WatchHistory[]) {
    const completedMovies = watchHistory.filter((item) => item.completed);
    const ratedMovies = watchHistory.filter(
      (item) => item.rating && item.rating >= 4
    );
    const relevantMovies = [...completedMovies, ...ratedMovies];
    const movieDetailsPromises = relevantMovies
      .slice(0, 20)
      .map(async (item) => {
        try {
          const details = await this.tmdbService.getMovieDetails(item.movieId);
          return { item, details };
        } catch (error) {
          console.error('[Database] Storage operation failed.');
          return null;
        }
      });
    const movieDetails = (await Promise.all(movieDetailsPromises)).filter(
      Boolean
    );
    const analysisData = {
      movieYears: [] as number[],
      genreCounts: {} as Record<number, number>,
      languageCounts: {} as Record<string, number>,
      qualityScores: [] as number[]
    };
    movieDetails.forEach((movieDetail) => {
      if (!movieDetail?.details) return;
      this.processMovieForAnalysis(movieDetail, analysisData);
    });
    return analysisData;
  }
  private processMovieForAnalysis(movieDetail: any, analysisData: any): void {
    const { item, details } = movieDetail;
    // Analyze release years
    this.analyzeReleaseYear(details, analysisData.movieYears);
    // Analyze genres with weighting
    this.analyzeGenres(details, item, analysisData.genreCounts);
    // Analyze languages
    this.analyzeLanguages(details, item, analysisData.languageCounts);
    // Track quality preferences
    this.analyzeQuality(details, analysisData.qualityScores);
  }
  private analyzeReleaseYear(details: any, movieYears: number[]): void {
    if (!details.release_date) return;
    const year = parseInt(details.release_date.split('-')[0]);
    if (!isNaN(year) && year > 1900) {
      movieYears.push(year);
    }
  }
  private analyzeGenres(
    details: any,
    item: any,
    genreCounts: Record<number, number>
  ): void {
    if (!details.genre_ids) return;
    const weight = item.rating ? item.rating : item.completed ? 3 : 1;
    details.genre_ids.forEach((genreId: number) => {
      genreCounts[genreId] = (genreCounts[genreId] || 0) + weight;
    });
  }
  private analyzeLanguages(
    details: any,
    item: any,
    languageCounts: Record<string, number>
  ): void {
    if (!details.original_language) return;
    const weight = item.rating ? item.rating : item.completed ? 2 : 1;
    languageCounts[details.original_language] =
      (languageCounts[details.original_language] || 0) + weight;
  }
  private analyzeQuality(details: any, qualityScores: number[]): void {
    if (details.vote_average && details.vote_count && details.vote_count > 50) {
      qualityScores.push(details.vote_average);
    }
  }
  private calculatePreferredDecades(movieYears: number[]): string[] {
    if (movieYears.length === 0) return ['2020s', '2010s'];
    const decadeCounts: Record<string, number> = {};
    movieYears.forEach((year) => {
      const decade = TemporalCalculator.getDecade(year);
      decadeCounts[decade] = (decadeCounts[decade] || 0) + 1;
    });
    return Object.entries(decadeCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([decade]) => decade);
  }
  private calculatePreferredGenres(
    genreCounts: Record<number, number>
  ): number[] {
    return Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([genreId]) => parseInt(genreId));
  }
  private calculateQualityThreshold(qualityScores: number[]): number {
    return qualityScores.length > 0
      ? Math.max(
          6.0,
          qualityScores.reduce((sum, score) => sum + score, 0) /
            qualityScores.length -
            1.0
        )
      : 6.5;
  }
  private calculatePreferredLanguages(
    languageCounts: Record<string, number>
  ): string[] {
    return Object.entries(languageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([lang]) => lang);
  }
  private calculateWatchingPatterns(watchHistory: WatchHistory[]) {
    const completedMovies = watchHistory.filter((item) => item.completed);
    const ratedMovies = watchHistory.filter(
      (item) => item.rating && item.rating >= 4
    );
    return {
      totalWatched: watchHistory.length,
      completionRate: completedMovies.length / Math.max(1, watchHistory.length),
      avgRating:
        ratedMovies.length > 0
          ? ratedMovies.reduce((sum, item) => sum + item.rating!, 0) /
            ratedMovies.length
          : null
    };
  }
  private getDefaultProfile(): UserProfile {
    return {
      preferredDecades: ['2020s', '2010s'],
      preferredGenres: [],
      avgQualityThreshold: 6.5,
      preferredLanguages: ['en'],
      recentWatchingPatterns: {
        totalWatched: 0,
        completionRate: 0,
        avgRating: null
      }
    };
  }
  private static getWatchProgressBonus(watchProgress?: number): number {
    if (!watchProgress) return 0;
    if (watchProgress >= 0.9) return 1.5;
    if (watchProgress >= 0.75) return 1;
    if (watchProgress >= 0.5) return 0.3;
    if (watchProgress < 0.3) return -1.2;
    if (watchProgress < 0.15) return -1.8;
    return 0;
  }
  private static getRewatchBonus(watchCount?: number): number {
    if (!watchCount || watchCount <= 1) return 0;
    return Math.min((watchCount - 1) * 0.8, 2);
  }
  private static getRecencyBonus(watchedAt?: string): number {
    if (!watchedAt) return 0;
    const daysSinceWatch =
      (Date.now() - new Date(watchedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceWatch < 7) return 0.2;
    if (daysSinceWatch > 365) return -0.1;
    return 0;
  }
  private static getWatchDurationBonus(watchDuration?: number): number {
    if (!watchDuration || watchDuration <= 0) return 0;
    const avgMovieLength = 120 * 60; // 120 minutes in seconds
    const completionRatio = watchDuration / avgMovieLength;
    if (completionRatio > 0.9) return 0.3;
    if (completionRatio < 0.3) return -0.2;
    return 0;
  }
}
