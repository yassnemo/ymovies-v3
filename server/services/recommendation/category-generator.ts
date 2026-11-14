import { storage } from '../../storage';
import { TMDBService } from '../tmdb';
import {
  type PersonalizedCategory,
  type RecommendationType,
  type UserProfile
} from './types';
import { GenreAnalyzer } from './content-helpers';
import { type Movie } from '#lib/types/movie.ts';

/**
 * Class responsible for generating personalized recommendation categories
 */
export class CategoryGenerator {
  constructor(private tmdbService: TMDBService) {}

  /**
   * Get Netflix-style personalized recommendation categories
   */
  async getPersonalizedCategories(
    userId: string
  ): Promise<PersonalizedCategory[]> {
    try {
      const userData = await this.gatherUserData(userId);
      const categories: PersonalizedCategory[] = [];

      await this.addContinueWatchingCategory(categories, userData);
      await this.addBecauseYouWatchedCategories(categories, userId, userData);
      await this.addPersonalizedRecommendations(categories, userId);
      await this.addTrendingCategory(categories, userData.excludeIds);
      await this.addGenreSpecificCategories(categories, userData);
      await this.addWatchAgainCategory(categories, userId, userData.excludeIds);
      await this.addSeasonalCategory(categories, userData.excludeIds);
      await this.addNewReleasesCategory(categories, userData.excludeIds);
      await this.addAwardWinnersCategory(categories, userData.excludeIds);
      await this.addHiddenGemsCategory(categories, userData.excludeIds);
      await this.addDirectorBasedCategories(categories, userData);
      await this.addTimeBasedCategory(categories, userData.excludeIds);
      await this.addPopularCategory(categories, userData.excludeIds);

      return categories;
    } catch (error) {
      console.error('Error generating personalized categories:', error);
      return this.getFallbackCategories();
    }
  }

  private async gatherUserData(userId: string) {
    const userPreferences = await storage.getUserPreferences(userId);
    const watchHistory = await storage.getWatchHistory(userId);
    const watchlist = await storage.getWatchlistItems(userId);

    const watchedMovieIds = new Set(watchHistory.map((item) => item.movieId));
    const watchlistMovieIds = new Set(watchlist.map((item) => item.movieId));
    const excludeIds = new Set([
      ...Array.from(watchedMovieIds),
      ...Array.from(watchlistMovieIds)
    ]);

    return {
      userPreferences,
      watchHistory,
      watchlist,
      watchedMovieIds,
      watchlistMovieIds,
      excludeIds
    };
  }

  private async addContinueWatchingCategory(
    categories: PersonalizedCategory[],
    userData: any
  ): Promise<void> {
    const continueWatching = userData.watchHistory
      .filter(
        (h: any) =>
          h.watchProgress && h.watchProgress > 0.1 && h.watchProgress < 0.9
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.watchedAt || 0).getTime() -
          new Date(a.watchedAt || 0).getTime()
      )
      .slice(0, 8);

    if (continueWatching.length === 0) return;

    const continueMovies = await this.getMovieDetails(
      continueWatching.map((h: any) => h.movieId)
    );

