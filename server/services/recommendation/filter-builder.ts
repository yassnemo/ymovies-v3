import { type Movie } from '#lib/types/movie.ts';
import {
  type RecommendationFilters,
  type ContentContext,
  type UserProfile,
  type TemporalRange
} from './types';
import { ContentAnalyzer, TemporalCalculator } from './content-helpers';

/**
 * Class responsible for building various types of discovery filters
 */
export class FilterBuilder {
  /**
   * Build enhanced genre filters with user context and content appropriateness
   */
  static buildGenreFilters(
    sourceMovie: Movie,
    userProfile: UserProfile
  ): RecommendationFilters {
    const sourceContext = ContentAnalyzer.analyzeContent(sourceMovie);
    const sourceGenres = sourceMovie.genre_ids || [];

    let primaryGenres = this.selectPrimaryGenres(sourceGenres, sourceContext);

    const filters: RecommendationFilters = {
      with_genres: primaryGenres.join(','),
      'vote_count.gte': ContentAnalyzer.isFamilyContent(sourceContext)
        ? '50'
        : '100',
      sort_by: 'vote_average.desc'
    };

    this.applyQualityThreshold(filters, sourceContext, userProfile);
    this.applyTemporalConstraints(
      filters,
      sourceMovie,
      sourceContext,
      userProfile
    );
    this.applyContentAppropriatenessFilters(filters, sourceContext);

    return filters;
  }

  /**
   * Build director filters with user context
   */
  static buildDirectorFilters(
    director: any,
    sourceMovie: Movie,
    userProfile: UserProfile
  ): RecommendationFilters {
    return {
      with_crew: director.id.toString(),
      'vote_count.gte': '50',
      'vote_average.gte': Math.max(
        6.0,
        userProfile.avgQualityThreshold - 0.5
      ).toString(),
      sort_by: 'vote_average.desc'
    };
  }

  /**
   * Build cast filters with user context
   */
  static buildCastFilters(
    actor: any,
    sourceMovie: Movie,
    userProfile: UserProfile
  ): RecommendationFilters {
    const filters: RecommendationFilters = {
      with_cast: actor.id.toString(),
      'vote_count.gte': '100',
      'vote_average.gte': Math.max(
        6.0,
        userProfile.avgQualityThreshold - 1.0
      ).toString(),
      sort_by: 'popularity.desc'
    };

    this.applyRecentMoviePreference(filters, userProfile);

    return filters;
  }

  /**
   * Build keyword-based filters for thematic similarity
   */
  static buildKeywordFilters(
    keywordIds: string,
    sourceMovie: Movie,
    userProfile: UserProfile
  ): RecommendationFilters {
    return {
      with_keywords: keywordIds,
      'vote_count.gte': '50',
      'vote_average.gte': userProfile.avgQualityThreshold.toString(),
      sort_by: 'vote_average.desc'
    };
  }

  /**
   * Build temporal genre filters for same-era recommendations
   */
  static buildTemporalGenreFilters(
    sourceMovie: Movie,
    userProfile: UserProfile
  ): RecommendationFilters {
    const sourceYear = TemporalCalculator.extractYear(sourceMovie.release_date);
    const filters: RecommendationFilters = {
      'vote_count.gte': '40',
      sort_by: 'vote_average.desc'
    };

    if (sourceMovie.genre_ids && sourceMovie.genre_ids.length > 0) {
      filters.with_genres = sourceMovie.genre_ids.slice(0, 2).join(',');
    }

    if (sourceYear) {
      const range = TemporalCalculator.getTemporalRange(sourceYear);
      filters['primary_release_date.gte'] = `${range.min}-01-01`;
      filters['primary_release_date.lte'] = `${range.max}-12-31`;
    }

    filters['vote_average.gte'] = Math.max(
      6.0,
      userProfile.avgQualityThreshold - 0.3
    ).toString();

    return filters;
  }

  private static selectPrimaryGenres(
    sourceGenres: number[],
    sourceContext: ContentContext
  ): number[] {
    let primaryGenres = sourceGenres.slice(0, 2);

    if (ContentAnalyzer.isFamilyContent(sourceContext)) {
      const familyFriendlyGenres = [16, 10751, 35, 14, 12];
      primaryGenres = sourceGenres.filter((id) =>
        familyFriendlyGenres.includes(id)
      );

      if (primaryGenres.length === 0) {
        primaryGenres = [16, 10751];
      }

      if (!primaryGenres.includes(16) && !primaryGenres.includes(10751)) {
        primaryGenres.unshift(sourceContext.isAnimation ? 16 : 10751);
      }
    }

    return primaryGenres;
  }

  private static applyQualityThreshold(
    filters: RecommendationFilters,
    sourceContext: ContentContext,
    userProfile: UserProfile
  ): void {
    const qualityThreshold = ContentAnalyzer.isFamilyContent(sourceContext)
      ? Math.max(6.0, userProfile.avgQualityThreshold - 0.5)
      : userProfile.avgQualityThreshold;

    filters['vote_average.gte'] = qualityThreshold.toString();
  }

  private static applyTemporalConstraints(
    filters: RecommendationFilters,
    sourceMovie: Movie,
    sourceContext: ContentContext,
    userProfile: UserProfile
  ): void {
    if (userProfile.preferredDecades.length === 0 || !sourceMovie.release_date)
      return;

    const sourceYear = TemporalCalculator.extractYear(sourceMovie.release_date);
    if (!sourceYear) return;

    if (ContentAnalyzer.isFamilyContent(sourceContext)) {
      this.applyFamilyTemporalConstraints(filters, sourceYear);
    } else {
      this.applyGeneralTemporalConstraints(filters, sourceYear, userProfile);
    }
  }

  private static applyFamilyTemporalConstraints(
    filters: RecommendationFilters,
    sourceYear: number
  ): void {
    if (sourceYear >= 2010) {
      filters['primary_release_date.gte'] = '2005-01-01';
    } else if (sourceYear >= 2000) {
      filters['primary_release_date.gte'] = '1995-01-01';
    }
  }

  private static applyGeneralTemporalConstraints(
    filters: RecommendationFilters,
    sourceYear: number,
    userProfile: UserProfile
  ): void {
    const hasModernPreference = userProfile.preferredDecades.some((decade) =>
      ['2020s', '2010s', '2000s'].includes(decade)
    );

    if (hasModernPreference && sourceYear >= 2000) {
      filters['primary_release_date.gte'] = '2000-01-01';
    }
  }

  private static applyContentAppropriatenessFilters(
    filters: RecommendationFilters,
    sourceContext: ContentContext
  ): void {
    if (ContentAnalyzer.isFamilyContent(sourceContext)) {
      const matureGenres = [27, 53, 80]; // Horror, Thriller, Crime
      filters.without_genres = matureGenres.join(',');
    }
  }

  private static applyRecentMoviePreference(
    filters: RecommendationFilters,
    userProfile: UserProfile
  ): void {
    const hasRecentPreference =
      userProfile.preferredDecades.includes('2020s') ||
      userProfile.preferredDecades.includes('2010s');

    if (hasRecentPreference) {
      filters['primary_release_date.gte'] = '2005-01-01';
    }
  }
}
