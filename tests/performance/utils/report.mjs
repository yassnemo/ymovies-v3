import { createReadStream } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ]
  );
const format = (value) => (Number.isFinite(value) ? value.toFixed(2) : 'n/a');
function distribution() {
  const bins = new Map();
  let count = 0,
    sum = 0,
    max = 0;
  return {
    add(value) {
      const bucket = Math.ceil(value);
      bins.set(bucket, (bins.get(bucket) || 0) + 1);
      count++;
      sum += value;
      max = Math.max(max, value);
    },
    result() {
      const sorted = [...bins].sort(([a], [b]) => a - b);
      const percentile = (fraction) => {
        let seen = 0;
        for (const [value, frequency] of sorted) {
          seen += frequency;
          if (seen >= count * fraction) return value;
        }
        return null;
      };
      return {
        count,
        avg: count ? sum / count : null,
        p90: percentile(0.9),
        p95: percentile(0.95),
        p99: percentile(0.99),
        max: count ? max : null
      };
    }
  };
}
const aggregate = () => ({
  latency: distribution(),
  requests: 0,
  errors: 0,
  checks: 0,
  failedChecks: 0,
  maxVus: 0
});
const finish = (entry) => ({
  ...entry.latency.result(),
  requests: entry.requests,
  errors: entry.errors,
  errorRate: entry.requests ? entry.errors / entry.requests : null,
  failedChecks: entry.failedChecks,
  checks: entry.checks,
  maxVus: entry.maxVus
});

