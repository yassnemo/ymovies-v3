import { TMDBService, TMDBServiceError } from "../server/services/tmdb";

const tmdbService = new TMDBService(
  process.env.TMDB_API_KEY || process.env.TMDB_BEARER_TOKEN || "",
);

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint");

  if (!endpoint) {
    return Response.json({ message: "TMDB resource not found" }, { status: 404 });
  }

  url.searchParams.delete("endpoint");
  const params = Object.fromEntries(url.searchParams.entries());

  try {
    const result = await tmdbService.getPublicResource(`/${endpoint}`, params);
    const headers = new Headers({
      "Cache-Control": `public, max-age=${result.browserMaxAgeSeconds}, s-maxage=${result.browserMaxAgeSeconds}, stale-while-revalidate=${result.staleWhileRevalidateSeconds}, stale-if-error=${result.staleIfErrorSeconds}`,
      Age: result.ageSeconds.toString(),
      "X-TMDB-Cache": result.cacheStatus,
      "Server-Timing": `tmdb-cache;desc="${result.cacheStatus}"`,
    });
    if (result.cacheStatus === "STALE" || result.cacheStatus === "FALLBACK") {
      headers.set("Warning", '110 - "Response is stale"');
    }
    return Response.json(result.data, { headers });
  } catch (error) {
    const serviceError = error instanceof TMDBServiceError
      ? error
      : new TMDBServiceError("TMDB is temporarily unavailable", 503, true, 2);
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    if (serviceError.retryAfterSeconds) {
      headers.set("Retry-After", serviceError.retryAfterSeconds.toString());
    }
    return Response.json(
      { message: serviceError.message, retryable: serviceError.retryable },
      { status: serviceError.statusCode, headers },
    );
  }
}
