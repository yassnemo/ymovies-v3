# YMovies performance tests

Free, local Grafana k6 HTTP load tests. No Grafana Cloud, Docker, browser installation, reporting CDN, or paid service is needed. Use Node 22.12+ (CI uses 24), `npm ci`, and **k6 1.6.0**. The runner checks the exact version; upgrade the pin, workflow download, and summary compatibility together after validation. k6 runs JavaScript in its own runtime, not Node; only the launcher, fixture harness and reporter use Node APIs.

## Architecture inspected

YMovies is Svelte 5 / SvelteKit 3 with Vite 8, TypeScript and Tailwind. `src/server/catalog.ts` loads TMDB data for server-rendered pages. Pages can return HTTP 200 while displaying unavailable content, so these tests also check for rendered catalog links and validate JSON shapes. The suite sends HTTP requests; it does not execute client JavaScript or claim to measure browser rendering, assets, hydration, or Core Web Vitals. Existing browser/navigation tests remain useful for that work.

`src/server/api.ts` serves public catalog and protected library APIs. `src/server/tmdb-endpoint.ts` exposes an allowlisted, GET-only TMDB gateway with `X-TMDB-Cache`, `Age`, `Cache-Control` and `Server-Timing` headers. The TMDB service coalesces requests, caches responses in process with bounds and stale fallback, throttles upstream concurrency to 16 and starts to 30/second, and backs off on failures. These protections remain enabled. Each server instance has its own cache; a warm local process does not represent cold serverless instances.

Supabase handles password/OAuth sign-in **directly from the browser**. `/login` and `/api/login` redirect to `/signin`; neither is a login POST endpoint. Protected APIs validate the bearer token with `supabaseAdmin.auth.getUser` on every request. Drizzle uses the Neon serverless PostgreSQL driver, configured with **five pool connections per server instance**, and stores users, preferences, watchlist and viewing history. Some storage failures return fallback/default data; passing response-shape checks alone does not establish database health.

Recommendations use an optional token-protected Flask/Python service, alongside a TypeScript recommendation engine and TMDB fallbacks. Some handlers start both sources concurrently. Python performs catalog recommendations; no paid generative-AI provider integration was found. Recommendation requests can still fan out to TMDB and database reads, so high-volume tests require isolation. Do not infer Python capacity from fixture results.

Hosting supports adapter-node (`npm run build`, `npm start`, port 5000), Vercel serverless via `VERCEL`, and a Node Procfile. `/api/health` checks that the API responds; it does **not** probe the database, Supabase or Python service. No existing application CPU/RAM/pool telemetry endpoint was found. Google Analytics, YouTube and TMDB artwork are browser-side services excluded from load traffic.

Homepage scrolling can trigger two provider-discovery requests, four discovery rows and up to 24 curated title-detail requests. The core journeys sample these catalog endpoint families; they do not replay the entire browser scroll fan-out or SvelteKit client navigation transport. Profile that pattern separately on isolated staging before assessing heavily engaged homepage traffic.

### Actual routes and coverage

| Area                | Implemented routes / endpoints                                                                                                                        | Test behavior                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Home                | `/`, `/home`                                                                                                                                          | Rendered catalog; API genres and popular titles                                                 |
| Discovery           | `/movies`, `/tv`                                                                                                                                      | Popular movies and top-rated series                                                             |
| Browse filters      | `?category=`, `genre`, `year`, `sort`, `page`, `provider`                                                                                             | Genre/year/sort filter, page 2, `/genre/movie/action`, `/provider/8`                            |
| Search              | `/search?q=…`, `/api/search?q=…`, `/api/tmdb/search/multi?query=…`                                                                                    | Bounded vocabulary, autocomplete, page results and API; no invented pagination on `/api/search` |
| Search filters      | `/search` also supports `type`, `year`, `rating`, `genre`, `language`, `country`, `sortBy`, `page`                                                    | Supported by the application; browse filtering/pagination exercised in the core mix             |
| Details             | `/movie/:id`, `/tv/:id`, `/api/movies/:id`                                                                                                            | Representative movie/series IDs, detail response                                                |
| Detail interactions | `/api/tmdb/movie/:id/watch/providers`, `/api/tmdb/tv/:id/season/1`, `/api/tmdb/movie/:id/recommendations`                                             | Availability, episodes, catalog recommendations                                                 |
| Public API          | `/api/genres`, `/api/movies/popular`, `/api/tmdb/discover/movie`                                                                                      | JSON contracts and nonempty catalog                                                             |
| Auth boundaries     | `/signin`, `/api/preferences` without token                                                                                                           | Sign-in page and expected 401; expected 401 is not an HTTP error                                |
| Authenticated reads | `/api/auth/user`, `/api/preferences`, `/api/watchlist`, `/api/watchlist/check/:id`, `/api/history`                                                    | One synthetic session per VU, no writes                                                         |
| AI recommendations  | `/api/recommendations/personalized`, `/api/recommendations/similar/:id`, `/api/recommendations/because-you-liked/:id`, `/api/tv/:id/similar/enhanced` | Optional, nonempty categories/recommendations                                                   |
| Health              | `/api/health`                                                                                                                                         | Readiness/preflight and journey coverage                                                        |

