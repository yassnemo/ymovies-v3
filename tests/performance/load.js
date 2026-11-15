import http from 'k6/http';
import { config, pause } from './utils/client.js';
import { endpoints } from './config/data.js';
import { allJourneys, mixedJourney } from './scenarios/journeys.js';

const thresholds = {
  http_req_duration: [`p(95)<${config.p95}`, `p(99)<${config.p99}`],
  http_req_failed: [`rate<=${config.errorRate}`],
  checks: [`rate>=${config.checkRate}`],
  journey_requests: ['count>0'],
  rate_limited: ['count==0']
};
if (config.profile === 'smoke')
  thresholds.iterations = [`count==${config.maxVus}`];
for (const endpoint of endpoints) {
  if (endpoint.startsWith('ai-') && !config.includeAI) continue;
  if (
    [
      'auth-user',
      'preferences',
      'watchlist',
      'watchlist-check',
      'history'
    ].includes(endpoint) &&
    !config.includeAuth
  )
    continue;
  thresholds[`endpoint_latency{endpoint:${endpoint}}`] = [
    `p(95)<${config.p95}`
  ];
  thresholds[`endpoint_errors{endpoint:${endpoint}}`] = [
    `rate<=${config.errorRate}`
  ];
  if (config.profile === 'smoke')
    thresholds[`journey_requests{endpoint:${endpoint}}`] = ['count>0'];
}
if (config.profile === 'spike') {
  thresholds.recovery_latency = [`p(95)<${config.recoveryP95}`];
  thresholds.recovery_errors = [`rate<=${config.errorRate}`];
  thresholds.recovery_requests = ['count>0'];
}

export const options = {
  scenarios: {
    visitors:
      config.profile === 'smoke'
        ? {
            executor: 'per-vu-iterations',
            vus: config.maxVus,
            iterations: 1,
            maxDuration: `${config.smokeMaxSeconds}s`,
            gracefulStop: '15s'
          }
        : {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: config.stages,
            gracefulRampDown: '15s',
            gracefulStop: '15s'
          }
  },
  thresholds,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  // Avoid recording URLs (queries) or tokens in artifacts. Names are bounded endpoint labels.
  systemTags: [
    'status',
    'method',
    'name',
    'scenario',
    'expected_response',
    'check'
  ],
  tags: { profile: config.profile, target: config.target },
  setupTimeout: '30s',
  userAgent: 'YMovies-k6-performance/1.0',
  insecureSkipTLSVerify: false
};

export function setup() {
  const response = http.get(config.baseUrl + '/api/health', {
    redirects: 0,
    timeout: config.timeout,
    tags: { name: 'preflight' }
  });
  if (response.status !== 200 || response.json('status') !== 'healthy')
    throw new Error('Target health preflight failed');
  if (
    config.target === 'fixture' &&
    response.headers['X-Ymovies-Performance-Fixture'] !== 'isolated-v1'
  )
    throw new Error('Target is not the isolated fixture harness');
}
export default function () {
  // The first visit of every VU guarantees coverage instead of relying on random sampling.
  if (__ITER === 0) allJourneys();
  else mixedJourney();
  pause();
}
export function handleSummary(data) {
  return {
    [`${config.output}/summary.json`]: JSON.stringify(data, null, 2),
    stdout: `\nYMovies ${config.profile}: reports in ${config.output}\n`
  };
}