export async function generateReport(directory, baseline) {
  const run = JSON.parse(
    await readFile(resolve(directory, 'run.json'), 'utf8')
  );
  let summary = null;
  try {
    summary = JSON.parse(
      await readFile(resolve(directory, 'summary.json'), 'utf8')
    );
  } catch {
    /* failed setup can omit summary */
  }
  const endpoints = new Map(),
    phases = new Map(),
    windows = new Map(),
    checks = new Map(),
    caches = {};
  const get = (map, key) => {
    if (!map.has(key)) map.set(key, aggregate());
    return map.get(key);
  };
  let first = Infinity,
    last = 0,
    maxVus = 0,
    received = 0,
    sent = 0;
  const lines = createInterface({
    input: createReadStream(resolve(directory, 'samples.jsonl')),
    crlfDelay: Infinity
  });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const point = JSON.parse(line);
    if (point.type !== 'Point') continue;
    const { value, tags = {}, time } = point.data;
    const timestamp = Date.parse(time);
    first = Math.min(first, timestamp);
    last = Math.max(last, timestamp);
    const window = get(windows, Math.floor(timestamp / 10000) * 10000);
    if (point.metric === 'vus') {
      maxVus = Math.max(maxVus, value);
      window.maxVus = Math.max(window.maxVus, value);
    }
    if (point.metric === 'data_received') received += value;
    if (point.metric === 'data_sent') sent += value;
    if (point.metric === 'catalog_cache')
      caches[tags.cache] = (caches[tags.cache] || 0) + value;
    if (!tags.endpoint) continue;
    const groups = [
      get(endpoints, tags.endpoint),
      get(phases, tags.phase || 'load'),
      window
    ];
    for (const entry of groups) {
      if (point.metric === 'endpoint_latency') entry.latency.add(value);
      if (point.metric === 'journey_requests') entry.requests += value;
      if (point.metric === 'endpoint_errors') entry.errors += value;
      if (point.metric === 'checks') {
        entry.checks++;
        if (!value) entry.failedChecks++;
      }
    }
    if (point.metric === 'checks' && !value)
      checks.set(tags.check, (checks.get(tags.check) || 0) + 1);
  }
  const duration = Number.isFinite(first)
    ? Math.max(0.001, (last - first) / 1000)
    : 0;
  const endpointResults = [...endpoints]
    .map(([endpoint, entry]) => ({ endpoint, ...finish(entry) }))
    .sort((a, b) => b.p95 - a.p95);
  const phaseResults = [...phases].map(([phase, entry]) => ({
    phase,
    ...finish(entry)
  }));
  const failures = [];
  for (const [metric, data] of Object.entries(summary?.metrics || {}))
    for (const [threshold, result] of Object.entries(data.thresholds || {}))
      if (!result.ok) failures.push({ metric, threshold });
  const totalRequests = endpointResults.reduce(
    (sum, item) => sum + item.requests,
    0
  );
  const totalErrors = endpointResults.reduce(
    (sum, item) => sum + item.errors,
    0
  );
  const observations = [];
  if (endpointResults[0])
    observations.push(
      `Slowest endpoint by p95: ${endpointResults[0].endpoint} (${format(endpointResults[0].p95)} ms, ${endpointResults[0].count} samples).`
    );
  if (totalErrors)
    observations.push(
      `${totalErrors} journey requests returned an unexpected status; inspect endpoint error rates and application logs.`
    );
  if (checks.size)
    observations.push(
      'Content/status checks failed. HTTP 200 alone does not establish that the catalog or recommendations worked.'
    );
  const limited = summary?.metrics?.rate_limited?.values?.count || 0;
  if (limited)
    observations.push(
      `${limited} HTTP 429 responses observed. Tests backed off without retrying; request quotas need investigation.`
    );
  const baselinePhase = phaseResults.find((item) => item.phase === 'baseline');
  const recovery = phaseResults.find((item) => item.phase === 'recovery');
  if (run.profile === 'spike')
    observations.push(
      recovery
        ? `Recovery p95 ${format(recovery.p95)} ms versus baseline ${format(baselinePhase?.p95)} ms. Different endpoint mixes and sample counts can affect this comparison.`
        : 'No recovery samples were captured; recovery is unverified.'
    );
  const comparisonKeys = [
    'k6Version',
    'warmup',
    'executor',
    'smokeMaxSeconds',
    'profile',
    'target',
    'baseUrl',
    'maxVus',
    'stages',
    'includeAuth',
    'includeAI',
    'thinkSeconds',
    'externalServices'
  ];
  const comparable =
    baseline &&
    comparisonKeys.every(
      (key) => JSON.stringify(baseline.run?.[key]) === JSON.stringify(run[key])
    );
  const comparison = !baseline
    ? null
    : !comparable
      ? {
          comparable: false,
          reason:
            'Workload/target configuration differs; no regression conclusion is supported.'
        }
      : {
          comparable: true,
          baselineStartedAt: baseline.run.startedAt,
          endpoints: endpointResults.map((item) => {
            const previous = baseline.endpoints?.find(
              (old) => old.endpoint === item.endpoint
            );
            return {
              endpoint: item.endpoint,
              p95DeltaMs:
                previous?.p95 == null ? null : item.p95 - previous.p95,
              errorRateDelta:
                previous?.errorRate == null
                  ? null
                  : item.errorRate - previous.errorRate
            };
          })
        };
  const report = {
    run,
    summaryAvailable: !!summary,
    passed:
      !!summary &&
      run.exitCode === 0 &&
      failures.length === 0 &&
      totalRequests > 0,
    durationSeconds: duration,
    requests: totalRequests,
    requestsPerSecond: duration ? totalRequests / duration : 0,
    errors: totalErrors,
    errorRate: totalRequests ? totalErrors / totalRequests : null,
    maxObservedVus: maxVus,
    receivedBytes: received,
    sentBytes: sent,
    throughputReceivedBytesPerSecond: duration ? received / duration : 0,
    latency: summary?.metrics?.http_req_duration?.values || null,
    failedThresholds: failures,
    failedChecks: [...checks].map(([name, count]) => ({ name, count })),
    endpoints: endpointResults,
    phases: phaseResults,
    cacheResponses: caches,
    timeline: [...windows]
      .sort(([a], [b]) => a - b)
      .map(([time, entry]) => ({
        time: new Date(time).toISOString(),
        seconds: Number.isFinite(first) ? (time - first) / 1000 : 0,
        ...finish(entry),
        requestsPerSecond:
          entry.requests /
          Math.max(
            0.001,
            (Math.min(time + 10000, last) - Math.max(time, first)) / 1000
          )
      })),
    observations,
    hypotheses: [
      'High page latency with fast catalog API responses may indicate SSR rendering or response-size costs; verify with server profiles.',
      'High authenticated-read latency may involve Supabase validation or the PostgreSQL pool; correlate with auth timings, pool waits and database telemetry.',
      'Cache misses, per-instance caches and recommendation fallback fan-out may amplify upstream traffic; confirm with X-TMDB-Cache and service logs.'
    ],
    comparison,
    limitations: [
      run.target === 'fixture'
        ? 'Synthetic upstreams and development Vite SSR: these measurements do not establish production, database, authentication-provider or Python-service capacity.'
        : 'External service isolation is operator-attested; the runner cannot verify a remote deployment configuration.',
      'HTTP protocol testing does not execute browser JavaScript, render pages, fetch artwork or measure Core Web Vitals.',
      'Endpoint/phase/timeline quantiles are estimated from 1 ms histogram buckets. Global quantiles come from k6.',
      'CPU, RAM, database connections and upstream request counts are not measured by these scripts. Correlate the UTC run interval with infrastructure telemetry.',
      'Closed-model VUs reduce request arrival rate as responses slow down; VUs are concurrent sessions, not a promised RPS.'
    ]
  };
  const table = (headers, rows) =>
    `<table><thead><tr>${headers.map((value) => `<th>${escape(value)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const list = (items) =>
    `<ul>${items.map((value) => `<li>${escape(value)}</li>`).join('')}</ul>`;
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>YMovies k6 ${escape(run.profile)}</title><style>body{font:16px system-ui;max-width:1200px;margin:40px auto;padding:0 24px;background:#fafafa;color:#18202a}table{border-collapse:collapse;width:100%;font-size:14px;margin:20px 0;display:block;overflow:auto}td,th{padding:9px 12px;border:1px solid #ddd;text-align:left;white-space:nowrap}th{background:#edf0f4}h2{margin-top:36px}.status{padding:16px;background:${report.passed ? '#dcfce7' : '#fee2e2'}}li{margin:8px 0}code{overflow-wrap:anywhere}</style><h1>YMovies k6: ${escape(run.profile)}</h1><p class="status">${report.passed ? 'PASS' : 'FAIL / INCOMPLETE'} · ${escape(run.target)} · ${escape(run.startedAt)}</p><p><code>${escape(run.baseUrl)}</code> · peak configured VUs ${run.maxVus}, observed ${maxVus} · exit code ${run.exitCode}</p><p>${totalRequests} journey requests · ${format(report.requestsPerSecond)} requests/s · ${format((report.errorRate || 0) * 100)}% unexpected HTTP statuses · ${format(received / 1024)} KiB received</p><h2>Measured findings</h2>${list(observations)}<h2>Latency (ms, global k6 metrics)</h2>${table(['Average', 'p90', 'p95', 'p99'], [[format(report.latency?.avg), format(report.latency?.['p(90)']), format(report.latency?.['p(95)']), format(report.latency?.['p(99)'])]])}<h2>Endpoints, slowest p95 first</h2>${table(
    [
      'Endpoint',
      'Requests',
      'Avg ms',
      'p90',
      'p95',
      'p99',
      'HTTP errors',
      'Failed checks'
    ],
    endpointResults.map((item) => [
      item.endpoint,
      item.requests,
      format(item.avg),
      format(item.p90),
      format(item.p95),
      format(item.p99),
      `${format(item.errorRate * 100)}%`,
      item.failedChecks
    ])
  )}<h2>Failed thresholds</h2>${
    failures.length
      ? table(
          ['Metric', 'Threshold'],
          failures.map((item) => [item.metric, item.threshold])
        )
      : `<p>${summary ? 'None recorded.' : 'Summary missing; thresholds unverified.'}</p>`
  }<h2>Failed checks</h2>${list([...checks].map(([name, count]) => `${name}: ${count}`))}<h2>Traffic and latency over time (UTC, 10-second windows)</h2><p>Edge windows use their observed duration for RPS. VUs are sampled by k6 and may miss very short peaks.</p>${table(
    ['Window', 'Max VUs', 'Requests/s', 'Avg ms', 'p95 ms', 'Errors'],
    report.timeline.map((item) => [
      item.time,
      item.maxVus,
      format(item.requestsPerSecond),
      format(item.avg),
      format(item.p95),
      item.errors
    ])
  )}<h2>Spike phases / recovery</h2>${table(
    ['Phase', 'Requests', 'p95 ms', 'HTTP errors'],
    phaseResults.map((item) => [
      item.phase,
      item.requests,
      format(item.p95),
      `${format(item.errorRate * 100)}%`
    ])
  )}<h2>Comparison</h2>${
    !comparison
      ? '<p>No baseline supplied. Set PERF_BASELINE to a previous report.json.</p>'
      : !comparison.comparable
        ? `<p>${escape(comparison.reason)}</p>`
        : table(
            ['Endpoint', 'p95 delta ms', 'Error-rate delta'],
            comparison.endpoints.map((item) => [
              item.endpoint,
              format(item.p95DeltaMs),
              format(item.errorRateDelta)
            ])
          )
  }<h2>Investigation ideas (hypotheses)</h2>${list(report.hypotheses)}<h2>Measurement limits</h2>${list(report.limitations)}<p>Machine-readable files: report.json, summary.json, run.json and samples.jsonl beside this report. No external scripts or paid reporting service required.</p></html>`;
  await writeFile(
    resolve(directory, 'report.json'),
    JSON.stringify(report, null, 2)
  );
  await writeFile(resolve(directory, 'report.html'), html);
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const directory = process.argv[2];
  if (!directory)
    throw new Error(
      'Usage: node tests/performance/utils/report.mjs <results-directory> [baseline-report.json]'
    );
  const baseline = process.argv[3]
    ? JSON.parse(await readFile(process.argv[3], 'utf8'))
    : undefined;
  await generateReport(resolve(directory), baseline);
}
