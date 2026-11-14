# API

SvelteKit serves the API on the application's origin. Protected requests use `Authorization: Bearer <Supabase access token>`; the server verifies the token with Supabase. User IDs in request bodies cannot select another account.

| Endpoint                                                                  | Methods   | Access / behavior                                          |
| ------------------------------------------------------------------------- | --------- | ---------------------------------------------------------- |
| `/api/health`                                                             | GET       | Framework health                                           |
| `/api/tmdb/[...path]`                                                     | GET       | Allowlisted public TMDB resources, cached                  |
| `/api/genres`                                                             | GET       | Movie genres                                               |
| `/api/search?q=...`                                                       | GET       | Movie search                                               |
| `/api/movies/trending`, `popular`, `top_rated`, `upcoming`, `now_playing` | GET       | Movie lists                                                |
| `/api/movies/:id`, `/api/tv/:id`                                          | GET       | Title detail; optional similar/videos/reviews subresources |
| `/api/preferences`                                                        | GET, POST | Authenticated library and application preferences          |
| `/api/auth/user`                                                          | GET       | Authenticated user                                         |
| `/api/watchlist`                                                          | GET, POST | Authenticated legacy movie watchlist                       |
| `/api/watchlist/:id`                                                      | DELETE    | Remove movie from legacy watchlist                         |
| `/api/watchlist/check/:id`                                                | GET       | Legacy watchlist membership                                |
| `/api/history`                                                            | GET, POST | Movie watch progress                                       |
| `/api/watch-history`                                                      | GET       | Movie watch progress                                       |
| `/api/watch-history/:id/progress`                                         | PUT       | Update movie watch progress                                |
| `/api/recommendations/personalized`                                       | GET       | Account recommendations                                    |
| `/api/recommendations/similar/:id`                                        | GET       | Enhanced related movies                                    |
| `/api/recommendations/because-you-liked/:id`                              | GET       | Related recommendations                                    |
| `/api/tv/:id/similar/enhanced`                                            | GET       | Enhanced related TV shows                                  |

Preference POST payloads may include `favoriteMovies`, `watchlist`, `watchHistory`, `likedGenres`, `dislikedGenres`, `collections`, `completed`, and `appSettings`. The Svelte app uses this unified library to preserve movie and TV identities. Episode tracking is stored in `appSettings.episodeTracking`.

The TMDB gateway rejects private/account endpoints, unknown query parameters, duplicated parameters, and non-GET requests. It returns cache metadata through `Cache-Control`, `Age`, and `X-TMDB-Cache`. User-specific API responses use `private, no-store`. Invalid data returns 400; missing or invalid auth returns 401; unknown resources return 404; unavailable upstream services return 503.

JSON writes require `application/json` (or an application `+json` type) and are capped at 1 MiB, including streamed requests. Nested input is limited to 16 levels and 25,000 values. Prototype-related keys are rejected. Media IDs are positive 32-bit integers; media lists allow at most 2,000 records, collections at most 100, watch progress 0–100 and personal ratings 0–5. Oversized bodies return 413; unsupported content types return 415.

The optional Python service is internal to the web app. Apart from `/health`, its endpoints require `Authorization: Bearer <RECOMMENDATION_SERVICE_TOKEN>`. Its JSON limit is 64 KiB. Personalized input contains only capped `watched_ids`, `rated_movies` and `liked_genres`; account IDs and full saved-history rows are not sent.
