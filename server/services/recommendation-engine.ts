import { db } from '../db';
import { TMDBService } from './tmdb';
import { storage } from '../storage';
import { type UserPreferences, type WatchHistory } from '#shared/schema.ts';
import { type Movie } from '#lib/types/movie.ts';
import { sql } from 'drizzle-orm';

// Import our new modular components
import {
  type RecommendationQuery,
  type UserProfile,
  type MovieCandidate,
  type PersonalizedCategory,
  type RecommendationFilters
} from './recommendation/types';
import {
  ContentAnalyzer,
  TemporalCalculator,
  GenreAnalyzer
} from './recommendation/content-helpers';
import { FilterBuilder } from './recommendation/filter-builder';
import { RelevanceScorer } from './recommendation/relevance-scorer';
import { PreferenceFilter } from './recommendation/preference-filter';
import { RecommendationBlender } from './recommendation/recommendation-blender';
import { UserPreferenceAnalyzer } from './recommendation/user-analyzer';
import { CategoryGenerator } from './recommendation/category-generator';
import { MovieMatcher } from './recommendation/movie-matcher';

type UserMovieRating = {
  userId: string;
  movieId: number;
  rating: number; // Implicit rating based on watch progress or explicit rating
};

type MovieSimilarity = {
  movieId: number;
  similarityScore: number;
};

export class RecommendationEngine {
  private tmdbService: TMDBService;
  private userAnalyzer: UserPreferenceAnalyzer;
  private categoryGenerator: CategoryGenerator;
  private movieMatcher: MovieMatcher;

  constructor(tmdbApiKey: string) {
    this.tmdbService = new TMDBService(tmdbApiKey);
    this.userAnalyzer = new UserPreferenceAnalyzer(this.tmdbService);
    this.categoryGenerator = new CategoryGenerator(this.tmdbService);
    this.movieMatcher = new MovieMatcher(this.tmdbService);
  }

  /**
   * Get recommendations for a user based on collaborative filtering
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<Movie[]> {
    try {
      const query: RecommendationQuery = {
        userId,
        limit,
        excludeWatched: true,
        excludeWatchlist: true
      };

      return await this.generateRecommendations(query);
    } catch (error) {
      console.error('Error generating personalized recommendations:', error);
      // Fallback to trending movies
      return this.tmdbService.getTrending();
    }
  }

  /**
   * Get Netflix-style personalized recommendation categories
   */
  async getPersonalizedCategories(
    userId: string
  ): Promise<PersonalizedCategory[]> {
    return await this.categoryGenerator.getPersonalizedCategories(userId);
  }

  /**
   * Get enhanced "Because You Watched" recommendations with sophisticated matching
   */
  async getEnhancedBecauseYouWatched(
    userId: string,
    sourceMovieId: number,
    limit: number = 15
  ): Promise<Movie[]> {
    try {
      const sourceMovie = await this.tmdbService.getMovieDetails(sourceMovieId);
      if (!sourceMovie) {
        console.error(`Source movie ${sourceMovieId} not found`);
        return [];
      }

      const userProfile =
        await this.userAnalyzer.analyzeUserPreferences(userId);
      const watchHistory = await storage.getWatchHistory(userId);
      const watchedMovieIds = new Set(watchHistory.map((item) => item.movieId));

      const allCandidates: MovieCandidate[] = [];

      // Find different types of similar movies
      await this.movieMatcher.findFranchiseMovies(
        sourceMovie,
        allCandidates,
        userProfile
      );
      await this.movieMatcher.findSameTitleMovies(
        sourceMovie,
        allCandidates,
        userProfile
      );
      await this.findSimilarByGenre(sourceMovie, allCandidates, userProfile);
      await this.movieMatcher.findDirectorAndCastMatches(
        sourceMovie,
        allCandidates,
        userProfile
      );
      await this.movieMatcher.findLanguageAndEraMatches(
        sourceMovie,
        allCandidates,
        userProfile
      );
      // Add TMDB native similar + recommendations as candidates (fast, high recall like Google panel)
      const [tmdbSimilar, tmdbRecs] = await Promise.all([
        this.tmdbService.getSimilarMovies(sourceMovieId),
        this.tmdbService.getMovieRecommendations(sourceMovieId)
      ]);
      const blendedNative = [...(tmdbSimilar || []), ...(tmdbRecs || [])];
      for (const m of blendedNative) {
        if (!m || m.id === sourceMovie.id) continue;
        const relevanceScore =
          RelevanceScorer.calculateRelevanceScore(
            m as any,
            sourceMovie,
            userProfile
          ) + 0.1; // small boost
        allCandidates.push({
          movie: m as any,
          relevanceScore,
          source: 'tmdb_native'
        });
      }

      return this.processCandidates(
        allCandidates,
        sourceMovie,
        userProfile,
        watchedMovieIds,
        limit
      );
    } catch (error) {
      console.error(
        'Error getting enhanced because you watched recommendations:',
        error
      );
      return [];
    }
  }

