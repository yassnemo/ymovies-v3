# Deployment

## Vercel

Import the repository as a SvelteKit project. Use `npm ci` and `npm run build:vercel`. Vercel supplies `VERCEL`, so `vite.config.ts` selects the Vercel adapter. The adapter manages deployment output; do not set a static output directory or add an SPA catch-all rewrite.

Set the environment variables described in [installation](../setup/INSTALLATION.md) in the project's hosting settings. Add the production Supabase auth callback and recovery URLs to the redirect allowlist.

## Node / Heroku

Use Node.js 22.12+ and run `npm ci`, `npm run build`, and `npm start`. The Node adapter writes the server to `build/index.js`. Set `ORIGIN` to the site's public origin and `PORT` to its listening port. Deploy the entire build and runtime npm dependencies. `Procfile` uses `npm run start:heroku`.

Keep `VERCEL` unset on Node hosts. The optional Flask recommendation service can be deployed independently; configure `RECOMMENDATION_SERVICE_URL`. The application has a TypeScript recommendation fallback.

## Verify

Check `GET /api/health` for `framework: "sveltekit"`, browse `/movies`, open a movie and TV detail, and test sign-in callbacks with a real configured account. Public TMDB data uses the same-origin `/api/tmdb/...` gateway. Protected APIs require a valid Supabase bearer token.
