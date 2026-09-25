import { useState } from "react";
import { API_BASE_URL } from "@/lib/apiConfig";

type TestResult = {
  elapsedMs: number;
  cacheStatus: string;
  title: string;
  posterPath?: string;
};

export default function ApiTest() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testGateway = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    const startedAt = performance.now();

    try {
      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/api/tmdb/trending/movie/week`,
        { signal: controller.signal, credentials: "omit" },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message || `Gateway returned ${response.status}`);
      }

      const firstMovie = data?.results?.[0];
      setResult({
        elapsedMs: Math.round(performance.now() - startedAt),
        cacheStatus: response.headers.get("X-TMDB-Cache") || "browser/CDN",
        title: firstMovie?.title || "Trending movies loaded",
        posterPath: firstMovie?.poster_path,
      });
    } catch (requestError) {
      setError(
        requestError instanceof DOMException && requestError.name === "AbortError"
          ? "The server did not respond within 8 seconds."
          : requestError instanceof Error
            ? requestError.message
            : "The server-side movie gateway is unavailable.",
      );
    } finally {
      window.clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-white">
      <h1 className="mb-3 text-3xl font-bold">Movie API diagnostics</h1>
      <p className="mb-6 text-gray-300">
        This checks the application&apos;s server-side TMDB gateway. API credentials are never sent to this browser.
      </p>

      <button
        type="button"
        onClick={testGateway}
        disabled={isLoading}
        className="rounded bg-red-600 px-5 py-3 font-semibold hover:bg-red-700 disabled:opacity-60"
      >
        {isLoading ? "Testing&" : "Test movie gateway"}
      </button>

      {result && (
        <section className="mt-6 rounded border border-green-600 bg-green-950/40 p-4">
          <h2 className="font-semibold text-green-300">Gateway is responding</h2>
          <p className="mt-2">Latency: {result.elapsedMs} ms</p>
          <p>Cache: {result.cacheStatus}</p>
          <p>Sample: {result.title}</p>
          {result.posterPath && (
            <img
              className="mt-4 w-32 rounded"
              src={`https://image.tmdb.org/t/p/w185${result.posterPath}`}
              alt="Sample trending poster"
              loading="lazy"
              width="128"
              height="192"
            />
          )}
        </section>
      )}

      {error && (
        <section className="mt-6 rounded border border-red-600 bg-red-950/40 p-4" role="alert">
          <h2 className="font-semibold text-red-300">Gateway check failed</h2>
          <p className="mt-2">{error}</p>
        </section>
      )}
    </main>
  );
}