  /**
   * Main recommendation generation logic
   */
  private async generateRecommendations(
    query: RecommendationQuery
  ): Promise<Movie[]> {
    const userPreferences = await storage.getUserPreferences(query.userId);
    const watchHistory = await storage.getWatchHistory(query.userId);
    const watchlist = await storage.getWatchlistItems(query.userId);

    const exclusionSets = this.createExclusionSets(
      watchHistory,
      watchlist,
      query
    );

    if (userPreferences && this.hasValidPreferences(userPreferences)) {
      const contentBasedRecs = await this.generateContentBasedRecommendations(
        userPreferences,
        exclusionSets,
        query.limit
      );

      if (watchHistory.length > 0) {
        const collaborativeRecs =
          await this.generateCollaborativeRecommendations(query, exclusionSets);
        return RecommendationBlender.blendRecommendations(
          contentBasedRecs,
          collaborativeRecs,
          query.limit
        );
      }

      return contentBasedRecs;
    }

    if (watchHistory.length > 0) {
      return await this.generateCollaborativeRecommendations(
        query,
        exclusionSets
      );
    }

    return await this.getFallbackRecommendations(exclusionSets, query.limit);
  }

  private createExclusionSets(
    watchHistory: WatchHistory[],
    watchlist: any[],
    query: RecommendationQuery
  ) {
    const watchedMovieIds = query.excludeWatched
      ? new Set(watchHistory.map((item) => item.movieId))
      : new Set();
    const watchlistMovieIds = query.excludeWatchlist
      ? new Set(watchlist.map((item) => item.movieId))
      : new Set();

    return { watchedMovieIds, watchlistMovieIds };
  }

  private hasValidPreferences(preferences: UserPreferences): boolean {
    return !!(preferences.likedGenres && preferences.likedGenres.length > 0);
  }

  private async generateContentBasedRecommendations(
    preferences: UserPreferences,
    exclusionSets: any,
    limit: number
  ): Promise<Movie[]> {
    const discoverParams = this.buildContentBasedFilters(preferences);
    const recommendedMovies =
      await this.tmdbService.discoverMovies(discoverParams);

    return this.applyExclusionFilters(recommendedMovies, exclusionSets, limit);
  }

  private async generateCollaborativeRecommendations(
    query: RecommendationQuery,
    exclusionSets: any
  ): Promise<Movie[]> {
    const watchHistory = await storage.getWatchHistory(query.userId);

    return await this.getCollaborativeFilteringRecommendations(
      query.userId,
      watchHistory,
      Array.from(exclusionSets.watchedMovieIds),
      Array.from(exclusionSets.watchlistMovieIds),
      query.limit
    );
  }

  private async getFallbackRecommendations(
    exclusionSets: any,
    limit: number
  ): Promise<Movie[]> {
    const popularMovies = await this.tmdbService.getPopular();
    return this.applyExclusionFilters(popularMovies, exclusionSets, limit);
  }

  private buildContentBasedFilters(
    preferences: UserPreferences
  ): Record<string, string> {
    const discoverParams: Record<string, string> = {};

    if (preferences.likedGenres && preferences.likedGenres.length > 0) {
      discoverParams.with_genres = preferences.likedGenres.join(',');
    }

    discoverParams.sort_by = 'popularity.desc';

    return discoverParams;
  }

  private applyExclusionFilters(
    movies: Movie[],
    exclusionSets: any,
    limit: number
  ): Movie[] {
    return movies
      .filter(
        (movie) =>
          !exclusionSets.watchedMovieIds.has(movie.id) &&
          !exclusionSets.watchlistMovieIds.has(movie.id)
      )
      .slice(0, limit);
  }

