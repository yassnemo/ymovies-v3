// Domain types to address Primitive Obsession
export interface RecommendationQuery {
  userId: string;
  limit: number;
  excludeWatched: boolean;
  excludeWatchlist: boolean;
}
export interface UserProfile {
  preferredDecades: string[];
  preferredGenres: number[];
  avgQualityThreshold: number;
  preferredLanguages: string[];
  recentWatchingPatterns: WatchingPatterns;
}
export interface WatchingPatterns {
  totalWatched: number;
  completionRate: number;
  avgRating: number | null;
}
export interface ContentContext {
  isAnimation: boolean;
  isFamily: boolean;
  isMature: boolean;
  contentGenres: Set<number>;
}
export interface TemporalRange {
  min: number;
  max: number;
}
export interface MovieCandidate {
  movie: Movie;
  relevanceScore: number;
  source: string;
}
export interface RecommendationFilters {
  [key: string]: string | undefined;
  with_genres?: string;
  without_genres?: string;
  with_crew?: string;
  with_cast?: string;
  with_keywords?: string;
  'vote_count.gte'?: string;
  'vote_average.gte'?: string;
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  sort_by?: string;
}
export interface ScoreComponents {
  genreScore: number;
  qualityScore: number;
  temporalScore: number;
  languageScore: number;
  popularityScore: number;
}
export interface BlendedRecommendation {
  movie: Movie;
  contentScore: number;
  collaborativeScore: number;
  combinedScore: number;
  sources: string[];
}
export type RecommendationType =
  | 'continue_watching'
  | 'because_you_watched'
  | 'personalized'
  | 'trending'
  | 'genre_specific'
  | 'watch_again'
  | 'seasonal'
  | 'new_releases'
  | 'award_winners'
  | 'hidden_gems'
  | 'director_based'
  | 'time_based'
  | 'popular';
export interface PersonalizedCategory {
  category: string;
  movies: Movie[];
  recommendationType: RecommendationType;
}
import { type Movie } from '#lib/types/movie.ts';
