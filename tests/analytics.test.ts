import assert from 'node:assert/strict';
import test from 'node:test';
import { analyticsLocation } from '../src/lib/analytics.ts';

test('analytics URLs exclude authentication credentials and user input', () => {
  assert.equal(
    analyticsLocation(
      'https://ymovies.yerradouani.me/auth/callback?code=private-code#access_token=secret'
    ),
    'https://ymovies.yerradouani.me/auth/callback'
  );
  assert.equal(
    analyticsLocation(
      'https://ymovies.yerradouani.me/search?q=someone%40example.com'
    ),
    'https://ymovies.yerradouani.me/search'
  );
});

test('analytics rejects non-web and malformed URLs', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:text/plain,secret',
    '/relative',
    'not a URL'
  ]) {
    assert.equal(analyticsLocation(url), '');
  }
});
