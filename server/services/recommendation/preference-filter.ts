import { type Movie } from '#lib/types/movie.ts';
import { type UserProfile, type ContentContext } from './types';
import { ContentAnalyzer, TemporalCalculator } from './content-helpers';
/**
 * Class responsible for filtering movies based on user preferences
 */
export class PreferenceFilter {
  /**
   * Filter movies based on user preferences and content appropriateness
   */
  static filterByUserPreferences(
    movies: Movie[],
    sourceMovie: Movie,
    userProfile: UserProfile
  ): Movie[] {
    const sourceContext = ContentAnalyzer.analyzeContent(sourceMovie);
    return movies.filter((movie) => {
      return (
        this.passesQualityFilter(movie, sourceContext, userProfile) &&
        this.passesContentAppropriatenessFilter(movie, sourceContext) &&
        this.passesEraFilter(movie, sourceMovie, sourceContext, userProfile) &&
        this.passesLanguageFilter(movie, userProfile)
      );
    });
  }
  /**
   * Filter movies based on temporal relevance
   */
  static filterTemporallyRelevant(
    movies: Movie[],
    sourceMovie: Movie
  ): Movie[] {
    const sourceYear = TemporalCalculator.extractYear(sourceMovie.release_date);
    if (!sourceYear) return movies;
    return movies.filter((movie) => {
      const movieYear = TemporalCalculator.extractYear(movie.release_date);
      if (!movieYear) return false;
      return this.isTemporallyRelevant(movieYear, sourceYear);
    });
  }
  private static passesQualityFilter(
    movie: Movie,
    sourceContext: ContentContext,
    userProfile: UserProfile
  ): boolean {
    if (!movie.vote_average || !movie.vote_count) return true;
    const qualityThresholds = this.getQualityThresholds(
      sourceContext,
      userProfile
    );
    return (
      movie.vote_count >= qualityThresholds.minVoteCount &&
      movie.vote_average >= qualityThresholds.qualityThreshold
    );
  }
  private static getQualityThresholds(
    sourceContext: ContentContext,
    userProfile: UserProfile
  ) {
    const isFamilyContent = ContentAnalyzer.isFamilyContent(sourceContext);
    return {
      minVoteCount: isFamilyContent ? 30 : 50,
      qualityThreshold: isFamilyContent
        ? Math.max(5.5, userProfile.avgQualityThreshold - 0.5)
        : userProfile.avgQualityThreshold
    };
  }
  private static passesContentAppropriatenessFilter(
    movie: Movie,
    sourceContext: ContentContext
  ): boolean {
    const movieContext = ContentAnalyzer.analyzeContent(movie);
    if (ContentAnalyzer.isFamilyContent(sourceContext)) {
      return this.isAppropriateForFamily(movie, movieContext);
    } else {
      return this.isAppropriateForAdult(movie, movieContext);
    }
  }
  private static isAppropriateForFamily(
    movie: Movie,
    movieContext: ContentContext
  ): boolean {
    // Reject inappropriate content for family source
    if (movieContext.isMature) return false;
    // If not family-appropriate and low quality, reject
    if (
      !ContentAnalyzer.isFamilyAppropriate(movieContext) &&
      movie.vote_average &&
      movie.vote_average < 7.0
    ) {
      return false;
    }
    return true;
  }
  private static isAppropriateForAdult(
    movie: Movie,
    movieContext: ContentContext
  ): boolean {
    // For non-family source, avoid recommending family content unless it's high quality
    if (
      ContentAnalyzer.isFamilyContent(movieContext) &&
      movie.vote_average &&
      movie.vote_average < 7.5
    ) {
      return false;
    }
    return true;
  }
  private static passesEraFilter(
    movie: Movie,
    sourceMovie: Movie,
    sourceContext: ContentContext,
    userProfile: UserProfile
  ): boolean {
    if (!movie.release_date || userProfile.preferredDecades.length === 0)
      return true;
    const movieYear = TemporalCalculator.extractYear(movie.release_date);
    if (!movieYear) return true;
    if (ContentAnalyzer.isFamilyContent(sourceContext)) {
      return this.passesEraFilterForFamily(movie, movieYear);
    } else {
      return this.passesEraFilterForGeneral(movieYear, userProfile);
    }
  }
  private static passesEraFilterForFamily(
    movie: Movie,
    movieYear: number
  ): boolean {
    // For family content, filter out older animated content unless it's exceptional
    if (movieYear < 1995 && movie.vote_average && movie.vote_average < 8.0) {
      return false;
    }
    return true;
  }
  private static passesEraFilterForGeneral(
    movieYear: number,
    userProfile: UserProfile
  ): boolean {
    const hasModernPreference = userProfile.preferredDecades.some((decade) =>
      ['2020s', '2010s', '2000s'].includes(decade)
    );
    if (hasModernPreference && movieYear < 1990) {
      return false;
    }
    return true;
  }
  private static passesLanguageFilter(
    movie: Movie,
    userProfile: UserProfile
  ): boolean {
    if (!movie.original_language || userProfile.preferredLanguages.length === 0)
      return true;
    const hasNonEnglishPreference = userProfile.preferredLanguages.some(
      (lang) => lang !== 'en'
    );
    if (
      hasNonEnglishPreference &&
      !userProfile.preferredLanguages.includes(movie.original_language)
    ) {
      // Allow English movies even if user prefers other languages
      return movie.original_language === 'en';
    }
    return true;
  }
  private static isTemporallyRelevant(
    movieYear: number,
    sourceYear: number
  ): boolean {
    const yearDiff = Math.abs(movieYear - sourceYear);
    // For recent movies (2015+), be more strict about temporal relevance
    if (sourceYear >= 2015) return yearDiff <= 10;
    // For older movies, be more lenient
    if (sourceYear >= 2000) return yearDiff <= 15;
    // For very old movies, allow broader range
    return yearDiff <= 25;
  }
}