  /**
   * Get recommendations using collaborative filtering approach
   */
  private async getCollaborativeFilteringRecommendations(
    userId: string,
    userWatchHistory: WatchHistory[],
    watchedMovieIds: number[],
    watchlistMovieIds: number[],
    limit: number
  ): Promise<Movie[]> {
    // Convert user's watch history to ratings
    const userRatings: UserMovieRating[] = userWatchHistory.map((history) => ({
      userId,
      movieId: history.movieId,
      rating: UserPreferenceAnalyzer.calculateImplicitRating(history)
    }));

    // Find similar users
    const similarUsers = await this.findSimilarUsers(userId, userRatings);

    if (similarUsers.length === 0) {
      return this.getFallbackPopularMovies(
        watchedMovieIds,
        watchlistMovieIds,
        limit
      );
    }

    // Get recommendations from similar users
    const recommendations = await this.generateCollaborativeFromSimilarUsers(
      userId,
      similarUsers,
      watchedMovieIds,
      watchlistMovieIds,
      limit
    );

    return recommendations;
  }

  private async findSimilarByGenre(
    sourceMovie: Movie,
    candidates: MovieCandidate[],
    userProfile: UserProfile
  ): Promise<void> {
    try {
      const genreFilters = FilterBuilder.buildGenreFilters(
        sourceMovie,
        userProfile
      );
      const cleanFilters = this.cleanFilters(genreFilters);
      const genreMovies = await this.tmdbService.discoverMovies(cleanFilters);

      const temporallyRelevantGenre = PreferenceFilter.filterTemporallyRelevant(
        genreMovies,
        sourceMovie
      );
      const filteredGenre = PreferenceFilter.filterByUserPreferences(
        temporallyRelevantGenre,
        sourceMovie,
        userProfile
      );

      for (const movie of filteredGenre.slice(0, 20)) {
        if (movie.id === sourceMovie.id) continue;

        const relevanceScore = RelevanceScorer.calculateRelevanceScore(
          movie,
          sourceMovie,
          userProfile
        );

        if (relevanceScore >= 0.2) {
          candidates.push({
            movie,
            relevanceScore,
            source: 'genre_similar'
          });
        }
      }
    } catch (error) {
      console.error('Error finding genre similar movies:', error);
    }
  }

  private processCandidates(
    allCandidates: MovieCandidate[],
    sourceMovie: Movie,
    userProfile: UserProfile,
    watchedMovieIds: Set<number>,
    limit: number
  ): Movie[] {
    // Remove duplicates and watched movies
    let uniqueCandidates = this.removeDuplicateCandidates(
      allCandidates,
      watchedMovieIds
    );

    // Filter out low-quality and low-popularity items (improves perceived accuracy)
    uniqueCandidates = uniqueCandidates.filter((c) => {
      const m: any = c.movie as any;
      const votes = typeof m.vote_count === 'number' ? m.vote_count : 0;
      const avg = typeof m.vote_average === 'number' ? m.vote_average : 0;
      // Keep looser floor for franchise/same_title, stricter otherwise
      if (c.source === 'franchise' || c.source === 'same_title') return true;
      return votes >= 300 && avg >= 6.3;
    });

    // Sort by a weighted score: relevance first, then rating and popularity as tie-breakers
    uniqueCandidates.sort((a, b) => {
      const rel = b.relevanceScore - a.relevanceScore;
      if (Math.abs(rel) > 1e-6) return rel;
      const ba = (b.movie as any).vote_average ?? 0;
      const aa = (a.movie as any).vote_average ?? 0;
      if (ba !== aa) return ba - aa;
      const bp = (b.movie as any).popularity ?? 0;
      const ap = (a.movie as any).popularity ?? 0;
      return bp - ap;
    });

    return uniqueCandidates.slice(0, limit).map((candidate) => candidate.movie);
  }

