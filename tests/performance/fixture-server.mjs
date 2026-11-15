// TEST-ONLY Vite module substitutions; never imported by application source/build.
import { createServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import axios from 'axios';

const root = fileURLToPath(new URL('../../', import.meta.url));
const normalize = (path) => path.replace(/\\/g, '/');
const fixture = normalize(
  fileURLToPath(new URL('./utils/fixtures.js', import.meta.url))
);
const tmdb = normalize(resolve(root, 'server/services/tmdb.ts'));
const replacements = new Map(
  [
    ['server/storage.ts', 'storage'],
    ['server/db.ts', 'db'],
    ['server/supabaseAdmin.ts', 'supabaseAdmin'],
    ['server/services/recommendation-connector.ts', 'RecommendationConnector']
  ].map(([path, name]) => [normalize(resolve(root, path)), name])
);

// Override even inherited credentials before Vite loads .env. No service is contacted.
for (const key of [
  'TMDB_API_KEY',
  'TMDB_BEARER_TOKEN',
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'RECOMMENDATION_SERVICE_URL',
  'RECOMMENDATION_SERVICE_TOKEN',
  'VERCEL'
])
  process.env[key] = '';
axios.defaults.adapter = async () => {
  throw new Error(
    'Network upstreams are forbidden in the performance fixture harness'
  );
};
globalThis.fetch = async () => {
  throw new Error(
    'Network fetch is forbidden in the performance fixture harness'
  );
};

const port = Number(process.env.PERF_FIXTURE_PORT || 5100);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid fixture port');
const server = await createServer({
  root,
  mode: 'development',
  server: { host: '127.0.0.1', port, strictPort: true, hmr: false },
  plugins: [
    {
      name: 'ymovies-performance-isolation',
      enforce: 'pre',
      async load(id) {
        const path = normalize(id);
        if (path === tmdb + '?performance-original')
          return readFile(tmdb, 'utf8');
        if (path === tmdb)
          return `
        import { TMDBService as Original } from ${JSON.stringify(tmdb + '?performance-original')};
        import { catalogFixture } from ${JSON.stringify(fixture)};
        export { TMDBServiceError, normalizeTMDBParams, createTMDBCacheKey } from ${JSON.stringify(tmdb + '?performance-original')};
        let sharedService;
        export class TMDBService extends Original {
          constructor(credential, options = {}) {
            super('', { ...options, request: catalogFixture });
            if (sharedService) return sharedService;
            sharedService = this;
          }
        }
      `;
        const name = replacements.get(path);
        if (name)
          return `export { ${name}, ${name} as default } from ${JSON.stringify(fixture)};`;
      },
      configureServer(instance) {
        instance.middlewares.use((request, response, next) => {
          response.setHeader('X-YMovies-Performance-Fixture', 'isolated-v1');
          if (request.method !== 'GET' && request.method !== 'HEAD') {
            response.writeHead(405);
            response.end('Fixture harness is read-only');
            return;
          }
          next();
        });
      }
    }
  ]
});
await server.listen();
console.log(
  `Isolated YMovies fixture harness: http://127.0.0.1:${port} (Vite development SSR, synthetic dependencies)`
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    await server.close();
    process.exit(0);
  });
