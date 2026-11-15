import http from 'k6/http';
import { check, sleep } from 'k6';
import exec from 'k6/execution';
import { Counter, Rate, Trend } from 'k6/metrics';
import { createConfig, phaseAt } from '../config/settings.js';

export const config = createConfig(__ENV);
export const endpointLatency = new Trend('endpoint_latency', true);
export const endpointErrors = new Rate('endpoint_errors');
export const rateLimited = new Counter('rate_limited');
export const cacheResponses = new Counter('catalog_cache');
export const requests = new Counter('journey_requests');
export const recoveryLatency = new Trend('recovery_latency', true);
export const recoveryErrors = new Rate('recovery_errors');
export const recoveryRequests = new Counter('recovery_requests');
export const phaseLatency = new Trend('phase_latency', true);

export function pause() {
  sleep(config.thinkMin + Math.random() * (config.thinkMax - config.thinkMin));
}
export function sessionToken() {
  return config.tokens[exec.vu.idInTest - 1];
}

// No redirects, retries, external artwork, analytics, trailers, writes, or password grants.
export function get(path, endpoint, validate, { token, status = 200 } = {}) {
  const phase = phaseAt(config, exec.instance.currentTestRunDuration / 1000);
  const tags = { endpoint, phase, name: endpoint };
  const response = http.get(config.baseUrl + path, {
    redirects: 0,
    timeout: config.timeout,
    tags,
    headers: {
      Accept:
        endpoint.includes('page') ||
        [
          'home',
          'home-feed',
          'movies',
          'tv',
          'movie-detail',
          'tv-detail',
          'filter',
          'pagination',
          'signin'
        ].includes(endpoint)
          ? 'text/html'
          : 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    responseCallback: http.expectedStatuses(status)
  });
  let payload;
  try {
    payload = response.json();
  } catch {
    payload = null;
  }
  let valid = false;
  try {
    valid = !!validate(response, payload);
  } catch {
    /* invalid data is a failed check */
  }
  const statusOK = response.status === status;
  check(
    response,
    {
      [`${endpoint}: status ${status}`]: () => statusOK,
      [`${endpoint}: content`]: () => valid
    },
    tags
  );
  endpointLatency.add(response.timings.duration, tags);
  endpointErrors.add(!statusOK, tags);
  phaseLatency.add(response.timings.duration, tags);
  requests.add(1, tags);
  if (response.headers['X-Tmdb-Cache'])
    cacheResponses.add(1, { cache: response.headers['X-Tmdb-Cache'] });
  if (phase === 'recovery') {
    recoveryLatency.add(response.timings.duration);
    recoveryErrors.add(!statusOK || !valid);
    recoveryRequests.add(1);
  }
  if (response.status === 429) {
    rateLimited.add(1, tags);
    // Respect Retry-After; do not retry or hide the failed request.
    const value = response.headers['Retry-After'];
    const wait = /^\d+$/.test(value || '')
      ? Number(value)
      : (Date.parse(value) - Date.now()) / 1000;
    sleep(Number.isFinite(wait) ? Math.max(1, Math.min(300, wait)) : 5);
  }
  return { response, payload };
}

export const html =
  (catalog = false) =>
  (response) =>
    (response.headers['Content-Type'] || '').includes('text/html') &&
    response.body.includes('id="main"') &&
    (!catalog ||
      (/href="\/(movie|tv)\/\d+/.test(response.body) &&
        !response.body
          .toLowerCase()
          .includes('catalog is temporarily unavailable')));
export const results = (_, data) =>
  Array.isArray(data?.results) &&
  data.results.length > 0 &&
  Number.isInteger(data.results[0].id);
export const array = (_, data) => Array.isArray(data);
export const detail = (_, data) =>
  Number.isInteger(data?.id) && !!(data.title || data.name);
