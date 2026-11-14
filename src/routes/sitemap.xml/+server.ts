import { siteUrl } from '#lib/site.ts';
import { developerSignature } from '#lib/signature.ts';
import { movieGenres, tvGenres, genreHref } from '#lib/genres.ts';
import { providers } from '#lib/providers.ts';
import { resource } from '../../server/catalog';
import type { Media } from '#lib/types/media.ts';

const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export async function GET() {
  const paths = new Set([
    '/',
    '/about',
    '/movies',
    '/tv',
    '/genres',
    '/providers',
    '/privacy',
    '/terms'
  ]);
  for (const [type, genres] of [
    ['movie', movieGenres],
    ['tv', tvGenres]
  ] as const) {
    for (const [, name] of genres) paths.add(genreHref(type, name));
  }
  for (const provider of providers) {
    paths.add('/provider/' + provider.id);
    paths.add('/provider/' + provider.id + '?type=tv');
  }
  const catalogs = await Promise.allSettled(
    (['movie', 'tv'] as const).map(async (type) => {
      const data = await resource<{ results: Media[] }>(
        '/trending/' + type + '/week'
      );
      return data.results
        .filter((item) => Number.isInteger(item.id) && item.id > 0)
        .map((item) => '/' + type + '/' + item.id);
    })
  );
  for (const catalog of catalogs)
    if (catalog.status === 'fulfilled')
      for (const path of catalog.value) paths.add(path);
  const urls = [...paths]
    .map((path) => '  <url><loc>' + escape(siteUrl(path)) + '</loc></url>')
    .join('\n');
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n<!--\n' +
    developerSignature +
    '\n-->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls +
    '\n</urlset>\n';
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control':
        'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
