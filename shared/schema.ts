import {
  pgTable,
  text,
  varchar,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User preferences for saved content
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  favoriteMovies: jsonb("favorite_movies").default([]),
  watchlist: jsonb("watchlist").default([]),
  watchHistory: jsonb("watch_history").default([]),
  likedGenres: text("liked_genres").array().default([]),
  dislikedGenres: text("disliked_genres").array().default([]),
  collections: jsonb("collections").default([]),
  appSettings: jsonb("app_settings").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// My List / Watchlist
export const watchlistItems = pgTable("watchlist_items", {
  id: serial("id"), // Removed primaryKey() here
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  movieId: integer("movie_id").notNull(), // TMDb movie ID
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.movieId] }),
]);

// Watch history with enhanced tracking
export const watchHistory = pgTable("watch_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  movieId: integer("movie_id").notNull(), // TMDb movie ID
  watchedAt: timestamp("watched_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  watchProgress: integer("watch_progress").default(0), // Progress percentage (0-100)
  watchCount: integer("watch_count").default(1), // Number of times watched
  completed: boolean("completed").default(false), // Whether movie was watched to completion
  watchDuration: integer("watch_duration").default(0), // Time spent watching in seconds
  rating: integer("rating"), // User rating 1-5 stars (optional)
  lastStoppedAt: integer("last_stopped_at").default(0), // Last timestamp where user stopped (seconds)
}, (table) => [
  index("idx_user_movie").on(table.userId, table.movieId),
  index("idx_watch_history_date").on(table.watchedAt),
]);

// User Favorites
export const favoriteItems = pgTable("favorite_items", {
  id: serial("id"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  movieId: integer("movie_id").notNull(), // TMDb movie ID
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.movieId] }),
]);

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type UserPreferencesInsert = typeof userPreferences.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;

export type WatchlistItemInsert = typeof watchlistItems.$inferInsert;
export type WatchlistItem = typeof watchlistItems.$inferSelect;

export type WatchHistoryInsert = typeof watchHistory.$inferInsert;
export type WatchHistory = typeof watchHistory.$inferSelect;

export type FavoriteItemInsert = typeof favoriteItems.$inferInsert;
export type FavoriteItem = typeof favoriteItems.$inferSelect;

// Zod schemas
export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({ 
  id: true,
  createdAt: true, 
  updatedAt: true 
});

export const insertWatchlistItemSchema = createInsertSchema(watchlistItems).omit({ 
  id: true,
  addedAt: true 
});

export const insertWatchHistorySchema = createInsertSchema(watchHistory).omit({ 
  id: true,
  watchedAt: true 
});

export const insertFavoriteItemSchema = createInsertSchema(favoriteItems).omit({ 
  id: true,
  addedAt: true 
});
