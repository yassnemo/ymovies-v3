import { type Movie } from '#lib/types/movie.ts';
import {
  type UserProfile,
  type ContentContext,
  type ScoreComponents
} from './types';
import {
  ContentAnalyzer,
  TemporalCalculator,
  GenreAnalyzer
} from './content-helpers';
/**
 * Class responsible for calculating relevance scores between movies
 */
export class RelevanceScorer {
  /**
   * Calculate relevance score based on movie similarity to source and user preferences
   */
  static calculateRelevanceScore(
    movie: Movie,
    sourceMovie: Movie,
    userProfile: UserProfile
  ): number {
    const sourceContext = ContentAnalyzer.analyzeContent(sourceMovie);
    const movieContext = ContentAnalyzer.analyzeContent(movie);
    const components: ScoreComponents = {
      genreScore: this.calculateGenreScore(
        movie,
        sourceMovie,
        sourceContext,
        movieContext
      ),
      qualityScore: this.calculateQualityScore(movie),
      temporalScore: this.calculateTemporalScore(
        movie,
        sourceMovie,
        userProfile
      ),
      languageScore: this.calculateLanguageScore(movie, userProfile),
      popularityScore: this.calculatePopularityScore(movie)
    };
    return this.combineScoreComponents(components);
  }
  private static calculateGenreScore(
    movie: Movie,
    sourceMovie: Movie,
    sourceContext: ContentContext,
    movieContext: ContentContext
  ): number {
    if (!movie.genre_ids || !sourceMovie.genre_ids) return 0;
    const commonGenres = movie.genre_ids.filter((id) =>
      sourceContext.contentGenres.has(id)
    );
    let genreScore =
      commonGenres.length /
      Math.max(sourceMovie.genre_ids.length, movie.genre_ids.length);
    // Apply content-specific bonuses and penalties
    genreScore += this.applyContentSpecificAdjustments(
      sourceContext,
      movieContext
    );
    genreScore += this.applyImportantGenreBonus(commonGenres);
    return genreScore * 0.5;
  }
  private static applyContentSpecificAdjustments(
    sourceContext: ContentContext,
    movieContext: ContentContext
  ): number {
    if (ContentAnalyzer.isFamilyContent(sourceContext)) {
      if (ContentAnalyzer.isFamilyContent(movieContext)) {
        return 0.4; // Massive boost for family-to-family matching
      } else if (movieContext.isMature) {
        return -0.6; // Heavy penalty for inappropriate content
      }
    }
    return 0;
  }
  private static applyImportantGenreBonus(commonGenres: number[]): number {
    const importantGenres = [16, 10751, 35, 18, 28, 53, 27, 878, 14];
    const exactMatches = commonGenres.filter((id) =>
      importantGenres.includes(id)
    );
    return exactMatches.length * 0.1;
  }
  private static calculateQualityScore(movie: Movie): number {
    if (!movie.vote_average || !movie.vote_count || movie.vote_count <= 100)
      return 0;
    return Math.min(0.2, (movie.vote_average / 10) * 0.2);
  }
  private static calculateTemporalScore(
    movie: Movie,
    sourceMovie: Movie,
    userProfile: UserProfile
  ): number {
    if (!movie.release_date || !sourceMovie.release_date) return 0;
    const movieYear = TemporalCalculator.extractYear(movie.release_date);
    const sourceYear = TemporalCalculator.extractYear(sourceMovie.release_date);
    if (!movieYear || !sourceYear) return 0;
    const sourceContext = ContentAnalyzer.analyzeContent(sourceMovie);
    if (ContentAnalyzer.isFamilyContent(sourceContext)) {
      return this.calculateFamilyTemporalScore(movieYear, sourceYear);
    } else {
      return this.calculateGeneralTemporalScore(
        movieYear,
        sourceYear,
        userProfile
      );
    }
  }
  private static calculateFamilyTemporalScore(
    movieYear: number,
    sourceYear: number
  ): number {
    const yearDiff = Math.abs(movieYear - sourceYear);
    if (yearDiff <= 5) return 0.15;
    if (yearDiff <= 10) return 0.1;
    if (yearDiff > 15) return -0.1;
    return 0;
  }
  private static calculateGeneralTemporalScore(
    movieYear: number,
    sourceYear: number,
    userProfile: UserProfile
  ): number {
    const yearDiff = Math.abs(movieYear - sourceYear);
    let eraScore = Math.max(0, ((25 - yearDiff) / 25) * 0.15);
    const movieDecade = TemporalCalculator.getDecade(movieYear);
    if (userProfile.preferredDecades.includes(movieDecade)) {
      eraScore += 0.08;
    }
    return eraScore;
  }
  private static calculateLanguageScore(
    movie: Movie,
    userProfile: UserProfile
  ): number {
    if (
      !movie.original_language ||
      !userProfile.preferredLanguages.includes(movie.original_language)
    ) {
      return 0;
    }
    return 0.08;
  }
  private static calculatePopularityScore(movie: Movie): number {
    if (!movie.popularity || movie.popularity <= 50) return 0;
    return Math.min(0.03, Math.log(movie.popularity) / 200);
  }
  private static combineScoreComponents(components: ScoreComponents): number {
    const totalScore =
      components.genreScore +
      components.qualityScore +
      components.temporalScore +
      components.languageScore +
      components.popularityScore;
    return Math.max(0, Math.min(1.0, totalScore));
  }
  /**
   * Calculate enhanced relevance score prioritizing sequels/franchises over genre
   */
  static calculateEnhancedRelevanceScore(
    movie: Movie,
    sourceMovie: Movie,
    userProfile: UserProfile
  ): number {
    let score = 0;
    // Franchise/title similarity (highest weight)
    const titleSimilarity = GenreAnalyzer.calculateTitleSimilarity(
      sourceMovie.title.toLowerCase(),
      movie.title.toLowerCase()
    );
    score += titleSimilarity * 0.4;
    // Language match
    if (movie.original_language === sourceMovie.original_language) {
      score += 0.25;
    }
    // Temporal relevance
    const temporalScore = TemporalCalculator.calculateTemporalRelevance(
      movie,
      sourceMovie
    );
    score += temporalScore * 0.2;
    // Genre similarity (lower priority than before)
    const genreSimilarity = GenreAnalyzer.calculateGenreSimilarity(
      movie,
      sourceMovie
    );
    score += genreSimilarity * 0.15;
    return Math.min(score, 1.0);
  }
  /**
   * Calculate director/cast relevance with temporal constraints
   */
  static calculateDirectorCastRelevance(
    movie: Movie,
    sourceMovie: Movie,
    type: 'director' | 'cast',
    userProfile: UserProfile
  ): number {
    let score = type === 'director' ? 0.5 : 0.4;
    // Temporal bonus
    score +=
      TemporalCalculator.calculateTemporalRelevance(movie, sourceMovie) * 0.3;
    // Genre similarity
    score += GenreAnalyzer.calculateGenreSimilarity(movie, sourceMovie) * 0.2;
    return score;
  }
  /**
   * Calculate language and era relevance
   */
  static calculateLanguageAndEraRelevance(
    movie: Movie,
    sourceMovie: Movie,
    userProfile: UserProfile
  ): number {
    let score = 0;
    // Language match
    if (movie.original_language === sourceMovie.original_language) {
      score += 0.4;
    }
    // Temporal relevance
    score +=
      TemporalCalculator.calculateTemporalRelevance(movie, sourceMovie) * 0.3;
    // Genre overlap
    score += GenreAnalyzer.calculateGenreSimilarity(movie, sourceMovie) * 0.3;
    return score;
  }
}
