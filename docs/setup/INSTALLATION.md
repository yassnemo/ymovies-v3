# Installation

Use Node.js 22.12+ (24 recommended) and npm. From the repository root run `npm ci`, copy `.env.example` to `.env`, then run `npm run dev`.

## Environment

| Variable                              | Purpose                                                      |
| ------------------------------------- | ------------------------------------------------------------ |
| `TMDB_API_KEY` or `TMDB_BEARER_TOKEN` | Server-side catalog access                                   |
| `PUBLIC_SUPABASE_URL`                 | Browser Supabase project URL                                 |
| `PUBLIC_SUPABASE_ANON_KEY`            | Browser-safe Supabase anonymous key                          |
| `SUPABASE_URL`                        | Server Supabase project URL                                  |
| `SUPABASE_SERVICE_ROLE_KEY`           | Server-only token validation client                          |
| `DATABASE_URL`                        | PostgreSQL connection used by Drizzle                        |
| `RECOMMENDATION_SERVICE_URL`          | Optional Flask service URL; HTTPS remotely, HTTP on loopback |
| `RECOMMENDATION_SERVICE_TOKEN`        | Shared private token required on web and Flask deployments   |
| `PORT`                                | Production Node server port                                  |
| `ORIGIN`                              | Production public origin, including scheme                   |

Legacy `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values are supported. Never prefix server secrets with `PUBLIC_` or `VITE_`.

Leave the recommendation variables empty to use the TypeScript engine. See [deployment](../deployment/DEPLOYMENT.md) to run Python separately. Run `npm run doctor` to check which features are configured without exposing their values.

## Supabase

Enable email/password auth. Configure Google OAuth if needed. Add the app origin's `/auth/callback` and `/auth/reset-password` URLs to the redirect allowlist for development and production. Email confirmation and password recovery are handled by Supabase.

## Database

Point `DATABASE_URL` to your PostgreSQL database and apply `shared/schema.ts` using `npm run db:push`. That command changes the configured database; review its target before running it. No schema changes are required solely for the Svelte rewrite.

## Validation

Run `npm run check`, `npm test`, and `npm run build`. Run `npm start` to serve the Node output from `build/`. Guest browsing can run without Supabase or a database.
