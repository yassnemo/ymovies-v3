import type { Media, Preferences } from './types/media.ts';
import { mediaKey } from './types/media.ts';

export function emptyPreferences(): Preferences {
  return {
    favoriteMovies: [],
    watchlist: [],
    watchHistory: [],
    likedGenres: [],
    dislikedGenres: [],
    collections: [],
    completed: false,
    appSettings: {}
  };
}
export function normalizePreferences(
  value: Partial<Preferences> | null | undefined
): Preferences {
  const next = emptyPreferences();
  const cleanMedia = (items: unknown): Media[] =>
    Array.isArray(items)
      ? items.filter(
          (item) =>
            item &&
            Number.isInteger(item.id) &&
            item.id > 0 &&
            (typeof item.title === 'string' || typeof item.name === 'string')
        )
      : [];
  for (const key of ['favoriteMovies', 'watchlist', 'watchHistory'] as const)
    next[key] = cleanMedia(value?.[key]);
  for (const key of ['likedGenres', 'dislikedGenres'] as const)
    next[key] = Array.isArray(value?.[key]) ? value[key].map(String) : [];
  next.collections = Array.isArray(value?.collections)
    ? value.collections
        .filter(
          (item) =>
            item && typeof item.id === 'string' && typeof item.name === 'string'
        )
        .map((item) => ({ ...item, items: cleanMedia(item.items) }))
    : [];
  next.completed = value?.completed === true;
  next.appSettings =
    value?.appSettings &&
    typeof value.appSettings === 'object' &&
    !Array.isArray(value.appSettings)
      ? value.appSettings
      : {};
  return next;
}
export function toggleMedia(items: Media[], item: Media): Media[] {
  return items.some((entry) => mediaKey(entry) === mediaKey(item))
    ? items.filter((entry) => mediaKey(entry) !== mediaKey(item))
    : [item, ...items];
}
export function safeNext(value: string | null, fallback = '/home'): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u0020]/.test(value)
  )
    return fallback;
  return value;
}
