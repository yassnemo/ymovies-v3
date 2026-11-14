import { type Movie } from '#lib/types/movie.ts';
import { type BlendedRecommendation } from './types';
/**
 * Class responsible for blending multiple recommendation sources
 */
export class RecommendationBlender {
  /**
   * Enhanced blending of multiple recommendation sources with Netflix-like scoring
   */
  static blendRecommendations(
    contentBasedRecs: Movie[],
    collaborativeRecs: Movie[],
    limit: number
  ): Movie[] {
    const recommendationMap = this.createRecommendationMap(
      contentBasedRecs,
      collaborativeRecs
    );
    this.applyAdditionalScoringFactors(recommendationMap);
    return this.sortAndLimitRecommendations(recommendationMap, limit);
  }
  private static createRecommendationMap(
    contentBasedRecs: Movie[],
    collaborativeRecs: Movie[]
  ): Map<number, BlendedRecommendation> {
    const recommendationMap = new Map<number, BlendedRecommendation>();
    this.addContentBasedRecommendations(recommendationMap, contentBasedRecs);
    this.addCollaborativeRecommendations(recommendationMap, collaborativeRecs);
    return recommendationMap;
  }
  private static addContentBasedRecommendations(
    map: Map<number, BlendedRecommendation>,
    contentBasedRecs: Movie[]
  ): void {
    contentBasedRecs.forEach((movie, index) => {
      const positionScore = Math.exp(-index * 0.1);
      const contentScore = positionScore * 0.6;
      map.set(movie.id, {
        movie,
        contentScore,
        collaborativeScore: 0,
        combinedScore: contentScore,
        sources: ['content']
      });
    });
  }
  private static addCollaborativeRecommendations(
    map: Map<number, BlendedRecommendation>,
    collaborativeRecs: Movie[]
  ): void {
    collaborativeRecs.forEach((movie, index) => {
      const positionScore = Math.exp(-index * 0.1);
      const collaborativeScore = positionScore * 0.6;
      if (map.has(movie.id)) {
        const existing = map.get(movie.id)!;
        existing.collaborativeScore = collaborativeScore;
        existing.combinedScore =
          existing.contentScore + collaborativeScore + 0.3;
        existing.sources.push('collaborative');
      } else {
        map.set(movie.id, {
          movie,
          contentScore: 0,
          collaborativeScore,
          combinedScore: collaborativeScore,
          sources: ['collaborative']
        });
      }
    });
  }
  private static applyAdditionalScoringFactors(
    map: Map<number, BlendedRecommendation>
  ): void {
    Array.from(map.values()).forEach((rec) => {
      rec.combinedScore += this.calculatePopularityBonus(rec.movie);
      rec.combinedScore += this.calculateQualityBonus(rec.movie);
      rec.combinedScore += this.calculateRecencyBonus(rec.movie);
      rec.combinedScore += this.calculateGenreDiversityBonus(rec.movie);
      rec.combinedScore += this.calculateRuntimeBonus(rec.movie);
      rec.combinedScore += this.calculateReliabilityBonus(rec.movie);
      rec.combinedScore += this.calculateDiversityPenalty(rec);
    });
  }
  private static calculatePopularityBonus(movie: Movie): number {
    return movie.popularity && movie.popularity > 50 ? 0.1 : 0;
  }
  private static calculateQualityBonus(movie: Movie): number {
    if (!movie.vote_average) return 0;
    if (movie.vote_average >= 8.0) return 0.15;
    if (movie.vote_average >= 7.0) return 0.08;
    return 0;
  }
  private static calculateRecencyBonus(movie: Movie): number {
    if (!movie.release_date) return 0;
    const releaseYear = new Date(movie.release_date).getFullYear();
    const currentYear = new Date().getFullYear();
    const yearsSinceRelease = currentYear - releaseYear;
    if (yearsSinceRelease <= 2) return 0.05;
    if (yearsSinceRelease <= 5) return 0.02;
    return 0;
  }
  private static calculateGenreDiversityBonus(movie: Movie): number {
    if (!movie.genre_ids || !Array.isArray(movie.genre_ids)) return 0;
    return movie.genre_ids.length >= 3 ? 0.03 : 0;
  }
  private static calculateRuntimeBonus(movie: Movie): number {
    if (!movie.runtime) return 0;
    if (movie.runtime >= 90 && movie.runtime <= 150) return 0.02;
    if (movie.runtime > 180) return -0.05;
    return 0;
  }
  private static calculateReliabilityBonus(movie: Movie): number {
    if (!movie.vote_count) return 0;
    if (movie.vote_count > 1000) return 0.03;
    if (movie.vote_count < 100) return -0.02;
    return 0;
  }
  private static calculateDiversityPenalty(rec: BlendedRecommendation): number {
    if (rec.sources.length === 1 && rec.combinedScore < 0.3) {
      return rec.combinedScore * -0.2; // 20% penalty
    }
    return 0;
  }
  private static sortAndLimitRecommendations(
    map: Map<number, BlendedRecommendation>,
    limit: number
  ): Movie[] {
    return Array.from(map.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .map((item) => item.movie)
      .slice(0, limit);
  }
}
