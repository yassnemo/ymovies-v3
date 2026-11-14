import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios, { AxiosError } from 'axios';
import { RecommendationConnector } from '../server/services/recommendation-connector.ts';

const warnings: unknown[][] = [];
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  warnings.push(args);
};

try {
  await test('connector stays disabled without explicit URL and token', async () => {
    for (const [url, token] of [
      ['', ''],
      ['https://service.example', ''],
      ['', 'fake-token']
    ]) {
      const connector = new RecommendationConnector(
        url,
        'fake-tmdb-key',
        token
      ) as any;
      assert.equal(connector.service, null);
      assert.equal(await connector.isAvailable(), false);
      assert.deepEqual(await connector.getSimilarMovies(1), []);
    }
  });
  await test('connector rejects insecure remote URLs and credentials in URLs', () => {
    for (const url of [
      'http://service.example',
      'https://user:password@service.example',
      'https://service.example?token=x',
      'https://service.example#token',
      'file:///tmp/service'
    ]) {
      assert.equal(
        (new RecommendationConnector(url, 'fake-key', 'fake-token') as any)
          .service,
        null
      );
    }
    for (const url of [
      'http://localhost:5001',
      'http://127.0.0.1:5001',
      'http://[::1]:5001',
      'https://service.example'
    ]) {
      const connector = new RecommendationConnector(
        url,
        'fake-key',
        'fake-token'
      ) as any;
      assert.ok(connector.service);
      assert.equal(connector.service.defaults.maxRedirects, 0);
      assert.equal(
        connector.service.defaults.headers.Authorization,
        'Bearer fake-token'
      );
    }
  });
  await test('personalization sends only capped IDs, ratings and genres', async () => {
    const connector = new RecommendationConnector(
      'https://service.example',
      'fake-key',
      'fake-token'
    ) as any;
    let payload: any;
    connector.service.defaults.adapter = async (config: any) => {
      payload = JSON.parse(config.data);
      assert.equal(config.headers.get('Authorization'), 'Bearer fake-token');
      assert.equal(config.maxRedirects, 0);
      return {
        config,
        status: 200,
        statusText: 'OK',
        headers: {},
        data: { recommendation_categories: [{ movies: [{ id: 2 }] }] }
      };
    };
    await connector.getPersonalizedRecommendations({
      userId: 'must-not-leave-server',
      watched_ids: Array.from({ length: 25 }, (_, i) => i + 1),
      liked_genres: [28, 0, -1],
      rated_movies: [
        { id: 1, rating: 4, genre_ids: [28, 0], private_history: 'omit' },
        { id: 2, rating: 9 }
      ]
    });
    assert.deepEqual(Object.keys(payload).sort(), [
      'liked_genres',
      'rated_movies',
      'watched_ids'
    ]);
    assert.equal(payload.watched_ids.length, 20);
    assert.deepEqual(payload.liked_genres, [28]);
    assert.deepEqual(payload.rated_movies, [
      { id: 1, rating: 4, genre_ids: [28] }
    ]);
  });
  await test('successful results obey cache count, TTL and LRU bounds', async () => {
    const connector = new RecommendationConnector(
      'https://service.example',
      'fake-key',
      'fake-token'
    ) as any;
    connector.maxCacheEntries = 2;
    let calls = 0;
    connector.service.defaults.adapter = async (config: any) => {
      calls++;
      return {
        config,
        status: 200,
        statusText: 'OK',
        headers: {},
        data: [{ id: calls }]
      };
    };
    await connector.getSimilarMovies(1);
    await connector.getSimilarMovies(2);
    await connector.getSimilarMovies(1);
    assert.equal(calls, 2);
    await connector.getSimilarMovies(3);
    assert.equal(connector.cache.size, 2);
    assert.ok(!connector.cache.has('movie:2:10'));
    for (const entry of connector.cache.values()) entry.expiresAt = 0;
    await connector.getSimilarMovies(4);
    assert.equal(connector.cache.size, 1);
    assert.ok(connector.cacheBytes <= connector.maxCacheBytes);
    assert.deepEqual(await connector.getSimilarMovies(0), []);
  });
  await test('failed requests are not cached or logged with private request data', async () => {
    const connector = new RecommendationConnector(
      'https://service.example',
      'fake-key',
      'fake-token'
    ) as any;
    let calls = 0;
    connector.service.defaults.adapter = async (config: any) => {
      calls++;
      const error = new AxiosError(
        'private-error-message',
        'ERR_BAD_RESPONSE',
        { ...config, data: 'private-body' }
      );
      error.response = { status: 503 } as any;
      throw error;
    };
    await connector.getSimilarMovies(1);
    await connector.getSimilarMovies(1);
    assert.equal(calls, 2);
    assert.equal(connector.cache.size, 0);
    const output = JSON.stringify(warnings);
    assert.ok(!output.includes('private-error-message'));
    assert.ok(!output.includes('private-body'));
    assert.ok(!output.includes('fake-token'));
    assert.ok(!output.includes('service.example'));
  });
} finally {
  console.warn = originalWarn;
}