  // Enhanced TV recommendations ("More Like This")
  async getEnhancedSimilarTV(tvId: number, limit: number = 15): Promise<any[]> {
    try {
      const [similar, recs, source] = await Promise.all([
        this.tmdbService.getSimilarTV(tvId),
        this.tmdbService.getTVRecommendations(tvId),
        this.tmdbService.getTVDetails(tvId)
      ]);
      const combined = [...(similar || []), ...(recs || [])];
      // Basic scoring: genre overlap + rating + popularity
      const genreIds: number[] = Array.isArray(source?.genres)
        ? source.genres.map((g: any) => g.id)
        : source?.genre_ids || [];
      const scored = combined.map((show: any) => {
        const sGenres: number[] = Array.isArray(show?.genres)
          ? show.genres.map((g: any) => g.id)
          : show?.genre_ids || [];
        const overlap =
          genreIds.length && sGenres.length
            ? sGenres.filter((g: number) => genreIds.includes(g)).length
            : 0;
        const score =
          overlap * 0.5 +
          (show.vote_average || 0) * 0.35 +
          (show.popularity || 0) * 0.15;
        return { show, score };
      });
      const filtered = scored
        .filter(
          (s) =>
            (s.show.vote_average || 0) >= 6.0 && (s.show.vote_count || 0) >= 150
        )
        .sort((a, b) => b.score - a.score)
        .map((s) => s.show);
      const seen = new Set<number>();
      const unique: any[] = [];
      for (const item of filtered) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        unique.push(item);
        if (unique.length >= limit) break;
      }
      return unique;
    } catch (e) {
      console.error('Enhanced TV recommendations failed:', e);
      return [];
    }
  }

  private removeDuplicateCandidates(
    candidates: MovieCandidate[],
    watchedMovieIds: Set<number>
  ): MovieCandidate[] {
    const seenIds = new Set<number>();
    const uniqueCandidates: MovieCandidate[] = [];

    for (const candidate of candidates) {
      if (
        !seenIds.has(candidate.movie.id) &&
        !watchedMovieIds.has(candidate.movie.id)
      ) {
        seenIds.add(candidate.movie.id);
        uniqueCandidates.push(candidate);
      }
    }

    return uniqueCandidates;
  }

  /**
   * Enhanced blending of multiple recommendation sources
   */
  private blendRecommendations(
    contentBasedRecs: Movie[],
    collaborativeRecs: Movie[],
    limit: number
  ): Movie[] {
    return RecommendationBlender.blendRecommendations(
      contentBasedRecs,
      collaborativeRecs,
      limit
    );
  }

  /**
   * Find users with similar tastes using enhanced similarity algorithms
   */
  private async findSimilarUsers(
    userId: string,
    userRatings: UserMovieRating[]
  ): Promise<{ userId: string; similarity: number }[]> {
    const otherUserIds = await this.getOtherUserIds(userId);
    const similarities: { userId: string; similarity: number }[] = [];

    for (const otherId of otherUserIds) {
      const similarity = await this.calculateUserSimilarity(
        userRatings,
        otherId
      );
      if (similarity > 0.3) {
        // Threshold for similarity
        similarities.push({ userId: otherId, similarity });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10); // Top 10 similar users
  }

  private async getOtherUserIds(userId: string): Promise<string[]> {
    const watchHistories = await db.execute(sql`
      SELECT DISTINCT user_id
      FROM watch_history
      WHERE user_id != ${userId}
    `);

    return watchHistories.rows.map((row: any) => row.user_id as string);
  }

  private async calculateUserSimilarity(
    userRatings: UserMovieRating[],
    otherId: string
  ): Promise<number> {
    const otherUserHistory = await storage.getWatchHistory(otherId);

    if (otherUserHistory.length < 3) return 0; // Skip users with insufficient history

    const otherRatings: UserMovieRating[] = otherUserHistory.map((history) => ({
      userId: otherId,
      movieId: history.movieId,
      rating: UserPreferenceAnalyzer.calculateImplicitRating(history)
    }));

    return this.calculatePearsonCorrelation(userRatings, otherRatings);
  }

  private async generateCollaborativeFromSimilarUsers(
    userId: string,
    similarUsers: { userId: string; similarity: number }[],
    watchedMovieIds: number[],
    watchlistMovieIds: number[],
    limit: number
  ): Promise<Movie[]> {
    const movieScores: Map<number, number> = new Map();

    for (const simUser of similarUsers) {
      const otherUserHistory = await storage.getWatchHistory(simUser.userId);

      for (const historyItem of otherUserHistory) {
        if (watchedMovieIds.includes(historyItem.movieId)) continue;

        const score =
          simUser.similarity *
          UserPreferenceAnalyzer.calculateImplicitRating(historyItem);
        const currentScore = movieScores.get(historyItem.movieId) || 0;
        movieScores.set(historyItem.movieId, currentScore + score);
      }
    }

    return await this.convertScoresToMovies(
      movieScores,
      watchedMovieIds,
      watchlistMovieIds,
      limit
    );
  }

  private async convertScoresToMovies(
    movieScores: Map<number, number>,
    watchedMovieIds: number[],
    watchlistMovieIds: number[],
    limit: number
  ): Promise<Movie[]> {
    const topMovieIds = Array.from(movieScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit * 2)
      .map((entry) => entry[0])
      .filter(
        (id) => !watchedMovieIds.includes(id) && !watchlistMovieIds.includes(id)
      );

    const moviePromises = topMovieIds.slice(0, limit).map(async (movieId) => {
      try {
        // Summary is lighter and cached; sufficient for list rendering
        return await this.tmdbService.getMovieSummary(movieId);
      } catch (error) {
        console.error(`Failed to get movie details for ${movieId}:`, error);
        return null;
      }
    });

    const movies = await Promise.all(moviePromises);
    return movies.filter(Boolean) as Movie[];
  }

  private async getFallbackPopularMovies(
    watchedMovieIds: number[],
    watchlistMovieIds: number[],
    limit: number
  ): Promise<Movie[]> {
    const popularMovies = await this.tmdbService.getPopular();

    const filteredMovies = popularMovies.filter(
      (movie) =>
        !watchedMovieIds.includes(movie.id) &&
        !watchlistMovieIds.includes(movie.id)
    );

    return filteredMovies.slice(0, limit);
  }

  /**
   * Calculate Pearson correlation coefficient between two users
   */
  private calculatePearsonCorrelation(
    user1Ratings: UserMovieRating[],
    user2Ratings: UserMovieRating[]
  ): number {
    // Find common movies
    const user1Map = new Map(user1Ratings.map((r) => [r.movieId, r.rating]));
    const user2Map = new Map(user2Ratings.map((r) => [r.movieId, r.rating]));

    const commonMovies = user1Ratings
      .map((r) => r.movieId)
      .filter((movieId) => user2Map.has(movieId));

    if (commonMovies.length < 2) return 0; // Need at least 2 common movies

    return this.computePearsonCorrelation(commonMovies, user1Map, user2Map);
  }

  private computePearsonCorrelation(
    commonMovies: number[],
    user1Map: Map<number, number>,
    user2Map: Map<number, number>
  ): number {
    const n = commonMovies.length;

    // Calculate means
    const sum1 = commonMovies.reduce((sum, id) => sum + user1Map.get(id)!, 0);
    const sum2 = commonMovies.reduce((sum, id) => sum + user2Map.get(id)!, 0);
    const mean1 = sum1 / n;
    const mean2 = sum2 / n;

    // Calculate correlation components
    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;

    for (const movieId of commonMovies) {
      const rating1 = user1Map.get(movieId)!;
      const rating2 = user2Map.get(movieId)!;
      const diff1 = rating1 - mean1;
      const diff2 = rating2 - mean2;

      numerator += diff1 * diff2;
      denominator1 += diff1 * diff1;
      denominator2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(denominator1 * denominator2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate cosine similarity between users
   */
  private calculateCosineSimilarity(
    user1Ratings: UserMovieRating[],
    user2Ratings: UserMovieRating[]
  ): number {
    const user1Map = new Map(user1Ratings.map((r) => [r.movieId, r.rating]));
    const user2Map = new Map(user2Ratings.map((r) => [r.movieId, r.rating]));

    const commonMovies = user1Ratings
      .map((r) => r.movieId)
      .filter((movieId) => user2Map.has(movieId));

    if (commonMovies.length === 0) return 0;

    return this.computeCosineSimilarity(commonMovies, user1Map, user2Map);
  }

  private computeCosineSimilarity(
    commonMovies: number[],
    user1Map: Map<number, number>,
    user2Map: Map<number, number>
  ): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const movieId of commonMovies) {
      const rating1 = user1Map.get(movieId)!;
      const rating2 = user2Map.get(movieId)!;

      dotProduct += rating1 * rating2;
      norm1 += rating1 * rating1;
      norm2 += rating2 * rating2;
    }

    const denominator = Math.sqrt(norm1 * norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // Legacy method support (delegated to helper classes)

  /**
   * Calculate implicit rating - delegated to UserPreferenceAnalyzer
   */
  private calculateImplicitRating(history: WatchHistory): number {
    return UserPreferenceAnalyzer.calculateImplicitRating(history);
  }

  /**
   * Filter by user preferences - delegated to PreferenceFilter
   */
  private filterByUserPreferences(
    movies: Movie[],
    sourceMovie: Movie,
    userProfile: UserProfile
  ): Movie[] {
    return PreferenceFilter.filterByUserPreferences(
      movies,
      sourceMovie,
      userProfile
    );
  }

  /**
   * Calculate relevance score - delegated to RelevanceScorer
   */
  private calculateRelevanceScore(
    movie: Movie,
    sourceMovie: Movie,
    userProfile: UserProfile
  ): number {
    return RelevanceScorer.calculateRelevanceScore(
      movie,
      sourceMovie,
      userProfile
    );
  }

  /**
   * Analyze user preferences - delegated to UserPreferenceAnalyzer
   */
  private async analyzeUserPreferences(userId: string): Promise<UserProfile> {
    return await this.userAnalyzer.analyzeUserPreferences(userId);
  }

  /**
   * Build genre filters - delegated to FilterBuilder
   */
  private buildGenreFilters(sourceMovie: Movie, userProfile: UserProfile): any {
    return FilterBuilder.buildGenreFilters(sourceMovie, userProfile);
  }

  /**
   * Filter temporally relevant movies - delegated to PreferenceFilter
   */
  private filterTemporallyRelevant(
    movies: Movie[],
    sourceMovie: Movie
  ): Movie[] {
    return PreferenceFilter.filterTemporallyRelevant(movies, sourceMovie);
  }

  /**
   * Helper method to get genre name from ID - delegated to GenreAnalyzer
   */
  private getGenreName(genreId: number): string {
    return GenreAnalyzer.getGenreName(genreId);
  }

  /**
   * Calculate enhanced relevance score - delegated to RelevanceScorer
   */
  private calculateEnhancedRelevanceScore(
    movie: Movie,
    sourceMovie: Movie,
    userProfile: UserProfile
  ): number {
    return RelevanceScorer.calculateEnhancedRelevanceScore(
      movie,
      sourceMovie,
      userProfile
    );
  }

  /**
   * Calculate title similarity - delegated to GenreAnalyzer
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    return GenreAnalyzer.calculateTitleSimilarity(title1, title2);
  }

  /**
   * Get temporal range - delegated to TemporalCalculator
   */
  private getTemporalRange(sourceYear: number): { min: number; max: number } {
    return TemporalCalculator.getTemporalRange(sourceYear);
  }

  /**
   * Calculate temporal relevance - delegated to TemporalCalculator
   */
  private calculateTemporalRelevance(movie: Movie, sourceMovie: Movie): number {
    return TemporalCalculator.calculateTemporalRelevance(movie, sourceMovie);
  }

  /**
   * Calculate genre similarity - delegated to GenreAnalyzer
   */
  private calculateGenreSimilarity(movie: Movie, sourceMovie: Movie): number {
    return GenreAnalyzer.calculateGenreSimilarity(movie, sourceMovie);
  }

  /**
   * Calculate language and era relevance - delegated to RelevanceScorer
   */
  private calculateLanguageAndEraRelevance(
    movie: Movie,
    sourceMovie: Movie,
    userProfile: UserProfile
  ): number {
    return RelevanceScorer.calculateLanguageAndEraRelevance(
      movie,
      sourceMovie,
      userProfile
    );
  }

  /**
   * Calculate director/cast relevance - delegated to RelevanceScorer
   */
  private calculateDirectorCastRelevance(
    movie: Movie,
    sourceMovie: Movie,
    type: 'director' | 'cast',
    userProfile: UserProfile
  ): number {
    return RelevanceScorer.calculateDirectorCastRelevance(
      movie,
      sourceMovie,
      type,
      userProfile
    );
  }

  /**
   * Build temporal genre filters - delegated to FilterBuilder
   */
  private buildTemporalGenreFilters(
    sourceMovie: Movie,
    userProfile: UserProfile
  ): any {
    return FilterBuilder.buildTemporalGenreFilters(sourceMovie, userProfile);
  }

  /**
   * Find director and cast matches - delegated to MovieMatcher
   */
  private async findDirectorAndCastMatches(
    sourceMovie: Movie,
    candidates: MovieCandidate[],
    userProfile: UserProfile
  ): Promise<void> {
    return await this.movieMatcher.findDirectorAndCastMatches(
      sourceMovie,
      candidates,
      userProfile
    );
  }

  /**
   * Find same title movies - delegated to MovieMatcher
   */
  private async findSameTitleMovies(
    sourceMovie: Movie,
    candidates: MovieCandidate[],
    userProfile: UserProfile
  ): Promise<void> {
    return await this.movieMatcher.findSameTitleMovies(
      sourceMovie,
      candidates,
      userProfile
    );
  }

  /**
   * Helper method to convert RecommendationFilters to Record<string, string>
   * by filtering out undefined values
   */
  private cleanFilters(filters: RecommendationFilters): Record<string, string> {
    const cleanedFilters: Record<string, string> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        cleanedFilters[key] = String(value);
      }
    }
    return cleanedFilters;
  }
}
