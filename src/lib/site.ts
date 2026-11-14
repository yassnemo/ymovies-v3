export const site = {
  name: 'YMovies',
  origin: 'https://ymovies.yerradouani.me',
  description:
    'Find movies and TV shows, explore cast and trailers, and keep a watchlist that remembers where you left off.',
  image: '/social-card.png',
  repository: 'https://github.com/yassnemo/ymovies-v3',
  author: {
    name: 'Yassine Erradouani',
    handle: 'yassnemo',
    website: 'https://yerradouani.me',
    contact: 'https://yerradouani.me/contact',
    github: 'https://github.com/yassnemo'
  }
} as const;

export const siteUrl = (path = '/') => new URL(path, site.origin).href;
