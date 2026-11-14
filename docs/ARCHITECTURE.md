# Architecture

SvelteKit owns server rendering, client navigation, route-level code splitting, and API routing. Components use Svelte 5 runes and a layout-scoped context for account and library stores. No React islands or Astro entry points are used.

```text
src/
  app.html                  HTML document template
  routes/                   SvelteKit pages, loaders, and request handlers
  lib/components/           Shared Svelte UI
  lib/types/                Catalog and preference types
  lib/state.ts              Layout-scoped auth and library stores
  lib/preferences.ts        Preference normalization and media identity helpers
  lib/styles/               Shared styles and preserved landing styles
  server/catalog.ts         Server-rendered TMDB catalog loaders
  server/api.ts             Authenticated API dispatcher
  server/tmdb-endpoint.ts    Public TMDB HTTP gateway
server/
  services/                 TMDB cache and recommendation engines
  storage.ts                Drizzle storage
  db.ts                     PostgreSQL connection
shared/schema.ts            Database schema
client/public/              Static logos, fonts, and landing media
recommendation_service/     Optional Flask recommendation service
tests/                      Node test runner tests
```

Catalog pages load TMDB data on the server, then hydrate native Svelte components. The gateway validates public endpoints and parameters, coalesces requests, serves cached data, and preserves stale data during upstream failures. TMDB credentials stay on the server.

Supabase manages browser sessions. Protected APIs validate the bearer token before storage access. Only the public Supabase URL and anonymous key are serialized in layout data. State is created per layout instance, avoiding cross-request account state on the server.

Preferences are cached under a guest or user-specific local-storage key. Legacy local keys migrate on first read. Writes update local state immediately and serialize account saves. Pending writes retry when connectivity returns. Media identity is the pair of media type and numeric ID. TV episode progress lives in application preferences and imports legacy per-show tracking.

Node and Vercel adapters are selected in `vite.config.ts`. SvelteKit 3 configuration lives in the Vite plugin. Subpath imports use `#lib/*` and `#shared/*` from `package.json`.
