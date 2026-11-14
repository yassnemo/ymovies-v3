# API

SvelteKit serves the API on the application's origin. Protected requests use `Authorization: Bearer <Supabase access token>`; the server verifies the token with Supabase. User IDs in request bodies cannot select another account.

| Endpoint | Methods | Access / behavior |
| --- | --- | --- |
| `/api/health` | GET | Framework health |
| `/api/tmdb/[...path]` | GET | Allowlisted public TMDB resources, cached |
| `/api/genres` | GET | Movie genres |
| `/api/search?q=...` | GET | Movie search |
| `/api/movies/trending`, `popular`, `top_rated`, `upcoming`, `now_playing` | GET | Movie lists |
| `/api/movies/:id`, `/api/tv/:id` | GET | Title detail; optional similar/videos/reviews subresources |
| `/api/preferences` | GET, POST | Authenticated library and application preferences |
| `/api/auth/user` | GET | Authenticated user |
| `/api/watchlist` | GET, POST | Authenticated legacy movie watchlist |
| `/api/watchlist/:id` | DELETE | Remove movie from legacy watchlist |
| `/api/watchlist/check/:id` | GET | Legacy watchlist membership |
| `/api/history` | GET, POST | Movie watch progress |
| `/api/watch-history` | GET | Movie watch progress |
| `/api/watch-history/:id/progress` | PUT | Update movie watch progress |
| `/api/recommendations/personalized` | GET | Account recommendations |
| `/api/recommendations/similar/:id` | GET | Enhanced related movies |
| `/api/recommendations/because-you-liked/:id` | GET | Related recommendations |
| `/api/tv/:id/similar/enhanced` | GET | Enhanced related TV shows |

Preference POST payloads may include `favoriteMovies`, `watchlist`, `watchHistory`, `likedGenres`, `dislikedGenres`, `collections`, `completed`, and `appSettings`. The Svelte app uses this unified library to preserve movie and TV identities. Episode tracking is stored in `appSettings.episodeTracking`.

The TMDB gateway rejects private/account endpoints, unknown query parameters, duplicated parameters, and non-GET requests. It returns cache metadata through `Cache-Control`, `Age`, and `X-TMDB-Cache`. User-specific API responses use `private, no-store`. Invalid data returns 400; missing or invalid auth returns 401; unknown resources return 404; unavailable upstream services return 503.
