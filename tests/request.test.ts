import assert from 'node:assert/strict';
import test from 'node:test';
import { readJson, RequestError } from '../src/server/request.ts';
import { preferencesSchema, progressSchema } from '../src/server/validation.ts';

function request(body: string, headers: Record<string, string> = {}) {
  return new Request('https://ymovies.yerradouani.me/api/preferences', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body
  });
}
const status = (expected: number) => (error: unknown) =>
  error instanceof RequestError && error.status === expected;

test('JSON limits apply even when Content-Length is missing or false', async () => {
  const body = JSON.stringify({ value: 'x'.repeat(1024 * 1024) });
  await assert.rejects(readJson(request(body)), status(413));
  await assert.rejects(
    readJson(request(body, { 'content-length': '1' })),
    status(413)
  );
});

test('JSON rejects invalid formats and prototype keys', async () => {
  for (const body of [
    'null',
    '[]',
    '{',
    '{"__proto__":{"polluted":true}}',
    '{"settings":{"constructor":{}}}'
  ]) {
    await assert.rejects(readJson(request(body)), status(400));
  }
  await assert.rejects(
    readJson(request('{}', { 'content-type': 'text/plain' })),
    status(415)
  );
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
});

test('deeply nested requests are rejected before recursive validation', async () => {
  const body = '{"nested":'.repeat(30) + '{}' + '}'.repeat(30);
  await assert.rejects(readJson(request(body)), status(400));
});

test('saved media and progress cannot create arbitrary routes or invalid IDs', () => {
  assert.equal(
    preferencesSchema.safeParse({
      watchlist: [{ id: 1, title: 'Test', media_type: '//example.com' }]
    }).success,
    false
  );
  assert.equal(
    progressSchema.safeParse({ movieId: true, watchProgress: 50 }).success,
    false
  );
  assert.equal(
    progressSchema.safeParse({ movieId: 2_147_483_648, watchProgress: 50 })
      .success,
    false
  );
  assert.equal(
    progressSchema.safeParse({
      movieId: 550,
      watchProgress: 50,
      watchDuration: 1e20
    }).success,
    false
  );
  assert.equal(
    progressSchema.safeParse({ movieId: '550', watchProgress: 50 }).success,
    true
  );
  assert.equal(
    preferencesSchema.safeParse({
      watchlist: [{ id: 550, title: 'Fight Club', media_type: 'movie' }]
    }).success,
    true
  );
});
