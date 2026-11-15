# Implementation and local validation

Validated on Windows with Node 24.13.0 and Grafana k6 1.6.0. The portable binary's archive matched the official release SHA256. All traffic stayed on the isolated local fixture harness; no production, paid API, real authentication provider or database load test was run.

## Executed checks

- `npm test`: 32 application/security tests passed.
- `npm run test:load:check`: six safety/configuration/report tests passed, including production guards, token separation, failed thresholds, missing summaries and HTML escaping.
- `npm run check`: zero errors and zero warnings.
- `npm run format:check`: passed.
- `npm run build`: Node production build passed.
- `k6 inspect --execution-requirements tests/performance/load.js`: all four profiles parsed with k6 1.6.0, including the 50/200-VU presets, without applying their traffic.
- Existing `npm run test:seo`: passed against the fixture server after the social-image update. Additional manual HTTP assertions confirmed Open Graph/Twitter image URLs and that the served JPEG matches the supplied file byte for byte.

The repository's existing local `.env` emitted a Vite warning about `NODE_ENV=production` during check/build; those commands still completed successfully. Credentials and environment files were not changed.

## Actual k6 measurements

| Run (UTC, 2026-11-15)    | Configuration                         | Journey requests             | Requests/s | Average  | p90       | p95       | p99       | Result                                                     |
| ------------------------ | ------------------------------------- | ---------------------------- | ---------- | -------- | --------- | --------- | --------- | ---------------------------------------------------------- |
| 18:05:41 smoke directory | 2 VUs, think 0.5–1.5s                 | 64 across 32 endpoint groups | 4.00       | 60.49 ms | 172.70 ms | 265.17 ms | 423.57 ms | Pass, zero HTTP errors, failed checks or failed thresholds |
| 18:07:24 spike directory | 3 VUs, time scale 0.1, think 0.3–0.5s | 172                          | 5.73       | 17.39 ms | 36.24 ms  | 55.00 ms  | 114.13 ms | Pass, zero HTTP errors, failed checks or failed thresholds |

The shortened spike had a 29-second stage schedule and completed in about 30 seconds including the final iteration. It captured 56 recovery requests. Histogram-estimated p95 was 56 ms at baseline, 86 ms during the spike and 43 ms in recovery. Phase endpoint mixes differ, so these values do not establish a recovery SLO or capacity limit.

An initial cold Vite smoke run completed all response checks but failed homepage and personalized-recommendation latency thresholds during first-time module compilation (approximately 2.7s and 3.1s). This verified nonzero failure propagation and report generation. The fixture runner now records an explicit ten-request compilation/cache warmup before measurement; thresholds were not relaxed. A separate earlier two-VU warm smoke also passed.

Reports are generated locally in ignored `results/<timestamp>-<profile>/` directories. They contain `report.html`, `report.json`, `summary.json`, `samples.jsonl`, `run.json` and fixture diagnostics. Reports, downloaded binaries and secrets are excluded from commits. GitHub Actions execution has not been claimed as a local test.

These are development SSR measurements with synthetic service/database adapters and a small, partially warm cache working set. They validate the testing system. They cannot establish production capacity, Core Web Vitals, real Supabase/Python performance, backend CPU/RAM or PostgreSQL connection behavior. Full 50/200-VU profiles were not applied.

## File inventory

Created for load testing:

```text
.github/workflows/performance.yml
tests/performance/README.md
tests/performance/VALIDATION.md
tests/performance/config.test.mjs
tests/performance/report.test.mjs
tests/performance/config/data.js
tests/performance/config/settings.js
tests/performance/fixture-server.mjs
tests/performance/load.js
tests/performance/run.mjs
tests/performance/scenarios/journeys.js
tests/performance/utils/client.js
tests/performance/utils/fixtures.js
tests/performance/utils/report.mjs
tests/performance/results/.gitkeep
```

Modified for load testing: `.gitignore`, `.prettierignore`, `package.json`, `README.md`. Application behavior and dependencies were not changed by the load-testing integration.

The separate social-preview change adds `static/og-image.jpg` and updates `src/lib/site.ts` and `docs/DESIGN.md`. Existing movie/TV detail previews continue to select the title artwork through the existing SEO resolver.

## Next measurements

Use the [README](README.md) installation and configuration instructions. Establish a repeatable production-build staging baseline with isolated upstreams and synthetic sessions, then increase VUs gradually. Correlate UTC timestamps with server CPU/RSS, auth validation time, database pool waits/query latency and upstream cache/429 metrics where available. The five-connection pool, per-instance caches, recommendation fallback work and homepage scroll fan-out are source-inspection findings worth profiling; they are not measured production bottlenecks.
