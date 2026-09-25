import assert from "node:assert/strict";
import test from "node:test";
import {
  createTMDBCacheKey,
  TMDBService,
  TMDBServiceError,
} from "../server/services/tmdb";

test("cache keys normalize searches and query parameter order", () => {
  const first = createTMDBCacheKey("/search/movie", {
    query: "  DUNE   Part Two  ",
    page: "1",
    language: "en-US",
  });
  const second = createTMDBCacheKey("search/movie/", {
    language: "en-US",
    query: "dune part two",
    page: "1",
  });

  assert.equal(first, second);
});

test("the public gateway rejects account endpoints and session parameters", () => {
  assert.throws(
    () => createTMDBCacheKey("/account/123/favorite/movies"),
    (error: unknown) => error instanceof TMDBServiceError && error.statusCode === 404,
  );
  assert.throws(
    () => createTMDBCacheKey("/movie/popular", { session_id: "private" }),
    (error: unknown) => error instanceof TMDBServiceError && error.statusCode === 400,
  );
});

test("identical misses share one upstream request and subsequent reads hit cache", async () => {
  let upstreamCalls = 0;
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const service = new TMDBService("test-key", {
    request: async () => {
      upstreamCalls += 1;
      await gate;
      return { results: [{ id: 1, title: "Cached title" }] };
    },
  });

  const first = service.getPublicResource<{ results: Array<{ id: number }> }>("/trending/movie/week");
  const second = service.getPublicResource<{ results: Array<{ id: number }> }>("/trending/movie/week");
  await Promise.resolve();
  assert.equal(upstreamCalls, 1);
  release?.();

  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.deepEqual(new Set([firstResult.cacheStatus, secondResult.cacheStatus]), new Set(["MISS", "COALESCED"]));

  const cached = await service.getPublicResource("/trending/movie/week");
  assert.equal(cached.cacheStatus, "HIT");
  assert.equal(upstreamCalls, 1);
});

test("stale-while-revalidate serves immediately and refreshes in the background", async () => {
  let now = 0;
  let upstreamCalls = 0;
  const service = new TMDBService("test-key", {
    now: () => now,
    request: async () => ({ version: ++upstreamCalls }),
  });

  const initial = await service.getPublicResource<{ version: number }>("/search/movie", { query: "arrival" });
  assert.equal(initial.data.version, 1);

  now = 15 * 60 * 1000 + 1;
  const stale = await service.getPublicResource<{ version: number }>("/search/movie", { query: "arrival" });
  assert.equal(stale.cacheStatus, "STALE");
  assert.equal(stale.data.version, 1);

  await new Promise<void>((resolve) => setImmediate(resolve));
  const refreshed = await service.getPublicResource<{ version: number }>("/search/movie", { query: "arrival" });
  assert.equal(refreshed.cacheStatus, "HIT");
  assert.equal(refreshed.data.version, 2);
  assert.equal(upstreamCalls, 2);
});

test("stale-if-error keeps content available after an upstream failure", async () => {
  let now = 0;
  let shouldFail = false;
  let upstreamCalls = 0;
  const service = new TMDBService("test-key", {
    now: () => now,
    sleep: async () => undefined,
    request: async () => {
      upstreamCalls += 1;
      if (shouldFail) throw new TMDBServiceError("upstream unavailable", 503, true);
      return { results: [{ id: 9 }] };
    },
  });

  await service.getPublicResource("/search/movie", { query: "heat" });
  now = 31 * 60 * 1000;
  shouldFail = true;

  const result = await service.getPublicResource<{ results: Array<{ id: number }> }>("/search/movie", { query: "heat" });
  assert.equal(result.cacheStatus, "STALE");
  assert.equal(result.data.results[0].id, 9);
  assert.equal(upstreamCalls, 3);
});

test("temporary not-found responses are negatively cached", async () => {
  let upstreamCalls = 0;
  const service = new TMDBService("test-key", {
    request: async () => {
      upstreamCalls += 1;
      throw new TMDBServiceError("missing", 404, false);
    },
  });

  await assert.rejects(() => service.getPublicResource("/movie/999999"), TMDBServiceError);
  await assert.rejects(() => service.getPublicResource("/movie/999999"), TMDBServiceError);
  assert.equal(upstreamCalls, 1);
});
