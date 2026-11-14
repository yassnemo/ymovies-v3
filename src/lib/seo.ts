import { site, siteUrl } from './site.ts';
import { findGenre, genreHref } from './genres.ts';

type Data = Record<string, unknown>;
const record = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Data)
    : {};
const text = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;
const summary = (value: unknown, fallback: string = site.description) => {
  const clean = text(value, fallback).replace(/\s+/g, ' ').trim();
  return clean.length > 165
    ? clean.slice(0, 162).replace(/\s+\S*$/, '') + '…'
    : clean;
};

const pages: Record<string, [string, string]> = {
  '/': [
    'YMovies — Movies, TV & Watchlists by Yassine Erradouani',
    site.description
  ],
  '/movies': [
    'Discover Movies — YMovies',
    'Browse trending, popular and top-rated movies. Explore trailers and cast, then save the films you want to watch.'
  ],
  '/tv': [
    'Discover TV Shows — YMovies',
    'Find your next TV series, explore cast and trailers, and track episodes and watch progress with YMovies.'
  ],
  '/genres': [
    'Movie & TV Genres — YMovies',
    'Explore movies and TV shows by genre, from science fiction and animation to drama, comedy and mystery.'
  ],
  '/providers': [
    'Streaming Providers — YMovies',
    'Browse movie and TV catalogs by provider and discover titles available through your favorite services.'
  ],
  '/about': [
    'Yassine Erradouani — Creator of YMovies',
    'Meet Yassine Erradouani, also known as yassnemo, the developer behind YMovies. Explore the project, its source code and more of his work.'
  ],
  '/privacy': [
    'Privacy Policy — YMovies',
    'How YMovies handles account information, saved libraries and website analytics.'
  ],
  '/terms': [
    'Terms of Service — YMovies',
    'Terms for using YMovies, its movie and TV metadata, and personal library features.'
  ],
  '/search': [
    'Search Movies & TV Shows — YMovies',
    'Search for a movie or TV show and explore its cast, trailers and related titles.'
  ],
  '/signin': [
    'Sign in — YMovies',
    'Sign in to sync your watchlist and viewing progress.'
  ],
  '/signup': [
    'Create an account — YMovies',
    'Create an account to keep your movie and TV library in sync.'
  ],
  '/reset-password': [
    'Reset your password — YMovies',
    'Request a secure link to reset your YMovies password.'
  ],
  '/confirm-reset-password': [
    'Choose a new password — YMovies',
    'Update your YMovies account password.'
  ],
  '/auth/reset-password': [
    'Choose a new password — YMovies',
    'Update your YMovies account password.'
  ],
  '/verify-email': [
    'Check your email — YMovies',
    'Confirm your email address to finish creating your YMovies account.'
  ],
  '/verify-success': [
    'Email confirmed — YMovies',
    'Your email address has been confirmed.'
  ],
  '/auth/callback': [
    'Signing you in — YMovies',
    'Completing your secure sign-in.'
  ],
  '/api-test': [
    'Service status — YMovies',
    'Check YMovies catalog connectivity.'
  ],
  '/settings': [
    'Settings — YMovies',
    'Manage your YMovies account and preferences.'
  ],
  '/profile': [
    'Your profile — YMovies',
    'Your YMovies profile and preferences.'
  ],
  '/my-list': [
    'Your library — YMovies',
    'Your watchlist, favorites, collections and viewing history.'
  ]
};

export type SeoUrl = Pick<URL, 'pathname'> & {
  searchParams: Pick<URLSearchParams, 'get' | 'has'>;
};

