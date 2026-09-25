import type { IncomingMessage, ServerResponse } from "node:http";
import { TMDBService, TMDBServiceError } from "../server/services/tmdb";

type VercelRequest = IncomingMessage & { query?: Record<string, string | string[]> };

const tmdbService = new TMDBService(
  process.env.TMDB_API_KEY || process.env.TMDB_BEARER_TOKEN || "",
);

export default async function handler(request: VercelRequest, response: ServerResponse): Promise<void> {
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET");
    response.end(JSON.stringify({ message: "Method not allowed" }));
    return;
  }

  const url = new URL(request.url || "/", "http://localhost");
  const routedEndpoint = request.query?.endpoint;
  const endpoint = typeof routedEndpoint === "string"
    ? routedEndpoint
    : url.searchParams.get("endpoint") || url.pathname.replace(/^\/api\/tmdb\/?/, "");
  url.searchParams.delete("endpoint");

  const params: Record<string, string> = Object.fromEntries(url.searchParams.entries());
  if (request.query) {
    for (const [key, value] of Object.entries(request.query)) {
      if (key === "endpoint") continue;
      if (typeof value !== "string") {
        response.statusCode = 400;
        response.end(JSON.stringify({ message: "Invalid TMDB query parameter" }));
        return;
      }
      params[key] = value;
    }
  }

  try {
    const result = await tmdbService.getPublicResource(`/${endpoint}`, params);
    response.setHeader(
      "Cache-Control",
      `public, max-age=${result.browserMaxAgeSeconds}, s-maxage=${result.browserMaxAgeSeconds}, stale-while-revalidate=${result.staleWhileRevalidateSeconds}, stale-if-error=${result.staleIfErrorSeconds}`,
    );
    response.setHeader("Age", result.ageSeconds.toString());
    response.setHeader("X-TMDB-Cache", result.cacheStatus);
    response.setHeader("Server-Timing", `tmdb-cache;desc="${result.cacheStatus}"`);
    if (result.cacheStatus === "STALE" || result.cacheStatus === "FALLBACK") {
      response.setHeader("Warning", '110 - "Response is stale"');
    }
    response.end(JSON.stringify(result.data));
  } catch (error) {
    const serviceError = error instanceof TMDBServiceError
      ? error
      : new TMDBServiceError("TMDB is temporarily unavailable", 503, true, 2);
    response.statusCode = serviceError.statusCode;
    response.setHeader("Cache-Control", "private, no-store");
    if (serviceError.retryAfterSeconds) {
      response.setHeader("Retry-After", serviceError.retryAfterSeconds.toString());
    }
    response.end(JSON.stringify({ message: serviceError.message, retryable: serviceError.retryable }));
  }
}
