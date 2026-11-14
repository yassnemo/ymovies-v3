import { type Movie } from '#lib/types/movie.ts';
import { TMDBService } from '../tmdb';
import { type MovieCandidate, type UserProfile } from './types';
import { RelevanceScorer } from './relevance-scorer';
import { TemporalCalculator } from './content-helpers';

/**
 * Class responsible for finding movie matches based on different criteria
 */
export class MovieMatcher {
  constructor(private tmdbService: TMDBService) {}

  /**
   * Find franchise movies (sequels, prequels, same series)
   */
  async findFranchiseMovies(
    sourceMovie: Movie,
    candidates: MovieCandidate[],
    userProfile: UserProfile
  ): Promise<void> {
    try {
      const franchiseMovies = await this.tmdbService.searchMovies(
        sourceMovie.title
      );

      for (const movie of franchiseMovies.slice(0, 10)) {
        if (movie.id === sourceMovie.id) continue;

        const relevanceScore = RelevanceScorer.calculateEnhancedRelevanceScore(
          movie,
          sourceMovie,
          userProfile
        );

        if (relevanceScore >= 0.4) {
          candidates.push({
            movie,
            relevanceScore,
            source: 'franchise'
          });
        }
      }
    } catch (error) {
      console.error('Error finding franchise movies:', error);
    }
  }

  /**
   * Find movies with same title (different versions, remakes)
   */
  async findSameTitleMovies(
    sourceMovie: Movie,
    candidates: MovieCandidate[],
    userProfile: UserProfile
  ): Promise<void> {
    try {
      const sameTitleMovies = await this.tmdbService.searchMovies(
        sourceMovie.title
      );

      for (const movie of sameTitleMovies.slice(0, 5)) {
        if (this.shouldIncludeSameTitleMovie(movie, sourceMovie)) {
          const relevanceScore =
            RelevanceScorer.calculateEnhancedRelevanceScore(
              movie,
              sourceMovie,
              userProfile
            );

          candidates.push({
            movie,
            relevanceScore: relevanceScore + 0.3, // Bonus for same title
            source: 'same_title'
          });
        }
      }
    } catch (error) {
      console.error('Error finding same title movies:', error);
    }
  }

  /**
   * Find movies with same director or main cast members
   */
  async findDirectorAndCastMatches(
    sourceMovie: Movie,
    candidates: MovieCandidate[],
    userProfile: UserProfile
  ): Promise<void> {
    try {
      const movieDetails = await this.tmdbService.getMovieDetails(
        sourceMovie.id
      );

      if (!movieDetails.credits) return;

      const sourceYear = TemporalCalculator.extractYear(
        sourceMovie.release_date
      );
      if (!sourceYear) return;

      await this.findDirectorMatches(
        movieDetails,
        sourceMovie,
        sourceYear,
        candidates,
        userProfile
      );
      await this.findCastMatches(
        movieDetails,
        sourceMovie,
        sourceYear,
        candidates,
        userProfile
      );
    } catch (error) {
      console.error('Error finding director and cast matches:', error);
    }
  }

  /**
   * Find movies with similar language and era
   */
  async findLanguageAndEraMatches(
    sourceMovie: Movie,
    candidates: MovieCandidate[],
    userProfile: UserProfile
  ): Promise<void> {
    try {
      if (!sourceMovie.original_language || !sourceMovie.release_date) return;

      const sourceYear = TemporalCalculator.extractYear(
        sourceMovie.release_date
      );
      if (!sourceYear) return;

      const range = TemporalCalculator.getTemporalRange(sourceYear);

      const languageEraMovies = await this.tmdbService.discoverMovies({
        with_original_language: sourceMovie.original_language,
        'primary_release_date.gte': `${range.min}-01-01`,
        'primary_release_date.lte': `${range.max}-12-31`,
        'vote_count.gte': '50',
        sort_by: 'vote_average.desc'
      });

      for (const movie of languageEraMovies.slice(0, 15)) {
        if (movie.id === sourceMovie.id) continue;

        const relevanceScore = RelevanceScorer.calculateLanguageAndEraRelevance(
          movie,
          sourceMovie,
          userProfile
        );

        if (relevanceScore >= 0.25) {
          candidates.push({
            movie,
            relevanceScore,
            source: 'language_era'
          });
        }
      }
    } catch (error) {
      console.error('Error finding language and era matches:', error);
    }
  }

  private shouldIncludeSameTitleMovie(
    movie: Movie,
    sourceMovie: Movie
  ): boolean {
    return (
      movie.id !== sourceMovie.id &&
      movie.title.toLowerCase() === sourceMovie.title.toLowerCase()
    );
  }

  private async findDirectorMatches(
    movieDetails: any,
    sourceMovie: Movie,
    sourceYear: number,
    candidates: MovieCandidate[],
    userProfile: UserProfile
  ): Promise<void> {
    const directors =
      movieDetails.credits.crew?.filter(
        (person: any) => person.job === 'Director'
      ) || [];

    for (const director of directors.slice(0, 2)) {
      if (!director.id) continue;

      const directorMovies = await this.getDirectorMovies(
        director.id,
        sourceYear
      );

      for (const movie of directorMovies) {
        if (movie.id === sourceMovie.id) continue;

        const relevanceScore = RelevanceScorer.calculateDirectorCastRelevance(
          movie,
          sourceMovie,
          'director',
          userProfile
        );

        if (relevanceScore >= 0.35) {
          candidates.push({
            movie,
            relevanceScore,
            source: 'director_match'
          });
        }
      }
    }
  }

  private async findCastMatches(
    movieDetails: any,
    sourceMovie: Movie,
    sourceYear: number,
    candidates: MovieCandidate[],
    userProfile: UserProfile
  ): Promise<void> {
    const mainCast = movieDetails.credits.cast?.slice(0, 3) || [];

    for (const actor of mainCast) {
      if (!actor.id) continue;

      const actorMovies = await this.getActorMovies(actor.id, sourceYear);

      for (const movie of actorMovies) {
        if (movie.id === sourceMovie.id) continue;

        const relevanceScore = RelevanceScorer.calculateDirectorCastRelevance(
          movie,
          sourceMovie,
          'cast',
          userProfile
        );

        if (relevanceScore >= 0.3) {
          candidates.push({
            movie,
            relevanceScore,
            source: 'cast_match'
          });
        }
      }
    }
  }

  private async getDirectorMovies(
    directorId: number,
    sourceYear: number
  ): Promise<Movie[]> {
    return await this.tmdbService.discoverMovies({
      with_crew: directorId.toString(),
      'primary_release_date.gte': `${Math.max(1990, sourceYear - 15)}-01-01`,
      'primary_release_date.lte': `${sourceYear + 15}-12-31`,
      'vote_count.gte': '50'
    });
  }

  private async getActorMovies(
    actorId: number,
    sourceYear: number
  ): Promise<Movie[]> {
    return await this.tmdbService.discoverMovies({
      with_cast: actorId.toString(),
      'primary_release_date.gte': `${Math.max(1990, sourceYear - 10)}-01-01`,
      'primary_release_date.lte': `${sourceYear + 10}-12-31`,
      'vote_count.gte': '30'
    });
  }
}