Other public API routes found: `/api/movies/{trending,top_rated,upcoming,now_playing}`, `/api/recommendations/trending`, `/api/{movies,tv}/:id/{similar,videos,reviews}`, `/api/watch-history` (history alias), and `/api/recommendations` (personalized alias). The TMDB gateway also allows trending, browse, detail extras/images, movie/TV search and discovery, genres, languages/countries, collections and seasons; see the allowlist in `server/services/tmdb.ts` for the authoritative contract.

Other pages include `/genres`, `/providers`, `/my-list`, `/profile`, `/settings`, `/about`, `/privacy`, `/terms`, signup/password-reset/email-verification/callback pages, `/robots.txt`, `/sitemap.xml`, and `/api-test`. `/series` redirects to `/tv`, `/lists` to `/my-list`. Static/legal pages and recovery/email/OAuth flows are excluded from the core load mix. The sitemap can fetch TMDB and is deliberately not polled.

**Excluded writes:** POST preferences/watchlist/history, DELETE watchlist, PUT watch-history progress, account creation, password grants/resets, email sending, OAuth and verification. Guest lists live in browser localStorage and cannot be exercised by protocol-level k6. Library reads are covered; persistent mutation benchmarking needs a dedicated seeded database and a separate, reviewed cleanup design. This suite creates no persistent test data and requires no database cleanup.

## Install k6