export function resolveSeo(url: SeoUrl, input: unknown, status = 200) {
  const data = record(input);
  const path = url.pathname === '/home' ? '/' : url.pathname;
  const base = pages[path] || ['YMovies — Movies & TV Shows', site.description];
  let title = base[0];
  let description = base[1];
  let image = siteUrl(site.image);
  let kind = 'website';
  const canonical = new URL(path, site.origin);
  let noindex =
    /^\/(search|my-list|profile|settings|signin|signup|login|auth|reset-password|confirm-reset-password|verify-email|verify-success|api-test)(\/|$)/.test(
      path
    );
  const privateParameters = [
    'q',
    'query',
    'year',
    'rating',
    'sort',
    'sortBy',
    'genre',
    'language',
    'country',
    'provider'
  ];
  if (privateParameters.some((key) => url.searchParams.has(key)))
    noindex = true;
  const category = url.searchParams.get('category');
  const categories: Record<string, string> = {
    popular: 'Popular',
    top_rated: 'Top-rated',
    upcoming: 'Upcoming',
    now_playing: 'Now playing',
    airing_today: 'Airing today',
    on_the_air: 'On the air'
  };
  if (
    category &&
    categories[category] &&
    (path === '/movies' || path === '/tv')
  ) {
    canonical.searchParams.set('category', category);
    title = `${categories[category]} ${path === '/tv' ? 'TV shows' : 'movies'} — YMovies`;
  }
  const page = Number(url.searchParams.get('page'));
  if (
    Number.isInteger(page) &&
    page > 1 &&
    page <= 500 &&
    /^(\/movies|\/tv|\/genre\/|\/provider\/)/.test(path)
  ) {
    canonical.searchParams.set('page', String(page));
  }
  if (path.startsWith('/genre/')) {
    const [, , type, slug] = path.split('/');
    const genre = findGenre(type, slug);
    if (genre) canonical.pathname = genreHref(type, genre[1]);
    const label = text(data.title, 'Browse by genre');
    title = `${label} ${data.type === 'tv' ? 'TV shows' : 'movies'} — YMovies`;
    description = `Explore ${label.toLowerCase()} ${data.type === 'tv' ? 'TV shows' : 'movies'}, discover cast and trailers, and save something for your next watch.`;
  }
  if (path.startsWith('/provider/')) {
    const name = text(record(data.provider).name, text(data.title, 'Provider'));
    title = `${name} ${data.type === 'tv' ? 'TV shows' : 'movies'} — YMovies`;
    description = `Explore ${name}'s ${data.type === 'tv' ? 'TV shows' : 'movies'} catalog, discover trailers and cast, and add titles to your watchlist.`;
    if (data.type === 'tv') canonical.searchParams.set('type', 'tv');
  }
  if (canonical.searchParams.has('page'))
    title = title.replace(' — YMovies', ` — Page ${page} — YMovies`);
  if (status >= 400) {
    noindex = true;
    title =
      status === 404
        ? 'Page not found — YMovies'
        : 'Something went wrong — YMovies';
    description = 'Return to YMovies to browse movies and TV shows.';
  }
  const person = {
    '@type': 'Person',
    '@id': siteUrl('/about#yassine-erradouani'),
    name: site.author.name,
    alternateName: site.author.handle,
    url: site.author.website,
    sameAs: [site.author.website, site.author.github]
  };
  const graph: Data[] = [
    person,
    {
      '@type': 'WebSite',
      '@id': siteUrl('/#website'),
      name: site.name,
      url: siteUrl(),
      description: site.description,
      creator: { '@id': person['@id'] }
    }
  ];
  const item = record(data.item);
  if (/^\/(movie|tv)\/\d+$/.test(path) && typeof item.id === 'number') {
    const name = text(item.title, text(item.name, 'Title'));
    const date = text(item.release_date, text(item.first_air_date));
    title = `${name}${/^\d{4}/.test(date) ? ` (${date.slice(0, 4)})` : ''} — YMovies`;
    description = summary(
      item.overview,
      `Explore ${name}, its cast, trailers and related titles on YMovies.`
    );
    const poster = text(item.backdrop_path, text(item.poster_path));
    if (poster.startsWith('/'))
      image = 'https://image.tmdb.org/t/p/w1280' + poster;
    kind = path.startsWith('/movie/') ? 'video.movie' : 'video.tv_show';
    const entity: Data = {
      '@type': path.startsWith('/movie/') ? 'Movie' : 'TVSeries',
      '@id': canonical.href + '#title',
      name,
      description,
      image,
      url: canonical.href
    };
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) entity.datePublished = date;
    if (
      typeof item.vote_average === 'number' &&
      item.vote_average > 0 &&
      typeof item.vote_count === 'number' &&
      item.vote_count > 0
    ) {
      entity.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: item.vote_average,
        ratingCount: item.vote_count,
        bestRating: 10,
        worstRating: 0
      };
    }
    graph.push(entity);
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl() },
        {
          '@type': 'ListItem',
          position: 2,
          name: path.startsWith('/movie/') ? 'Movies' : 'TV shows',
          item: siteUrl(path.startsWith('/movie/') ? '/movies' : '/tv')
        },
        { '@type': 'ListItem', position: 3, name, item: canonical.href }
      ]
    });
  }
  if (path === '/')
    graph.push({
      '@type': 'WebApplication',
      name: site.name,
      url: siteUrl(),
      applicationCategory: 'EntertainmentApplication',
      operatingSystem: 'Web',
      creator: { '@id': person['@id'] },
      isAccessibleForFree: true
    });
  graph.push({
    '@type':
      path === '/about'
        ? 'ProfilePage'
        : /^\/(movies|tv|genres|providers|genre|provider)/.test(path)
          ? 'CollectionPage'
          : 'WebPage',
    '@id': canonical.href + '#page',
    url: canonical.href,
    name: title,
    description,
    isPartOf: { '@id': siteUrl('/#website') },
    ...(path === '/about' ? { mainEntity: { '@id': person['@id'] } } : {})
  });
  return {
    title,
    description,
    image,
    kind,
    canonical: canonical.href,
    noindex,
    structuredData: { '@context': 'https://schema.org', '@graph': graph }
  };
}

export const serializeStructuredData = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

export const structuredDataTag = (value: unknown) =>
  '<script type="application/ld+json">' +
  serializeStructuredData(value) +
  '</script>';
