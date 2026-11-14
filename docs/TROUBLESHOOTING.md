# Troubleshooting

## Catalog unavailable

Check `TMDB_API_KEY` or `TMDB_BEARER_TOKEN` on the server, then use `/api-test` or `/api/tmdb/movie/550`. Never put the credential in a browser-prefixed variable. A TMDB outage displays an unavailable state and the gateway can serve stale cached data.

## Sign-in unavailable

Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` (legacy VITE names are supported). Check Supabase auth providers and the callback/recovery redirect allowlist. Expired confirmation links need to be resent.

## Library saves locally but does not sync

Check the server's `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `DATABASE_URL`. API calls need a valid Supabase access token. Failed writes remain pending locally and retry when the browser reconnects. Guest libraries are intentionally device-local.

## Build or editor errors

Run `npm ci`, then `npm run check`. Use Node.js 22.12+ and the Svelte editor extension. SvelteKit 3 uses plugin configuration in `vite.config.ts`, TypeScript's `$app/tsconfig`, and package subpath imports for `#lib` and `#shared`.

## Production deep links fail

Deploy the SvelteKit server output with the matching adapter. Set `ORIGIN` when using the Node adapter behind a proxy.

## Vercel adapter reports EPERM on Windows

The Vercel adapter creates function symlinks during packaging. Windows hosts without symlink privileges can compile the app but fail at this packaging step. Use Vercel's Linux build environment or a Linux checkout for this build. Local development and the Node adapter do not require these symlinks. CI checks both adapters on Linux.
