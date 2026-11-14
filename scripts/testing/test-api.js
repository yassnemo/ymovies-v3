#!/usr/bin/env node
import assert from 'node:assert/strict';
const origin = process.env.TEST_BASE_URL || 'http://localhost:5000';
for (const [path, status] of [
  ['/api/health', 200],
  ['/api/preferences', 401],
  ['/api/tmdb/account/123', 404],
  ['/movie/not-an-id', 404],
  ['/missing-page', 404]
]) {
  const response = await fetch(origin + path);
  assert.equal(response.status, status, path);
  console.log(status + ' ' + path);
}
console.log('SvelteKit API checks passed.');
