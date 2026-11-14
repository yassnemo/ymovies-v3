import { error } from '@sveltejs/kit';
import { TMDBService, TMDBServiceError } from '../../server/services/tmdb';
import type {
  CatalogSection,
  Detail,
  Media,
  MediaType
} from '../lib/types/media';
import { findGenre } from '../lib/genres';

export const tmdb = new TMDBService(
  process.env.TMDB_API_KEY || process.env.TMDB_BEARER_TOKEN || ''
);
export const withType = (items: Media[], type: MediaType) =>
  items.map((item) => ({ ...item, media_type: type }));
export async function resource<T>(
  path: string,
  params: Record<string, string> = {}
) {
  return (await tmdb.getPublicResource<T>(path, params)).data;
}
export async function homeCatalog() {
  const definitions: [string, string, MediaType, string][] = [
    ['Trending Movies', '/trending/movie/day', 'movie', '/movies'],
    ['Trending Series', '/trending/tv/day', 'tv', '/tv'],
    ['Popular Movies', '/movie/popular', 'movie', '/movies?category=popular'],
    ['Popular Series', '/tv/popular', 'tv', '/tv?category=popular'],
    [
      'Top Rated Movies',
      '/movie/top_rated',
      'movie',
      '/movies?category=top_rated'
    ],
    ['Top Rated Series', '/tv/top_rated', 'tv', '/tv?category=top_rated']
  ];
  const results = await Promise.allSettled(
    definitions.map(async ([title, path, type, href]) => ({
      title,
      href,
      items: withType(
        (await resource<{ results: Media[] }>(path)).results,
        type
      )
    }))
  );
  const sections: CatalogSection[] = results.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : []
  );
  const mixed = await resource<{ results: Media[] }>('/trending/all/day').catch(
    () => ({ results: [] })
  );
  const ranked = mixed.results
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .slice(0, 10);
  const selected = sections[0]?.items.slice(0, 7) || [];
  const featured = await heroImages(
    selected.map((item) => ({
      ...item,
      rank:
        ranked.findIndex(
          (value) =>
            value.id === item.id && value.media_type === item.media_type
        ) + 1 || undefined
    }))
  );
  return { sections, ranked, featured, unavailable: sections.length === 0 };
}
export async function heroImages(items: Media[]): Promise<Media[]> {
  return Promise.all(
    items.map(async (item) => {
      try {
        const images = await resource<{
          logos: { file_path: string; iso_639_1: string | null }[];
        }>('/' + (item.media_type || 'movie') + '/' + item.id + '/images', {
          include_image_language: 'en,null'
        });
        const logo =
          images.logos.find((value) => value.iso_639_1 === 'en') ||
          images.logos[0];
        return { ...item, logo_path: logo?.file_path || '' };
      } catch {
        return item;
      }
    })
  );
}
export async function browseCatalog(
  type: MediaType,
  url: URL,
  genreSlug?: string
) {
  const genre = genreSlug ? findGenre(type, genreSlug) : undefined;
  if (genreSlug && !genre) error(404, 'Genre not found');
  const pageValue = Number(url.searchParams.get('page') || 1);
  const page = Number.isInteger(pageValue)
    ? Math.max(1, Math.min(500, pageValue))
    : 1;
  const categories =
    type === 'movie'
      ? ['trending', 'popular', 'top_rated', 'upcoming', 'now_playing']
      : ['trending', 'popular', 'top_rated', 'airing_today', 'on_the_air'];
  const categoryValue = url.searchParams.get('category') || 'trending';
  const category = categories.includes(categoryValue)
    ? categoryValue
    : 'trending';
  const sortValue = url.searchParams.get('sort') || 'popularity.desc';
  const sort = [
    'popularity.desc',
    'vote_average.desc',
    'primary_release_date.desc',
    'first_air_date.desc'
  ].includes(sortValue)
    ? sortValue
    : 'popularity.desc';
  const params: Record<string, string> = { page: String(page) };
  const selectedGenre =
    genre?.[0] || Number(url.searchParams.get('genre')) || 0;
  const year = /^\d{4}$/.test(url.searchParams.get('year') || '')
    ? url.searchParams.get('year')!
    : '';
  let endpoint =
    category === 'trending' ? `/trending/${type}/week` : `/${type}/${category}`;
  const provider = /^\d+$/.test(url.searchParams.get('provider') || '')
    ? url.searchParams.get('provider')!
    : '';
  if (selectedGenre || year || provider || url.searchParams.has('sort')) {
    endpoint = `/discover/${type}`;
    params.sort_by = sort;
    if (selectedGenre) params.with_genres = String(selectedGenre);
    if (provider) {
      params.with_watch_providers = provider;
      params.watch_region = 'US';
    }
    if (year)
      params[
        type === 'movie' ? 'primary_release_year' : 'first_air_date_year'
      ] = year;
    if (sort === 'vote_average.desc') params['vote_count.gte'] = '200';
  }
  const title = genre?.[1] || (type === 'movie' ? 'Movies' : 'TV shows');
  try {
    const result = await resource<{
      results: Media[];
      total_pages: number;
      total_results: number;
    }>(endpoint, params);
    return {
      type,
      title,
      category,
      sort,
      selectedGenre,
      year,
      page,
      items: withType(result.results, type),
      totalPages: Math.min(500, result.total_pages),
      totalResults: result.total_results,
      unavailable: false
    };
  } catch {
    return {
      type,
      title,
      category,
      sort,
      selectedGenre,
      year,
      page,
      items: [] as Media[],
      totalPages: 0,
      totalResults: 0,
      unavailable: true
    };
  }
}
export async function detailCatalog(type: MediaType, id: string) {
  if (!/^[1-9]\d*$/.test(id)) error(404, 'Title not found');
  try {
    const item = await resource<Detail>(`/${type}/${id}`, {
      append_to_response: 'credits,videos,similar,recommendations,reviews'
    });
    return { item: { ...item, media_type: type }, type };
  } catch (problem) {
    if (problem instanceof TMDBServiceError && problem.statusCode === 404)
      error(404, 'Title not found');
    error(503, 'Movie data is temporarily unavailable. Please try again.');
  }
}
export async function searchCatalog(url: URL) {
  const q = (url.searchParams.get('q') || url.searchParams.get('query') || '')
    .trim()
    .slice(0, 200);
  const type =
    url.searchParams.get('type') === 'tv'
      ? 'tv'
      : url.searchParams.get('type') === 'movie'
        ? 'movie'
        : 'multi';
  const requestedPage = Number(url.searchParams.get('page') || 1);
  const page = Number.isInteger(requestedPage)
    ? Math.min(500, Math.max(1, requestedPage))
    : 1;
  const year = /^\d{4}$/.test(url.searchParams.get('year') || '')
    ? url.searchParams.get('year')!
    : '';
  const ratingValue = Number(url.searchParams.get('rating') || 0);
  const rating = Number.isFinite(ratingValue)
    ? Math.max(0, Math.min(10, ratingValue))
    : 0;
  const selectedGenre = /^\d+$/.test(url.searchParams.get('genre') || '')
    ? Number(url.searchParams.get('genre'))
    : 0;
  const language = /^[a-z]{2}$/.test(url.searchParams.get('language') || '')
    ? url.searchParams.get('language')!
    : '';
  const country = /^[A-Z]{2}$/.test(url.searchParams.get('country') || '')
    ? url.searchParams.get('country')!
    : '';
  const sortValue = url.searchParams.get('sortBy') || '';
  const sort = [
    'popularity.desc',
    'popularity.asc',
    'release_date.desc',
    'release_date.asc',
    'vote_average.desc',
    'vote_average.asc'
  ].includes(sortValue)
    ? sortValue
    : '';
  const filtered = !!(
    year ||
    rating ||
    selectedGenre ||
    language ||
    country ||
    sort
  );
  const base = {
    q,
    type,
    year,
    rating,
    selectedGenre,
    language,
    country,
    sort,
    filtered,
    page
  };
  const empty = {
    ...base,
    items: [] as Media[],
    totalPages: 0,
    totalResults: 0,
    sections: [] as CatalogSection[]
  };
  try {
    if (!q && !filtered) {
      const home = await homeCatalog();
      return {
        ...empty,
        sections: home.sections.filter(
          (section) =>
            section.title.startsWith('Trending') &&
            (type === 'multi' || section.items[0]?.media_type === type)
        ),
        unavailable: home.unavailable
      };
    }
    const types: MediaType[] = type === 'multi' ? ['movie', 'tv'] : [type];
    const results = await Promise.allSettled(
      types.map(async (media) => {
        const params: Record<string, string> = {
          page: String(page),
          include_adult: 'false'
        };
        if (year)
          params[
            media === 'movie' ? 'primary_release_year' : 'first_air_date_year'
          ] = year;
        if (q) {
          params.query = q;
        } else {
          params.sort_by = (sort || 'popularity.desc').replace(
            'release_date',
            media === 'tv' ? 'first_air_date' : 'primary_release_date'
          );
          if (rating) params['vote_average.gte'] = String(rating);
          if (selectedGenre) params.with_genres = String(selectedGenre);
          if (language) params.with_original_language = language;
          if (country) params.with_origin_country = country;
          if (sort.startsWith('vote_average')) params['vote_count.gte'] = '100';
        }
        const result = await resource<{
          results: Media[];
          total_pages: number;
          total_results: number;
        }>(`/${q ? 'search' : 'discover'}/${media}`, params);
        const items = withType(result.results, media).filter(
          (item) =>
            (item.vote_average || 0) >= rating &&
            (!selectedGenre ||
              (item.genre_ids || []).includes(selectedGenre)) &&
            (!language || item.original_language === language) &&
            (!country || !q || item.origin_country?.includes(country))
        );
        return { ...result, items };
      })
    );
    const valid = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    );
    const items = valid
      .flatMap((result) => result.items)
      .sort((a, b) => {
        const direction = sort.endsWith('.asc') ? 1 : -1;
        if (sort.startsWith('release_date'))
          return (
            direction *
            (a.release_date || a.first_air_date || '').localeCompare(
              b.release_date || b.first_air_date || ''
            )
          );
        if (sort.startsWith('vote_average'))
          return direction * ((a.vote_average || 0) - (b.vote_average || 0));
        return direction * ((a.popularity || 0) - (b.popularity || 0));
      });
    return {
      ...empty,
      items,
      totalPages: Math.min(
        500,
        Math.max(0, ...valid.map((result) => result.total_pages))
      ),
      totalResults: valid.reduce(
        (total, result) => total + result.total_results,
        0
      ),
      unavailable: valid.length === 0
    };
  } catch {
    return { ...empty, unavailable: true };
  }
}
