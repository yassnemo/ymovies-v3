export type MediaType = 'movie' | 'tv';
export interface Media {
  id: number;
  media_type?: MediaType;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  logo_path?: string | null;
  rank?: number;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  popularity?: number;
  original_language?: string;
  origin_country?: string[];
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  watchData?: {
    watchProgress?: number;
    completed?: boolean;
    rating?: number | null;
    watchedAt?: string;
    lastStoppedAt?: number;
  };
}
export interface Video {
  id: string;
  key: string;
  site: string;
  type: string;
  name: string;
}
export interface Person {
  id: number;
  name: string;
  character?: string;
  job?: string;
  profile_path?: string | null;
}
export interface Review {
  id: string;
  author: string;
  content: string;
  url?: string;
}
export interface Season {
  season_number: number;
  name: string;
  episode_count: number;
}
export interface Episode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path?: string;
  runtime?: number;
  air_date?: string;
}
export interface Detail extends Media {
  tagline?: string;
  runtime?: number;
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Season[];
  credits?: { cast: Person[]; crew: Person[] };
  videos?: { results: Video[] };
  reviews?: { results: Review[] };
  recommendations?: { results: Media[] };
  similar?: { results: Media[] };
}
export interface CatalogSection {
  title: string;
  items: Media[];
  href?: string;
}
export interface Collection {
  id: string;
  name: string;
  items: Media[];
  createdAt: string;
  color?: string;
}
export interface Preferences {
  favoriteMovies: Media[];
  watchlist: Media[];
  watchHistory: Media[];
  likedGenres: string[];
  dislikedGenres: string[];
  collections: Collection[];
  completed: boolean;
  appSettings: Record<string, unknown>;
}
export const mediaType = (item: Media): MediaType =>
  item.media_type || (item.name || item.first_air_date ? 'tv' : 'movie');
export const mediaKey = (item: Media) => `${mediaType(item)}:${item.id}`;
export const mediaTitle = (item: Media) =>
  item.title || item.name || 'Untitled';
export const mediaHref = (item: Media) => `/${mediaType(item)}/${item.id}`;
export const mediaYear = (item: Media) =>
  (item.release_date || item.first_air_date || '').slice(0, 4);
export const imageUrl = (path?: string | null, size = 'w500') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : '/notFound.svg';
