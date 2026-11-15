import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createConfig, K6_VERSION } from './config/settings.js';
import { generateReport } from './utils/report.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
process.chdir(root);
let fixture;
let active;
let resultsDirectory;
let fixtureLog = '';
const stop = () => {
  active?.kill();
  fixture?.kill();
};
process.once('SIGINT', () => {
  stop();
  process.exitCode = 130;
});
process.once('SIGTERM', () => {
  stop();
  process.exitCode = 143;
});

try {
  if (process.argv.length > 3)
    throw new Error(
      'Only one profile argument is supported; configure load using PERF_* variables'
    );
  const env = {
    ...process.env,
    PERF_PROFILE: process.argv[2] || process.env.PERF_PROFILE || 'smoke'
  };
  const config = createConfig(env); // Validate before starting any server or sending requests.
  const binary = process.env.K6_BINARY || 'k6';
  const version = spawnSync(binary, ['version'], {
    encoding: 'utf8',
    shell: false
  });
  if (version.error)
    throw new Error(
      `k6 not found. Install Grafana k6 ${K6_VERSION}, or set K6_BINARY to its executable path.`
    );
  if (
    !new RegExp(`\\bv${K6_VERSION.replaceAll('.', '\\.')}\\b`).test(
      version.stdout
    )
  )
    throw new Error(
      `This suite pins k6 ${K6_VERSION}; found an incompatible version. See tests/performance/README.md.`
    );
  // k6 CLI environment options could silently override the reviewed script options.
  for (const key of Object.keys(env))
    if (key.startsWith('K6_') && key !== 'K6_BINARY') delete env[key];
  env.K6_NO_USAGE_REPORT = 'true';
  const directory = resolve(
    root,
    'tests/performance/results',
    `${new Date().toISOString().replaceAll(':', '-')}-${config.profile}`
  );
  await mkdir(directory, { recursive: true });
  resultsDirectory = directory;
  env.PERF_RESULTS_DIR = directory.replaceAll('\\', '/');
  const metadata = {
    launcherStartedAt: new Date().toISOString(),
    profile: config.profile,
    target: config.target,
    baseUrl: config.baseUrl,
    k6Version: K6_VERSION,
    gitDirty: !!spawnSync('git', ['status', '--porcelain'], {
      encoding: 'utf8'
    }).stdout?.trim(),
    maxVus: config.maxVus,
    executor: config.profile === 'smoke' ? 'per-vu-iterations' : 'ramping-vus',
    smokeMaxSeconds: config.smokeMaxSeconds,
    stages: config.stages,
    includeAuth: config.includeAuth,
    includeAI: config.includeAI,
    thinkSeconds: [config.thinkMin, config.thinkMax],
    thresholds: {
      p95: config.p95,
      p99: config.p99,
      errorRate: config.errorRate,
      checkRate: config.checkRate,
      recoveryP95: config.recoveryP95
    },
    externalServices:
      config.target === 'fixture'
        ? 'synthetic in-process adapters'
        : env.PERF_EXTERNAL_SERVICES,
    gitCommit: spawnSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8'
    }).stdout?.trim()
  };
  if (config.target === 'fixture') {
    const origin = new URL(config.baseUrl);
    if (origin.hostname !== '127.0.0.1' || origin.protocol !== 'http:')
      throw new Error(
        'Managed fixture target must use http://127.0.0.1:<port>'
      );
    // Refuse occupied ports rather than accidentally testing a different running app.
    const net = await import('node:net');
    await new Promise((done, reject) => {
      const probe = net.createServer();
      probe.once('error', reject);
      probe.listen(Number(origin.port || 80), '127.0.0.1', () =>
        probe.close(done)
      );
    });
    fixture = spawn(
      process.execPath,
      ['tests/performance/fixture-server.mjs'],
      {
        cwd: root,
        env: { ...env, PERF_FIXTURE_PORT: origin.port || '80' },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    fixture.stdout.on('data', (chunk) => {
      fixtureLog += chunk;
    });
    fixture.stderr.on('data', (chunk) => {
      fixtureLog += chunk;
    });
    const deadline = Date.now() + 90000;
    let ready = false;
    while (Date.now() < deadline && fixture.exitCode === null) {
      try {
        const response = await fetch(config.baseUrl + '/api/health', {
          redirect: 'manual',
          signal: AbortSignal.timeout(2000)
        });
        if (
          response.status === 200 &&
          response.headers.get('x-ymovies-performance-fixture') ===
            'isolated-v1'
        ) {
          ready = true;
          break;
        }
      } catch {
        /* wait for Vite */
      }
      await new Promise((done) => setTimeout(done, 500));
    }
    await writeFile(resolve(directory, 'fixture-startup.log'), fixtureLog);
    if (!ready)
      throw new Error(
        `Fixture harness did not start; inspect ${directory}/fixture-startup.log`
      );
    // Compile the SSR page types outside the measured interval. This also warms a small
    // catalog working set; record it rather than presenting the run as a cold-cache test.
    for (const path of [
      '/',
      '/movies',
      '/tv',
      '/search?q=Matrix',
      '/movie/550',
      '/tv/1396',
      '/signin',
      '/genre/movie/action',
      '/provider/8',
      '/api/recommendations/personalized'
    ]) {
      const response = await fetch(config.baseUrl + path, {
        redirect: 'manual',
        headers: { Authorization: 'Bearer perf-vu-1' },
        signal: AbortSignal.timeout(30000)
      });
      await response.arrayBuffer();
      if (response.status !== 200)
        throw new Error(`Fixture compilation warmup failed at ${path}`);
      await new Promise((done) => setTimeout(done, 250));
    }
    metadata.warmup =
      '10 fixture SSR/API requests before measurement; compiled page templates and partially warm catalog caches';
    fixture.on('exit', () => {
      if (active && active.exitCode === null) active.kill();
    });
    console.log(
      'Using isolated fixture dependencies. Results measure development SSR, not production capacity.'
    );
  }
  console.log(
    `Running ${config.profile}: peak ${config.maxVus} VUs against ${config.baseUrl}`
  );
  metadata.startedAt = new Date().toISOString();
  await writeFile(
    resolve(directory, 'run.json'),
    JSON.stringify(metadata, null, 2)
  );
  active = spawn(
    binary,
    [
      'run',
      '--out',
      `json=${env.PERF_RESULTS_DIR}/samples.jsonl`,
      'tests/performance/load.js'
    ],
    { cwd: root, env, stdio: 'inherit', shell: false }
  );
  const exitCode = await new Promise((done, reject) => {
    active.once('error', reject);
    active.once('exit', (code) => done(code ?? 1));
  });
  active = undefined;
  metadata.finishedAt = new Date().toISOString();
  metadata.exitCode = exitCode;
  await writeFile(
    resolve(directory, 'run.json'),
    JSON.stringify(metadata, null, 2)
  );
  let baseline;
  if (env.PERF_BASELINE)
    baseline = JSON.parse(await readFile(resolve(env.PERF_BASELINE), 'utf8'));
  const report = await generateReport(directory, baseline);
  console.log(
    `${report.passed ? 'PASS' : 'FAIL / INCOMPLETE'}: ${report.requests} requests, ${report.requestsPerSecond.toFixed(2)} requests/s, ${report.errors} HTTP errors, ${report.failedThresholds.length} failed thresholds, ${report.failedChecks.length} failed check groups`
  );
  console.log(`Reports: ${directory}/report.html and report.json`);
  process.exitCode = exitCode || (report.passed ? 0 : 1);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  stop();
  if (fixture && resultsDirectory)
    await writeFile(
      resolve(resultsDirectory, 'fixture-startup.log'),
      fixtureLog
    );
}
