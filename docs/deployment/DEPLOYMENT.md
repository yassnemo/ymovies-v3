# Deployment

## Vercel

Import the repository as a SvelteKit project. Use `npm ci` and `npm run build`. Vercel supplies `VERCEL`, so `vite.config.ts` selects the Vercel adapter. Let the adapter manage deployment output.

Set the environment variables described in [installation](../setup/INSTALLATION.md) in the project's hosting settings. Add the production Supabase auth callback and recovery URLs to the redirect allowlist.

## Node / Heroku

Use Node.js 22.12+ and run `npm ci`, `npm run build`, and `npm start`. The Node adapter writes the server to `build/index.js`. Set `ORIGIN` to the site's public origin and `PORT` to its listening port. Deploy the entire build and runtime npm dependencies. `Procfile` uses `npm start`.

Keep `VERCEL` unset on Node hosts. Never set `NODE_ENV` in a Vite environment file; the build command sets it.

## Optional Python service

Deploy `recommendation_service/` as a separate HTTP service with Python 3.12. Install its `requirements.txt` and run `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120` from that directory. A Heroku worker is not an HTTP service; it needs its own web deployment.

Set `TMDB_API_KEY` and a long random `RECOMMENDATION_SERVICE_TOKEN` on the Python service. Set the same token and `RECOMMENDATION_SERVICE_URL` on the web app. Remote service URLs must use HTTPS; HTTP is accepted for loopback development. The health endpoint is public, but recommendation endpoints require the bearer token. Without web configuration, the app uses its TypeScript recommendation engine.

## Public identity

The canonical origin is `https://ymovies.yerradouani.me`, configured in `src/lib/site.ts`. Update that constant and the package homepage if moving domains. Preview deployments send `X-Robots-Tag: noindex`. Submit `/sitemap.xml` through the verified domain's Google Search Console property after publishing. Rankings depend on content, reputation and search relevance; metadata cannot guarantee a position.

The site uses CSP and response security headers. A custom Supabase domain needs its HTTPS and WebSocket origins added to `connect-src` in `vite.config.ts`. Verify sign-in and trailer playback after changing the policy.

## Verify

Check `GET /api/health` for `framework: "sveltekit"`, browse `/movies`, open a movie and TV detail, and test sign-in callbacks with a real configured account. Public TMDB data uses the same-origin `/api/tmdb/...` gateway. Protected APIs require a valid Supabase bearer token.
