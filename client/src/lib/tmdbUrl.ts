export function createTMDBRequestUrl(
  proxyUrl: string,
  endpoint: string,
  origin: string,
  params: Record<string, string> = {},
): URL {
  const url = new URL(`${proxyUrl}${endpoint}`, origin);
  Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([key, value]) => url.searchParams.set(key, value));
  return url;
}
