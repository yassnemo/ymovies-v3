import { z } from 'zod';

const id = z.number().int().positive().max(2_147_483_647);
export const mediaIdSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && /^\d{1,10}$/.test(value)
      ? Number(value)
      : value,
  id
);
const text = z.string().max(300);
const watchData = z.object({
  watchProgress: z.number().min(0).max(100).optional(),
  completed: z.boolean().optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  watchedAt: z.string().max(64).optional(),
  lastStoppedAt: z.number().nonnegative().optional(),
  watchDuration: z.number().nonnegative().optional(),
  watchCount: z.number().int().nonnegative().optional()
});

export const savedMediaSchema = z
  .object({
    id,
    media_type: z.enum(['movie', 'tv']).optional(),
    title: text.optional(),
    name: text.optional(),
    overview: z.string().max(20_000).optional(),
    poster_path: z.string().max(300).nullable().optional(),
    backdrop_path: z.string().max(300).nullable().optional(),
    logo_path: z.string().max(300).nullable().optional(),
    release_date: z.string().max(32).optional(),
    first_air_date: z.string().max(32).optional(),
    vote_average: z.number().min(0).max(10).optional(),
    popularity: z.number().nonnegative().optional(),
    original_language: z.string().max(20).optional(),
    origin_country: z.array(z.string().max(8)).max(50).optional(),
    genre_ids: z.array(id).max(50).optional(),
    genres: z
      .array(z.object({ id, name: text }))
      .max(50)
      .optional(),
    watchData: watchData.optional()
  })
  .refine(
    (value) => Boolean(value.title?.trim() || value.name?.trim()),
    'A title or show name is required.'
  );

const mediaList = z.array(savedMediaSchema).max(2_000);
export const preferencesSchema = z.object({
  favoriteMovies: mediaList.optional(),
  watchlist: mediaList.optional(),
  watchHistory: mediaList.optional(),
  likedGenres: z.array(z.string().max(100)).max(100).optional(),
  dislikedGenres: z.array(z.string().max(100)).max(100).optional(),
  completed: z.boolean().optional(),
  collections: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        name: z.string().trim().min(1).max(100),
        items: mediaList,
        createdAt: z.string().max(64),
        color: z.string().max(32).optional()
      })
    )
    .max(100)
    .optional(),
  appSettings: z.record(z.string().max(100), z.unknown()).optional()
});

export const progressSchema = z.object({
  movieId: mediaIdSchema,
  watchProgress: z.number().int().min(0).max(100),
  watchDuration: z.number().int().min(0).max(2_147_483_647).optional(),
  lastStoppedAt: z.number().int().min(0).max(2_147_483_647).optional(),
  rating: z.number().int().min(0).max(5).optional()
});
