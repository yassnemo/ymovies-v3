import { siteUrl } from '#lib/site.ts';
import { developerSignature } from '#lib/signature.ts';

export const GET = () =>
  new Response(
    developerSignature
      .split('\n')
      .map((line) => '# ' + line)
      .join('\n') +
      '\n\nUser-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ' +
      siteUrl('/sitemap.xml') +
      '\n',
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    }
  );
