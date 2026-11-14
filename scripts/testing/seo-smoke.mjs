import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://localhost:5000';
const origin = 'https://ymovies.yerradouani.me';
for (const [path, canonical, indexable] of [
  ['/', '/', true],
  ['/home', '/', true],
  ['/about', '/about', true],
  ['/genres', '/genres', true],
  ['/providers', '/providers', true],
  ['/signin?next=%2Fmy-list', '/signin', false],
  ['/missing-page', '/missing-page', false]
]) {
  const response = await fetch(base + path);
  const html = await response.text();
  assert.equal(response.status, path === '/missing-page' ? 404 : 200, path);
  assert.equal(
    [...html.matchAll(/<title>/g)].length,
    1,
    path + ' has one title'
  );
  assert.equal(
    [...html.matchAll(/<meta name="description"/g)].length,
    1,
    path + ' has one description'
  );
  assert.ok(
    html.includes('rel="canonical" href="' + origin + canonical + '"'),
    path + ' canonical'
  );
  assert.equal(
    html.includes('content="noindex, follow"'),
    !indexable,
    path + ' indexing'
  );
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.ok(
    response.headers
      .get('content-security-policy')
      ?.includes("object-src 'none'")
  );
  const json = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  )?.[1];
  assert.ok(json, path + ' structured data');
  const graph = JSON.parse(json)['@graph'];
  const person = graph.find((entity) => entity['@type'] === 'Person');
  assert.equal(person.name, 'Yassine Erradouani');
  assert.equal(person.url, 'https://yerradouani.me');
  if (path === '/about')
    assert.ok(graph.some((entity) => entity['@type'] === 'ProfilePage'));
  console.log('Verified SSR metadata and headers: ' + path);
}

const sitemapResponse = await fetch(base + '/sitemap.xml');
assert.equal(sitemapResponse.status, 200);
assert.match(sitemapResponse.headers.get('content-type'), /application\/xml/);
const sitemap = await sitemapResponse.text();
assert.ok(
  sitemap.startsWith(
    '<?xml version="1.0" encoding="UTF-8"?>\n<!--\n__   __   __     __    _____'
  )
);
assert.ok(sitemap.includes('Yassine Erradouani\nhttps://yerradouani.me\n-->'));
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) =>
  match[1].replaceAll('&amp;', '&')
);
assert.ok(locations.length > 60);
assert.equal(new Set(locations).size, locations.length);
for (const location of locations) {
  assert.equal(new URL(location).origin, origin);
  assert.ok(!/\/(search|auth|signin|my-list)(\/|\?|$)/.test(location));
}
assert.ok(
  !(await (await fetch(base + '/robots.txt')).text()).includes('Disallow: /\n')
);
assert.ok(
  (await (await fetch(base + '/humans.txt')).text()).includes(
    'Yassine Erradouani'
  )
);
console.log('Verified sitemap, robots and developer credits.');
