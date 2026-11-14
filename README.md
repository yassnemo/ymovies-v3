# YMovies

Discover movies and TV shows, save a watchlist and favorites, organize collections, and track watch and episode progress.

YMovies runs on **Svelte 5, SvelteKit 3, TypeScript 6, Vite 8, and Tailwind CSS 3**. The UI is implemented in Svelte. SvelteKit serves pages and same-origin APIs; the existing TMDB gateway, Supabase authentication, PostgreSQL/Drizzle storage, and optional Python recommendation service are retained.

## Run locally

Use Node.js 22.12 or newer (Node.js 24 recommended).

```sh
npm ci
cp .env.example .env
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env`. Open http://localhost:5000.

Set `TMDB_API_KEY` or `TMDB_BEARER_TOKEN` for the catalog. Guest browsing and browser-local lists do not require a database or Supabase. Missing catalog credentials display an unavailable state.

For accounts, set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`. The existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` names remain supported. Account sync also needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL` on the server. Never expose service-role credentials or TMDB credentials as public variables.

In Supabase, allow your origin's `/auth/callback` and `/auth/reset-password` redirect URLs. Enable Google in Supabase to use Google sign-in.

## Commands

| Command                | Purpose                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev`          | Run SvelteKit locally on port 5000                                                         |
| `npm run check`        | Generate route types and check Svelte/TypeScript                                           |
| `npm test`             | Test gateway caching, request validation, and preference handling                          |
| `npm run test:api`     | Check a running server's health, auth boundaries, and error routes                         |
| `npm run test:browser` | Check desktop/mobile guest flows in a running server using Chrome                          |
| `npm run build`        | Build a Node server into `build/`                                                          |
| `npm start`            | Run the built server; load `.env` when present                                             |
| `npm run preview`      | Preview the production build                                                               |
| `npm run db:push`      | Apply the Drizzle schema to your configured database                                       |

Browser checks use a fresh temporary browser profile. Set `TEST_BASE_URL` to change the server URL and `CHROME_PATH` if Chrome is installed outside its default location. Real-account sign-in and email delivery require separate verification with your configured Supabase project.

## Routes and features

- `/`: the existing landing design, rebuilt in Svelte.
- `/home`: featured titles, catalog rows, recommendations, genre onboarding, and continue watching.
- `/movies`, `/tv`, `/genre/:mediaType/:genre`: category browsing, genre filters, sorting, and pagination.
- `/search`: movie/TV search, release year and rating filters, and pagination.
- `/movie/:id`, `/tv/:id`: cast and crew, trailers, reviews, related titles, providers, ratings, watch progress, and TV episode tracking.
- `/my-list`: watchlist, favorites, history, continue watching, and editable collections.
- `/profile`, `/settings`: account details, genre preferences, password changes, and saved activity preferences.
- Sign-in, sign-up, email verification, OAuth callback, and password reset routes.
- `/privacy`, `/terms`, `/api-test`, and proper error pages.

Existing local favorites, watchlists, history, collections, and episode tracking are migrated when read. Movie and TV identities include media type. Guest and signed-in preference caches are isolated. Failed account saves remain on the device and retry on reconnect.


## Deployment

Local and Heroku builds use `@sveltejs/adapter-node`. Set `PORT` and `ORIGIN` for your host, then run `npm run build && npm start`. Vercel sets `VERCEL`, selecting `@sveltejs/adapter-vercel`; `vercel.json` declares the SvelteKit framework. Configure runtime environment variables in your host's settings.

The optional Flask recommendation service remains in `recommendation_service/`. Set `RECOMMENDATION_SERVICE_URL` when deploying it separately. The TypeScript recommendation engine remains available when that service is unavailable.

See [architecture](docs/ARCHITECTURE.md), [API](docs/api/API_DOCUMENTATION.md), [setup](docs/setup/INSTALLATION.md), and [deployment](docs/deployment/DEPLOYMENT.md).

Movie data comes from [TMDB](https://www.themoviedb.org/); availability data is supplied by JustWatch through TMDB. YMovies is not endorsed or certified by TMDB. Created by [Yassine Erradouani](https://yerradouani.me). [MIT license](LICENSE).
