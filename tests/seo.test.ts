import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveSeo, serializeStructuredData } from '../src/lib/seo.ts';
import { developerSignature } from '../src/lib/signature.ts';
import { site } from '../src/lib/site.ts';

test('canonical URLs use the public origin and omit tracking and credentials', () => {
  const seo = resolveSeo(
    new URL(
      'https://preview.example/home?access_token=secret&utm_source=share#token'
    ),
    {}
  );
  assert.equal(seo.canonical, site.origin + '/');
  assert.ok(!JSON.stringify(seo).includes('secret'));
});

test('catalog pagination stays crawlable with distinct canonical links and titles', () => {
  const seo = resolveSeo(
    new URL('https://preview.example/genre/movie/drama?page=3'),
    { title: 'Drama', type: 'movie' }
  );
  assert.equal(seo.canonical, site.origin + '/genre/movie/drama?page=3');
  assert.match(seo.title, /Drama movies — Page 3/);
  assert.equal(seo.noindex, false);
});

test('private pages, free-text search, filters and errors cannot be indexed', () => {
  for (const path of [
    '/signin?next=/my-list',
    '/auth/callback?code=secret',
    '/settings',
    '/my-list',
    '/search?q=hello',
    '/movies?year=2026',
    '/tv?sortBy=vote_average'
  ]) {
    assert.equal(
      resolveSeo(new URL('https://example.test' + path), {}).noindex,
      true,
      path
    );
  }
  assert.equal(
    resolveSeo(new URL('https://example.test/missing'), {}, 404).noindex,
    true
  );
});

test('numeric and legacy genre aliases point to the same descriptive canonical', () => {
  for (const path of [
    '/genre/tv/10759',
    '/genre/tv/action',
    '/genre/tv/action-adventure'
  ]) {
    const seo = resolveSeo(new URL('https://example.test' + path), {
      title: 'Action & Adventure',
      type: 'tv'
    });
    assert.equal(seo.canonical, site.origin + '/genre/tv/action-adventure');
  }
});

test('TV provider catalogs have their own canonical and author identity is connected', () => {
  const seo = resolveSeo(
    new URL('https://example.test/provider/netflix?type=tv'),
    { provider: { name: 'Netflix' }, type: 'tv' }
  );
  assert.equal(seo.canonical, site.origin + '/provider/netflix?type=tv');
  const profile = resolveSeo(new URL('https://example.test/about'), {})
    .structuredData['@graph'];
  const person = profile.find((entity) => entity['@type'] === 'Person');
  assert.equal(person?.name, 'Yassine Erradouani');
  assert.equal(person?.url, 'https://yerradouani.me');
  assert.deepEqual(
    profile.find((entity) => entity['@type'] === 'ProfilePage')?.mainEntity,
    { '@id': person?.['@id'] }
  );
});

test('title schema uses real catalog data and never invents ratings', () => {
  const item = {
    id: 42,
    title: 'Example',
    overview: '</script><script>alert(1)</script>',
    release_date: '2026-01-02'
  };
  const seo = resolveSeo(new URL('https://example.test/movie/42'), { item });
  const movie = seo.structuredData['@graph'].find(
    (entity) => entity['@type'] === 'Movie'
  );
  assert.equal(movie?.datePublished, '2026-01-02');
  assert.equal(movie?.aggregateRating, undefined);
  const serialized = serializeStructuredData(seo.structuredData);
  assert.ok(!serialized.includes('</script>'));
  assert.deepEqual(JSON.parse(serialized), seo.structuredData);
});

test('developer signature preserves the requested artwork and identity', () => {
  const lines = developerSignature.split('\n');
  assert.deepEqual(lines.slice(0, 5), [
    '__   __   __     __    _____',
    '\\ \\ / /  /_ |   /_ |  |___ /',
    ' \\ V /    | |    | |    |_ \\',
    '  | |     | |    | |   ___) |',
    '  |_|     |_|    |_|  |____/'
  ]);
  assert.ok(
    developerSignature.includes('Yassine Erradouani\nhttps://yerradouani.me')
  );
});
