// Pure JavaScript shared by Node validation and k6. Never read application .env files.
export const K6_VERSION = '1.6.0';

function number(env, key, fallback, min, max, integer = false) {
  const value = Number(env[key] ?? fallback);
  if (
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new Error(
      `${key} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}`
    );
  return value;
}

export function createConfig(env = {}) {
  for (const name of [
    'PERF_INCLUDE_AUTH',
    'PERF_INCLUDE_AI',
    'PERF_ISOLATION_CONFIRMED',
    'PERF_ALLOW_PRODUCTION',
    'PERF_ALLOW_PRODUCTION_LOAD'
  ]) {
    if (env[name] && !['true', 'false'].includes(env[name]))
      throw new Error(`${name} must be true or false`);
  }
  const profile = env.PERF_PROFILE || 'smoke';
  if (!['smoke', 'normal', 'stress', 'spike'].includes(profile))
    throw new Error('Unknown PERF_PROFILE');
  const target = env.PERF_TARGET || 'fixture';
  if (!['fixture', 'local', 'staging', 'production'].includes(target))
    throw new Error('Unknown PERF_TARGET');
  const baseUrl = (env.PERF_BASE_URL || 'http://127.0.0.1:5100').replace(
    /\/$/,
    ''
  );
  // k6 1.x has no global URL implementation. Accept an origin only, with no credentials/query/path.
  const match = baseUrl.match(
    /^(https?):\/\/(\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::([0-9]+))?$/i
  );
  if (
    !match ||
    (match[3] && (Number(match[3]) < 1 || Number(match[3]) > 65535))
  )
    throw new Error(
      'PERF_BASE_URL must be an HTTP(S) origin without credentials or paths'
    );
  const host = match[2].toLowerCase().replace(/\.$/, '');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(host);
  if (['fixture', 'local'].includes(target) && !loopback)
    throw new Error('Local/fixture tests require a loopback host');
  const production =
    host === 'ymovies.yerradouani.me' ||
    host.endsWith('.ymovies.yerradouani.me');
  if (production && target !== 'production')
    throw new Error(
      'The known production host requires PERF_TARGET=production'
    );
  if (!loopback && match[1].toLowerCase() !== 'https')
    throw new Error('Remote targets require HTTPS');
  if (target === 'production' && env.PERF_ALLOW_PRODUCTION !== 'true')
    throw new Error('Production requires PERF_ALLOW_PRODUCTION=true');
  if (
    target === 'production' &&
    profile !== 'smoke' &&
    env.PERF_ALLOW_PRODUCTION_LOAD !== 'true'
  )
    throw new Error('Production load requires PERF_ALLOW_PRODUCTION_LOAD=true');
  if (target !== 'fixture') {
    if (!['approved', 'isolated'].includes(env.PERF_EXTERNAL_SERVICES))
      throw new Error(
        'Set PERF_EXTERNAL_SERVICES=approved (quota reviewed) or isolated'
      );
    if (
      (profile !== 'smoke' || env.PERF_INCLUDE_AI === 'true') &&
      (env.PERF_EXTERNAL_SERVICES !== 'isolated' ||
        env.PERF_ISOLATION_CONFIRMED !== 'true')
    )
      throw new Error(
        'High-volume/AI tests require isolated upstreams and PERF_ISOLATION_CONFIRMED=true'
      );
  }
  const maxVus = number(
    env,
    'PERF_VUS',
    { smoke: 2, normal: 50, stress: 200, spike: 200 }[profile],
    1,
    profile === 'smoke' ? 5 : 2000,
    true
  );
  const scale = number(env, 'PERF_TIME_SCALE', 1, 0.01, 100);
  const seconds = (value) => `${Math.max(1, Math.round(value * scale))}s`;
  const low = Math.max(1, Math.round(maxVus * 0.1));
  const definitions = {
    smoke: [],
    normal: [
      [60, low],
      [120, Math.round(maxVus / 2) || 1],
      [120, maxVus],
      [180, maxVus],
      [60, 0]
    ],
    stress: [
      [60, low],
      [120, Math.round(maxVus / 4) || 1],
      [120, Math.round(maxVus / 2) || 1],
      [120, maxVus],
      [120, maxVus],
      [60, 0]
    ],
    spike: [
      [30, low],
      [30, low],
      [5, maxVus],
      [60, maxVus],
      [5, low],
      [120, low],
      [30, 0]
    ]
  };
  const stages = definitions[profile].map(([duration, vus]) => ({
    duration: seconds(duration),
    target: vus
  }));
  const thinkMin = number(env, 'PERF_THINK_MIN', 1, 0, 60);
  const thinkMax = number(env, 'PERF_THINK_MAX', 4, thinkMin, 120);
  const includeAuth = env.PERF_INCLUDE_AUTH
    ? env.PERF_INCLUDE_AUTH === 'true'
    : target === 'fixture';
  const includeAI = env.PERF_INCLUDE_AI
    ? env.PERF_INCLUDE_AI === 'true'
    : target === 'fixture';
  let tokens = [];
  if (target === 'fixture')
    tokens = Array.from({ length: maxVus }, (_, i) => `perf-vu-${i + 1}`);
  else if (env.PERF_TOKENS_JSON) {
    try {
      tokens = JSON.parse(env.PERF_TOKENS_JSON);
    } catch {
      throw new Error('PERF_TOKENS_JSON must be a JSON array');
    }
  }
  if (
    !Array.isArray(tokens) ||
    tokens.some(
      (token) => typeof token !== 'string' || !token || /\s/.test(token)
    )
  )
    throw new Error('Invalid session tokens');
  if (includeAuth && tokens.length < maxVus)
    throw new Error(
      'Provide one pre-provisioned synthetic bearer token per peak VU'
    );
  if (includeAuth && new Set(tokens).size !== tokens.length)
    throw new Error('Synthetic session tokens must be distinct per VU');
  if (includeAI && !includeAuth)
    throw new Error('AI journeys require PERF_INCLUDE_AUTH=true');
  const phaseEnds = [];
  let elapsed = 0;
  for (const stage of stages) {
    elapsed += parseInt(stage.duration, 10);
    phaseEnds.push(elapsed);
  }
  return {
    profile,
    target,
    baseUrl,
    host,
    maxVus,
    stages,
    phaseEnds,
    thinkMin,
    thinkMax,
    includeAuth,
    includeAI,
    tokens,
    timeout: `${number(env, 'PERF_REQUEST_TIMEOUT_SECONDS', 15, 1, 120)}s`,
    smokeMaxSeconds: number(env, 'PERF_SMOKE_MAX_SECONDS', 180, 15, 3600, true),
    p95: number(env, 'PERF_P95_MS', 1500, 1, 120000),
    p99: number(env, 'PERF_P99_MS', 3000, 1, 120000),
    errorRate: number(env, 'PERF_ERROR_RATE', 0.01, 0, 1),
    checkRate: number(env, 'PERF_CHECK_RATE', 0.99, 0, 1),
    recoveryP95: number(env, 'PERF_RECOVERY_P95_MS', 1500, 1, 120000),
    output: env.PERF_RESULTS_DIR || 'tests/performance/results/manual'
  };
}

export function phaseAt(config, seconds) {
  if (config.profile !== 'spike') return 'load';
  if (seconds < config.phaseEnds[1]) return 'baseline';
  if (seconds < config.phaseEnds[3]) return 'spike';
  if (seconds < config.phaseEnds[4]) return 'cooldown';
  return 'recovery';
}