Use [official releases](https://github.com/grafana/k6/releases/tag/v1.6.0) and verify the archive against `k6-v1.6.0-checksums.txt`. These instructions pin the tested release; package managers may install a newer incompatible version.

Windows PowerShell (portable, no administrator install):

```powershell
$version = '1.6.0'
$release = "https://github.com/grafana/k6/releases/download/v$version"
New-Item -ItemType Directory -Force .temp/k6 | Out-Null
Invoke-WebRequest "$release/k6-v$version-windows-amd64.zip" -OutFile .temp/k6/k6.zip
Invoke-WebRequest "$release/k6-v$version-checksums.txt" -OutFile .temp/k6/checksums.txt
$actual = (Get-FileHash .temp/k6/k6.zip -Algorithm SHA256).Hash.ToLowerInvariant()
$expected = ((Select-String -Path .temp/k6/checksums.txt -Pattern ' k6-v1\.6\.0-windows-amd64\.zip$').Line -split '\s+')[0]
if ($actual -ne $expected) { throw 'k6 checksum mismatch' }
Expand-Archive .temp/k6/k6.zip -DestinationPath .temp/k6 -Force
$env:K6_BINARY = (Resolve-Path .temp/k6/k6-v1.6.0-windows-amd64/k6.exe).Path
& $env:K6_BINARY version
```

Linux x86-64 (use `linux-arm64` instead on ARM):

```bash
mkdir -p .temp/k6
cd .temp/k6
release=https://github.com/grafana/k6/releases/download/v1.6.0
curl -fL "$release/k6-v1.6.0-linux-amd64.tar.gz" -o k6-v1.6.0-linux-amd64.tar.gz
curl -fL "$release/k6-v1.6.0-checksums.txt" -o checksums.txt
sha256sum --check --ignore-missing checksums.txt
tar -xzf k6-v1.6.0-linux-amd64.tar.gz
cd ../..
export K6_BINARY="$PWD/.temp/k6/k6-v1.6.0-linux-amd64/k6"
"$K6_BINARY" version
```

See [Grafana's installation documentation](https://grafana.com/docs/k6/latest/set-up/install-k6/) for system installation alternatives. Keep a portable pinned binary via `K6_BINARY` if your system k6 differs.

## Run locally without external traffic

```bash
npm ci
npm run test:load:check
npm run test:load:smoke
npm run test:load:normal
npm run test:load:stress
npm run test:load:spike
```

Only run the larger profiles when you intend to apply that traffic. They are never chained to `npm test`, app startup, or automatic CI. No load test was automatically run against production during implementation.

By default the runner starts a **test-only Vite SSR harness on `http://127.0.0.1:5100`**, waits for its fixture header and health response, and stops it after k6 exits. An occupied port fails rather than reusing an unknown app. Application `.env` files are not needed; the harness overrides service credentials before Vite loads configuration.

The harness substitutes dependency modules through a Vite plugin in `fixture-server.mjs`: synthetic Supabase validation, read-only storage/database adapters, and a synthetic recommendation connector. The real TMDB service uses its existing request-injection seam and a shared fixture instance, retaining cache/coalescing/throttle behavior with 5 ms synthetic cache-miss latency. Unexpected Axios/fetch upstream calls fail closed. Non-GET/HEAD harness requests are rejected. The plugin is never referenced by application source or production builds and does not disable application security.

Ten requests compile page types and warm part of the catalog cache before measurement; this is recorded in `run.json`. These runs assess scripts, response contracts and **development SSR with synthetic upstreams**. They cannot establish production throughput or database/provider capacity. For deployment measurements use a dedicated staging build, synthetic accounts, isolated upstreams and realistic fixtures/latencies. The in-process harness is not a standalone network mock service for remote staging.

### Presets and realistic visits

| Profile | Default traffic                                                                 | Duration                                                             |
| ------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| smoke   | 2 VUs, one full visit each; configurable 1–5                                    | Complete coverage, maximum 180 seconds plus 15 seconds graceful stop |
| normal  | Ramp 0 → 5 → 25 → 50, hold 50, ramp down                                        | 9 minutes                                                            |
| stress  | Ramp 0 → 20 → 50 → 100 → 200, hold 200, ramp down                               | 10 minutes                                                           |
| spike   | Ramp to 20, baseline, jump to 200 in 5s, hold, return to 20, recover, ramp down | 4m40s                                                                |

These are initial **presets**, not capacity claims. All profiles start each VU with complete enabled coverage. Later visits approximately mix home (20%), browse (20%), search (20%), details (15%), filters (10%), authenticated reads (10%) and AI (5%). Disabled auth/AI weight falls back to home. Think time defaults to a variable 1–4 seconds between actions. Representative IDs/queries in `config/data.js` deliberately bound the cache working set. Change them to match your catalog before drawing workload conclusions; more unique searches can dramatically change upstream demand.

Concurrency uses k6's closed VU model: slower responses reduce arrivals. It measures concurrent visits, not a fixed RPS capacity. Each request disables redirects and automatic retries. 429 responses fail a threshold, record `rate_limited`, and pause according to Retry-After (bounded to 300s). Other errors are recorded without retry amplification. Live staging rate limits remain enabled.

## Local application or staging

Against your own running application (PowerShell):

```powershell
$env:PERF_TARGET = 'local'
$env:PERF_BASE_URL = 'http://127.0.0.1:5000'
$env:PERF_EXTERNAL_SERVICES = 'approved' # Smoke only: explicitly review upstream quotas first
npm run test:load:smoke
```

Against a remote staging deployment (Bash):

```bash
PERF_TARGET=staging \
PERF_BASE_URL=https://your-staging.example.com \
PERF_EXTERNAL_SERVICES=approved \
npm run test:load:smoke
```

Use an actual healthy catalog configuration for staging: an unavailable page must fail. Auth/AI are disabled by default outside fixtures. `approved` acknowledges bounded smoke traffic to live services after quota review; it does not assert the services are mocked.

**Every non-fixture normal/stress/spike run, and any enabled AI run, requires** `PERF_EXTERNAL_SERVICES=isolated` and `PERF_ISOLATION_CONFIRMED=true`. Provision a dedicated deployment whose TMDB, recommendation, authentication and database traffic is isolated from shared/paid production services. Merely setting these variables does not create mocks. The remote runner cannot verify that configuration; it records the declaration. If isolation is unavailable, use the supplied fixture harness for high volume.

Remote targets require HTTPS; origins cannot contain credentials, paths or query strings. Local/fixture targets require a loopback hostname. The known production domain cannot be labeled staging. Other production aliases must be honestly labeled by the operator; production classification cannot be inferred for every hostname.

Production always requires `PERF_TARGET=production` and `PERF_ALLOW_PRODUCTION=true`; any production profile beyond smoke also requires `PERF_ALLOW_PRODUCTION_LOAD=true`, **in addition to isolation requirements**. No workflow sets these production opt-ins. Redirects, including login/protection redirects, fail preflight rather than forwarding traffic to another origin.

### Authentication sessions

Create disposable synthetic accounts through your normal staging provisioning process. Supply **one distinct, pre-provisioned Supabase access token per peak VU** in `PERF_TOKENS_JSON` and set `PERF_INCLUDE_AUTH=true`. Set it through your secret manager or CI secret, not source files or pasted shell history. Use tokens valid for the entire run; k6 retains the same token for that VU and never silently refreshes or repeats password grants. Expiry/unauthorized responses fail checks. No real user accounts, service-role tokens, refresh tokens, or admin credentials belong in this variable. The fixture mode generates inert `perf-vu-N` tokens automatically.

Set `PERF_INCLUDE_AI=true` to enable recommendation journeys after isolation is in place. This requires authentication too. Fixture mode enables both by default. Backend token validation is exercised; password/OAuth login latency belongs to the external auth provider and is deliberately excluded to avoid email/auth quota side effects. Revoke/delete the synthetic staging accounts with your ordinary provisioning tooling when finished. No application rows are mutated by this suite.

## Configuration

`PERF_*` variables configure the suite. The npm command chooses the profile. The runner discards inherited `K6_*` options so ambient k6 flags cannot replace the reviewed VU stages or disable thresholds. `K6_BINARY` is the executable path, not a shell command. There are no dependencies downloaded by the k6 scripts.

| Variable                               | Default / meaning                                                         |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `PERF_TARGET`                          | `fixture`; also `local`, `staging`, `production`                          |
| `PERF_BASE_URL`                        | `http://127.0.0.1:5100`; an origin only                                   |
| `PERF_VUS`                             | 2 / 50 / 200 / 200 by profile; integer 1–5 for smoke, 1–2000 otherwise    |
| `PERF_TIME_SCALE`                      | 1; scales all normal/stress/spike stage durations (minimum each stage 1s) |
| `PERF_SMOKE_MAX_SECONDS`               | 180; maximum complete-coverage smoke runtime, 15–3600                     |
| `PERF_THINK_MIN`, `PERF_THINK_MAX`     | 1, 4 seconds; minimum cannot exceed maximum                               |
| `PERF_REQUEST_TIMEOUT_SECONDS`         | 15; range 1–120                                                           |
| `PERF_P95_MS`, `PERF_P99_MS`           | 1500, 3000 ms; global and per-endpoint p95, global p99                    |
| `PERF_ERROR_RATE`                      | 0.01; maximum unexpected HTTP status rate globally and per endpoint       |
| `PERF_CHECK_RATE`                      | 0.99; minimum content/status check success rate                           |
| `PERF_RECOVERY_P95_MS`                 | 1500; absolute post-spike recovery p95 threshold                          |
| `PERF_INCLUDE_AUTH`, `PERF_INCLUDE_AI` | `true` for fixtures, `false` elsewhere                                    |
| `PERF_TOKENS_JSON`                     | Secret JSON array of synthetic access tokens; at least peak VU count      |
| `PERF_EXTERNAL_SERVICES`               | Required outside fixtures: `approved` or `isolated`                       |
| `PERF_ISOLATION_CONFIRMED`             | Explicit `true` for isolated high-volume/AI runs                          |
| `PERF_ALLOW_PRODUCTION`                | Explicit `true` for any production run                                    |
| `PERF_ALLOW_PRODUCTION_LOAD`           | Additional explicit `true` for production normal/stress/spike             |
| `PERF_BASELINE`                        | Path to a previous `report.json` for comparison                           |
| `K6_BINARY`                            | `k6` on PATH; alternatively an absolute portable executable path          |

The launcher assigns a unique timestamped results directory. `PERF_RESULTS_DIR` is internal to k6; use the npm runner to create it. `PERF_FIXTURE_PORT` is internal to the harness and derived from the base URL.

To run a shorter, gentler local ramp before increasing load:

```powershell
$env:PERF_TARGET = 'fixture'
$env:PERF_BASE_URL = 'http://127.0.0.1:5100'
$env:PERF_VUS = '5'
$env:PERF_TIME_SCALE = '0.1'
npm run test:load:normal
```

Start with smoke, increase peak VUs in small steps, inspect errors/pool waits/upstream quotas, then extend sustained duration. Keep the generator machine healthy and record its hardware. Do not relax limits or rate limiting just to obtain a pass. Set thresholds against an agreed staging baseline/SLO and document changes. Short runs may not produce enough samples for reliable p99 or capture the full spike recovery; `recovery_requests>0` prevents a missing recovery window from passing.

## Reports and interpretation

Each run writes ignored files under `tests/performance/results/<UTC timestamp>-<profile>/`:

- `run.json`: profile, target, UTC interval, Git commit, stages, service mode, threshold settings and k6 exit code; no session tokens.
- `summary.json`: native k6 aggregate metrics, averages, p90/p95/p99 and threshold outcomes via [`handleSummary`](https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/).
- `samples.jsonl`: [k6 time-series JSON](https://grafana.com/docs/k6/latest/results-output/real-time/json/), used for endpoint, phase, VU and traffic-window analysis. Endpoint names are bounded; URL/query tags are excluded. Review artifacts before sharing; paths, hostnames and timing data can still be operationally sensitive.
- `report.json`: normalized metrics, slowest endpoints, error/check failures, failed thresholds, cache-response counts, baseline comparisons and observations separated from hypotheses.
- `report.html`: self-contained readable report with endpoint rankings, overall throughput, failed checks/thresholds, 10-second traffic/latency/VU windows and spike baseline/recovery comparisons. Open directly in any browser; no server or network access needed.
- `fixture-startup.log`: fixture startup diagnostics when the harness is used.

Endpoint/phase/window quantiles use 1ms histogram buckets to keep raw-stream processing bounded; global quantiles come from k6. RPS is measured, not assumed from VU count. Reports include both request throughput and received bytes/second; built-in `data_sent`/`data_received` include preflight. Expected auth 401 responses are successful boundaries; unexpected 401/429/5xx and malformed content fail checks. Smoke also requires all enabled endpoint groups to receive requests and every VU to complete its visit.

The runner preserves k6's nonzero exit code (including threshold failures) after generating reports. Setup failures may leave only partial artifacts; a missing summary is marked incomplete rather than passed. Rebuild a report from retained data or compare a baseline:

```bash
npm run test:load:report -- tests/performance/results/<run-directory>
npm run test:load:report -- tests/performance/results/<current> tests/performance/results/<previous>/report.json
```

Alternatively set `PERF_BASELINE` before the next run. Comparisons only calculate endpoint deltas when target, stages, peak VUs, think times, auth/AI inclusion and service mode match. Hardware, deployments, cache warmth, catalog distributions and data volume still need human review; these differences cannot all be inferred from reports. A measured slow endpoint is a finding. A suspected SSR cost, pool bottleneck or upstream fan-out is an investigation hypothesis until confirmed.

### Infrastructure correlation

Use `run.json` UTC timestamps and commit to select the same interval in existing Node/Vercel/host monitoring, Supabase auth metrics, PostgreSQL/Neon metrics and Python logs. Capture server CPU/RSS, event-loop delay, pool active/idle/waiting counts, query latency, connections, upstream calls, cache statuses and 429s **where those metrics are actually available**. The five-connection pool and recommendation fan-out are concrete inspection findings, not measured bottlenecks. Vercel cold starts and multiple independent caches need separate deployment observations. k6's VU count/RPS cannot establish database connection usage or backend CPU.

Likely investigation sequence after an adequately sampled staging run: inspect the slowest endpoint alongside server traces, compare cached versus cold catalog traffic, check whether auth validation or pool waits dominate authenticated reads, and profile recommendation fallback work. Optimize only after the measurements identify the cost; preserve quotas and security.

## GitHub Actions

`.github/workflows/performance.yml` runs fixture smoke on PRs and main/develop pushes with pinned k6, release checksum verification and Node 24. It needs no application credentials and creates only local synthetic traffic. The `performance-fixture` GitHub environment has no required secrets; avoid adding deployment approval gates to that local CI environment. Reports upload even when thresholds fail, with 14-day retention. Threshold failures fail the job.

For optional **manual-only staging smoke**, create/protect the `performance-staging` GitHub environment. Set `PERF_BASE_URL` and `PERF_EXTERNAL_SERVICES` variables; optionally set the other staging variables named in the workflow. Store `PERF_TOKENS_JSON` as an environment secret when auth is enabled. Enable the workflow dispatch `staging` input. An unset URL fails before traffic. Preview deployment protection must allow the test runner through an approved mechanism; do not weaken security or follow redirects to production.

No workflow path runs normal/stress/spike or enables production targeting. GitHub workflow execution itself requires a push/PR and was not claimed as locally executed. Existing `npm test`, `npm run check`, formatting, build and browser tests retain their established responsibilities.