    if (continueMovies.length > 0) {
      categories.unshift({
        category: 'Continue Watching',
        movies: continueMovies,
        recommendationType: 'continue_watching'
      });
    }
  }

  private async addBecauseYouWatchedCategories(
    categories: PersonalizedCategory[],
    userId: string,
    userData: any
  ): Promise<void> {
    const recentHighEngagement = userData.watchHistory
      .filter((h: any) => h.watchProgress && h.watchProgress > 0.8)
      .sort(
        (a: any, b: any) =>
          new Date(b.watchedAt || 0).getTime() -
          new Date(a.watchedAt || 0).getTime()
      )
      .slice(0, 3);

    for (const history of recentHighEngagement) {
      try {
        const sourceMovie = await this.tmdbService.getMovieDetails(
          history.movieId
        );
        // Note: This would need to call the enhanced method from the main engine
        // For now, we'll keep a reference to it

        categories.push({
          category: `Because you watched ${sourceMovie.title}`,
          movies: [], // Will be populated by the main engine
          recommendationType: 'because_you_watched'
        });
      } catch (error) {
        console.error(
          `Error getting enhanced similar movies for ${history.movieId}:`,
          error
        );
      }
    }
  }

  private async addPersonalizedRecommendations(
    categories: PersonalizedCategory[],
    userId: string
  ): Promise<void> {
    // This will be handled by the main recommendation engine
    categories.push({
      category: 'Top Picks for You',
      movies: [], // Will be populated by the main engine
      recommendationType: 'personalized'
    });
  }

  private async addTrendingCategory(
    categories: PersonalizedCategory[],
    excludeIds: Set<number>
  ): Promise<void> {
    const trendingMovies = await this.tmdbService.getTrending();
    const personalizedTrending = trendingMovies
      .filter((movie) => !excludeIds.has(movie.id))
      .slice(0, 12);

    if (personalizedTrending.length > 0) {
      categories.push({
        category: 'Trending Now',
        movies: personalizedTrending,
        recommendationType: 'trending'
      });
    }
  }

  private async addGenreSpecificCategories(
    categories: PersonalizedCategory[],
    userData: any
  ): Promise<void> {
    if (!userData.userPreferences?.likedGenres?.length) return;

    const genresToShow = userData.userPreferences.likedGenres.slice(0, 3);

    for (const genreId of genresToShow) {
      try {
        const genreMovies = await this.tmdbService.discoverMovies({
          with_genres: genreId.toString(),
          sort_by: 'vote_average.desc',
          'vote_count.gte': '500'
        });

        const filteredGenreMovies = genreMovies
          .filter((movie) => !userData.excludeIds.has(movie.id))
          .slice(0, 12);

        if (filteredGenreMovies.length > 0) {
          const genreName = GenreAnalyzer.getGenreName(parseInt(genreId));
          categories.push({
            category: `Popular ${genreName}`,
            movies: filteredGenreMovies,
            recommendationType: 'genre_specific'
          });
        }
      } catch (error) {
        console.error(
          `Error getting genre recommendations for ${genreId}:`,
          error
        );
      }
    }
  }

  private async addWatchAgainCategory(
    categories: PersonalizedCategory[],
    userId: string,
    excludeIds: Set<number>
  ): Promise<void> {
    const topRatedMovies = await storage.getTopRatedMovies(userId, 10);
    const watchAgainMovies = await this.getMovieDetails(
      topRatedMovies.map((item) => item.movieId)
    );
    const watchAgain = watchAgainMovies
      .filter((movie) => movie && !excludeIds.has(movie.id))
      .slice(0, 8);

    if (watchAgain.length > 0) {
      categories.push({
        category: 'Watch Again',
        movies: watchAgain,
        recommendationType: 'watch_again'
      });
    }
  }

  private async addSeasonalCategory(
    categories: PersonalizedCategory[],
    excludeIds: Set<number>
  ): Promise<void> {
    const { seasonName, seasonalParams } = this.getSeasonalParameters();

    try {
      const seasonalMovies =
        await this.tmdbService.discoverMovies(seasonalParams);
      const seasonal = seasonalMovies
        .filter((movie) => !excludeIds.has(movie.id))
        .slice(0, 10);

      if (seasonal.length > 0) {
        categories.push({
          category: `${seasonName} Favorites`,
          movies: seasonal,
          recommendationType: 'seasonal'
        });
      }
    } catch (error) {
      console.error('Error getting seasonal recommendations:', error);
    }
  }

  private async addNewReleasesCategory(
    categories: PersonalizedCategory[],
    excludeIds: Set<number>
  ): Promise<void> {
    const newReleases = await this.tmdbService.discoverMovies({
      'primary_release_date.gte': new Date(
        Date.now() - 60 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0],
      sort_by: 'popularity.desc',
      'vote_count.gte': '50'
    });

    const filteredNewReleases = newReleases
      .filter((movie) => !excludeIds.has(movie.id))
      .slice(0, 12);

    if (filteredNewReleases.length > 0) {
      categories.push({
        category: 'New Releases',
        movies: filteredNewReleases,
        recommendationType: 'new_releases'
      });
    }
  }

  private async addAwardWinnersCategory(
    categories: PersonalizedCategory[],
    excludeIds: Set<number>
  ): Promise<void> {
    const awardWinners = await this.tmdbService.discoverMovies({
      'vote_average.gte': '8.0',
      'vote_count.gte': '1000',
      sort_by: 'vote_average.desc'
    });

    const filteredAwardWinners = awardWinners
      .filter((movie) => !excludeIds.has(movie.id))
      .slice(0, 12);

    if (filteredAwardWinners.length > 0) {
      categories.push({
        category: 'Award Winners & Critically Acclaimed',
        movies: filteredAwardWinners,
        recommendationType: 'award_winners'
      });
    }
  }

  private async addHiddenGemsCategory(
    categories: PersonalizedCategory[],
    excludeIds: Set<number>
  ): Promise<void> {
    const hiddenGems = await this.tmdbService.discoverMovies({
      'vote_average.gte': '7.0',
      'vote_count.gte': '100',
      'vote_count.lte': '1000',
      sort_by: 'vote_average.desc'
    });

    const filteredHiddenGems = hiddenGems
      .filter((movie) => !excludeIds.has(movie.id))
      .slice(0, 12);

    if (filteredHiddenGems.length > 0) {
      categories.push({
        category: 'Hidden Gems',
        movies: filteredHiddenGems,
        recommendationType: 'hidden_gems'
      });
    }
  }

  private async addDirectorBasedCategories(
    categories: PersonalizedCategory[],
    userData: any
  ): Promise<void> {
    if (userData.watchHistory.length === 0) return;

    const highRatedMovies = userData.watchHistory
      .filter((h: any) => h.watchProgress && h.watchProgress > 0.8)
      .slice(0, 2);

    for (const historyItem of highRatedMovies) {
      try {
        await this.addDirectorCategory(
          categories,
          historyItem,
          userData.excludeIds
        );
      } catch (error) {
        console.error(`Error getting director recommendations:`, error);
      }
    }
  }

  private async addDirectorCategory(
    categories: PersonalizedCategory[],
    historyItem: any,
    excludeIds: Set<number>
  ): Promise<void> {
    const movieDetails = await this.tmdbService.getMovieDetails(
      historyItem.movieId
    );

    if (!movieDetails.credits?.crew) return;

    const directors = movieDetails.credits.crew
      .filter((person: any) => person.job === 'Director')
      .slice(0, 1);

    for (const director of directors) {
      const directorMovies = await this.tmdbService.discoverMovies({
        with_crew: director.id.toString(),
        sort_by: 'vote_average.desc'
      });

      const filteredDirectorMovies = directorMovies
        .filter((movie) => !excludeIds.has(movie.id))
        .slice(0, 8);

      if (filteredDirectorMovies.length > 2) {
        categories.push({
          category: `More from ${director.name}`,
          movies: filteredDirectorMovies,
          recommendationType: 'director_based'
        });
        break;
      }
    }
  }

  private async addTimeBasedCategory(
    categories: PersonalizedCategory[],
    excludeIds: Set<number>
  ): Promise<void> {
    const { timeBasedCategory, timeBasedParams } =
      this.getTimeBasedParameters();

    if (!timeBasedCategory) return;

    try {
      const timeBasedMovies =
        await this.tmdbService.discoverMovies(timeBasedParams);
      const filteredTimeBasedMovies = timeBasedMovies
        .filter((movie) => !excludeIds.has(movie.id))
        .slice(0, 12);

      if (filteredTimeBasedMovies.length > 0) {
        categories.push({
          category: timeBasedCategory,
          movies: filteredTimeBasedMovies,
          recommendationType: 'time_based'
        });
      }
    } catch (error) {
      console.error('Error getting time-based recommendations:', error);
    }
  }

  private async addPopularCategory(
    categories: PersonalizedCategory[],
    excludeIds: Set<number>
  ): Promise<void> {
    const popularNow = await this.tmdbService.getPopular();
    const filteredPopular = popularNow
      .filter((movie) => !excludeIds.has(movie.id))
      .slice(0, 15);

    if (filteredPopular.length > 0) {
      categories.push({
        category: 'Popular Movies',
        movies: filteredPopular,
        recommendationType: 'popular'
      });
    }
  }

  private getSeasonalParameters() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const seasonName = this.getSeasonName(currentMonth);

    const seasonalParams = {
      'primary_release_date.gte': `${currentYear}-01-01`,
      'primary_release_date.lte': `${currentYear}-12-31`,
      sort_by: 'vote_average.desc',
      'vote_count.gte': '200'
    };

    return { seasonName, seasonalParams };
  }

  private getSeasonName(month: number): string {
    if (month >= 3 && month <= 5) return 'Spring';
    if (month >= 6 && month <= 8) return 'Summer';
    if (month >= 9 && month <= 11) return 'Fall';
    return 'Winter';
  }

  private getTimeBasedParameters() {
    const currentHour = new Date().getHours();

    if (currentHour >= 22 || currentHour < 6) {
      return {
        timeBasedCategory: 'Late Night Thrills',
        timeBasedParams: {
          with_genres: '53,27,80', // Thriller, Horror, Crime
          sort_by: 'popularity.desc'
        }
      };
    } else if (currentHour >= 18) {
      return {
        timeBasedCategory: 'Prime Time Action',
        timeBasedParams: {
          with_genres: '28,12', // Action, Adventure
          sort_by: 'popularity.desc'
        }
      };
    } else if (currentHour >= 12) {
      return {
        timeBasedCategory: 'Afternoon Favorites',
        timeBasedParams: {
          with_genres: '35,10751', // Comedy, Family
          sort_by: 'popularity.desc'
        }
      };
    } else {
      return {
        timeBasedCategory: 'Morning Pick-Me-Ups',
        timeBasedParams: {
          with_genres: '35,10749,16', // Comedy, Romance, Animation
          sort_by: 'vote_average.desc'
        }
      };
    }
  }

  private async getMovieDetails(movieIds: number[]): Promise<Movie[]> {
    const moviePromises = movieIds.map(async (id) => {
      try {
        return await this.tmdbService.getMovieDetails(id);
      } catch (error) {
        console.error(`Failed to get movie details for ${id}:`, error);
        return null;
      }
    });

    const movies = await Promise.all(moviePromises);
    return movies.filter(Boolean) as Movie[];
  }

  private async getFallbackCategories(): Promise<PersonalizedCategory[]> {
    const trending = await this.tmdbService.getTrending();
    const popular = await this.tmdbService.getPopular();

    return [
      {
        category: 'Trending Now',
        movies: trending.slice(0, 15),
        recommendationType: 'trending'
      },
      {
        category: 'Popular Movies',
        movies: popular.slice(0, 15),
        recommendationType: 'popular'
      }
    ];
  }
}
