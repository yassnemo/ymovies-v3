import { TMDBService, TMDBServiceError } from '../../server/services/tmdb';

export async function tmdbResponse(request: Request, service: TMDBService) {
  if (request.method !== 'GET')
    return Response.json(
      { message: 'Method not allowed' },
      { status: 405, headers: { Allow: 'GET' } }
    );
  try {
    const url = new URL(request.url);
    const endpoint = url.pathname.replace(/^\/api\/tmdb/, '');
    const params: Record<string, string> = {};
    for (const [key, value] of url.searchParams) {
      if (key in params)
        throw new TMDBServiceError('Duplicate query parameter', 400, false);
      params[key] = value;
    }
    const result = await service.getPublicResource(endpoint, params);
    return Response.json(result.data, {
      headers: {
        'Cache-Control': `public, max-age=${result.browserMaxAgeSeconds}, s-maxage=${result.browserMaxAgeSeconds}, stale-while-revalidate=${result.staleWhileRevalidateSeconds}, stale-if-error=${result.staleIfErrorSeconds}`,
        Age: String(result.ageSeconds),
        'X-TMDB-Cache': result.cacheStatus,
        'Server-Timing': `tmdb-cache;desc="${result.cacheStatus}"`
      }
    });
  } catch (error) {
    const problem =
      error instanceof TMDBServiceError
        ? error
        : new TMDBServiceError(
            'Movie data is temporarily unavailable',
            503,
            true,
            2
          );
    return Response.json(
      { message: problem.message, retryable: problem.retryable },
      {
        status: problem.statusCode,
        headers: {
          'Cache-Control': 'private, no-store',
          ...(problem.retryAfterSeconds
            ? { 'Retry-After': String(problem.retryAfterSeconds) }
            : {})
        }
      }
    );
  }
}
