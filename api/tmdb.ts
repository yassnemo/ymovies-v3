type RequestLike = {
  method?: string;
  url?: string;
  query?: Record<string, string | string[]>;
};

type ResponseLike = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body: string): void;
};

const PUBLIC_ENDPOINTS = [
  /^\/trending\/(movie|tv|all)\/(day|week)$/,
  /^\/movie\/(popular|top_rated|now_playing|upcoming)$/,
  /^\/tv\/(popular|top_rated|airing_today|on_the_air)$/,
  /^\/(movie|tv)\/\d+$/,
  /^\/(movie|tv)\/\d+\/(similar|recommendations|videos|reviews|images)$/,
  /^\/(movie|tv)\/\d+\/watch\/providers$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/genre\/(movie|tv)\/list$/,
  /^\/discover\/(movie|tv)$/,
  /^\/search\/(movie|tv|multi)$/,
  /^\/configuration\/(countries|languages)$/,
  /^\/collection\/\d+$/,
];

const ALLOWED_PARAMS = new Set([
  "air_date.gte", "air_date.lte", "append_to_response", "first_air_date.gte",
  "first_air_date.lte", "first_air_date_year", "include_adult",
  "include_image_language", "language", "page", "primary_release_date.gte",
  "primary_release_date.lte", "primary_release_year", "query", "region",
  "release_date.gte", "release_date.lte", "sort_by", "timezone",
  "vote_average.gte", "vote_average.lte", "vote_count.gte", "vote_count.lte",
  "watch_region", "with_companies", "with_genres", "with_keywords",
  "with_origin_country", "with_original_language", "with_runtime.gte",
  "with_runtime.lte", "with_watch_providers", "without_genres",
]);

const SAFE_APPEND = new Set([
  "aggregate_credits", "content_ratings", "credits", "external_ids", "images",
  "keywords", "recommendations", "release_dates", "reviews", "similar", "videos",
]);

export default async function handler(request: RequestLike, response: ResponseLike): Promise<void> {
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
  const normalizedEndpoint = `/${endpoint}`.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  if (!PUBLIC_ENDPOINTS.some((pattern) => pattern.test(normalizedEndpoint))) {
    response.statusCode = 404;
    response.end(JSON.stringify({ message: "Unsupported TMDB resource" }));
    return;
  }

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

  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_PARAMS.has(key) || value.length > 200) {
      response.statusCode = 400;
      response.end(JSON.stringify({ message: "Unsupported TMDB query parameter" }));
      return;
    }
    if (key === "append_to_response" && value.split(",").some((part) => !SAFE_APPEND.has(part))) {
      response.statusCode = 400;
      response.end(JSON.stringify({ message: "Unsupported TMDB query parameter" }));
      return;
    }
  }

  const apiKey = process.env.TMDB_API_KEY;
  const bearerToken = apiKey ? undefined : process.env.TMDB_BEARER_TOKEN;
  if (!apiKey && !bearerToken) {
    response.statusCode = 503;
    response.setHeader("Cache-Control", "private, no-store");
    response.end(JSON.stringify({ message: "TMDB service is not configured", retryable: false }));
    return;
  }

  try {
    const upstreamUrl = new URL(`https://api.themoviedb.org/3${normalizedEndpoint}`);
    for (const [key, value] of Object.entries(params)) upstreamUrl.searchParams.set(key, value);
    if (apiKey) upstreamUrl.searchParams.set("api_key", apiKey);

    const upstream = await fetch(upstreamUrl, {
      headers: bearerToken
        ? { Authorization: `Bearer ${bearerToken}`, Accept: "application/json" }
        : { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });

    if (!upstream.ok) {
      response.statusCode = upstream.status === 404 ? 404 : upstream.status === 429 ? 429 : 503;
      response.setHeader("Cache-Control", "private, no-store");
      const retryAfter = upstream.headers.get("retry-after");
      if (response.statusCode === 429 && retryAfter) response.setHeader("Retry-After", retryAfter);
      response.end(JSON.stringify({
        message: response.statusCode === 404 ? "TMDB resource not found" : "TMDB is temporarily unavailable",
        retryable: response.statusCode !== 404,
      }));
      return;
    }

    const maxAge = normalizedEndpoint.startsWith("/search/") ? 900 : 3_600;
    response.setHeader("Cache-Control", `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=3600`);
    response.end(await upstream.text());
  } catch (error) {
    response.statusCode = 503;
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("Retry-After", "2");
    response.end(JSON.stringify({ message: "TMDB is temporarily unavailable", retryable: true }));
  }
}
