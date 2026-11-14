# Architecture

SvelteKit owns server rendering, client navigation, route splitting and API routing. Components use Svelte 5 runes. Account and library stores are created per layout instance, so one server request cannot share another visitor's session.

```text
src/
  app.html                  Document and Google tag
  hooks.server.ts           Response headers and safe errors
  routes/                   Pages, server loaders and HTTP endpoints
  lib/components/           Shared Svelte UI
  lib/state.ts              Authentication and library stores
  lib/preferences.ts        Preference normalization and media identity
  lib/seo.ts                Canonicals, metadata and structured data
  lib/site.ts               Site identity and author links
  lib/signature.ts          Developer signature used by sitemap and robots
  lib/styles/               Shared styles and motion
  server/                   Catalog, API dispatch and input validation
server/
  services/                 TMDB gateway/cache and recommendation engines
  storage.ts                Drizzle persistence
  db.ts                     PostgreSQL connection
shared/schema.ts            Database schema
static/                     Icons, fonts, provider logos and social preview
recommendation_service/     Optional authenticated Flask service
tests/                      Node test runner suites
```

Catalog pages load TMDB data on the server before hydrating. The gateway allows specific public resources and query parameters, coalesces concurrent requests and serves cached data during upstream failures. TMDB credentials stay on the server.

Supabase handles browser sessions. Protected API requests validate the bearer token with Supabase before using its user ID for storage. Only the public Supabase URL and anonymous key are serialized in layout data. JSON writes have size, depth and schema limits; account responses use `private, no-store`.

Preferences are cached under a guest or user-specific browser key. Legacy keys migrate when read. Writes update the device first and serialize account saves; pending changes retry when connectivity returns. Media identity includes both type and numeric ID. Episode tracking lives in application preferences.

The TypeScript recommendation engine works on its own. An explicitly configured Python service can add recommendations; it requires a shared token and receives a capped preference summary rather than an account ID or full history. Both services bound their caches. Their caches and cooldowns are process-local, not shared across deployment instances.

Node and Vercel adapters are selected in `vite.config.ts`. SvelteKit configuration lives in the Vite plugin. `#lib/*` and `#shared/*` are package subpath imports.

By [Yassine Erradouani](https://yerradouani.me).
