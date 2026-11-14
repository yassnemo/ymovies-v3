export const movieGenres = [
  [28, 'Action'],
  [12, 'Adventure'],
  [16, 'Animation'],
  [35, 'Comedy'],
  [80, 'Crime'],
  [99, 'Documentary'],
  [18, 'Drama'],
  [10751, 'Family'],
  [14, 'Fantasy'],
  [36, 'History'],
  [27, 'Horror'],
  [10402, 'Music'],
  [9648, 'Mystery'],
  [10749, 'Romance'],
  [878, 'Sci-Fi'],
  [53, 'Thriller'],
  [10752, 'War'],
  [37, 'Western']
] as const;
export const tvGenres = [
  [10759, 'Action & Adventure'],
  [16, 'Animation'],
  [35, 'Comedy'],
  [80, 'Crime'],
  [99, 'Documentary'],
  [18, 'Drama'],
  [10751, 'Family'],
  [10762, 'Kids'],
  [9648, 'Mystery'],
  [10763, 'News'],
  [10764, 'Reality'],
  [10765, 'Sci-Fi & Fantasy'],
  [10766, 'Soap'],
  [10767, 'Talk'],
  [10768, 'War & Politics'],
  [37, 'Western']
] as const;
export function findGenre(type: string, slug: string) {
  const genres = type === 'tv' ? tvGenres : movieGenres;
  const aliases: Record<string, number> = {
    scifi: type === 'tv' ? 10765 : 878,
    anime: 16,
    action: type === 'tv' ? 10759 : 28,
    war: type === 'tv' ? 10768 : 10752
  };
  return genres.find(
    ([id, name]) =>
      String(id) === slug ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug ||
      id === aliases[slug]
  );
}
