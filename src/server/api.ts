import { z } from 'zod';
import { tmdb } from './catalog';

const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { 'Cache-Control': 'private, no-store' }
  });
const preferencesSchema = z.object({
  favoriteMovies: z.array(z.any()).optional(),
  watchlist: z.array(z.any()).optional(),
  watchHistory: z.array(z.any()).optional(),
  likedGenres: z.array(z.string()).optional(),
  dislikedGenres: z.array(z.string()).optional(),
  completed: z.boolean().optional(),
  collections: z.array(z.any()).optional(),
  appSettings: z.record(z.any()).optional()
});
const progressSchema = z.object({
  movieId: z.coerce.number().int().positive(),
  watchProgress: z.number().min(0).max(100),
  watchDuration: z.number().nonnegative().optional(),
  lastStoppedAt: z.number().nonnegative().optional(),
  rating: z.number().min(0).max(5).optional()
});

export async function handleApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
  const method = request.method;
  try {
    if (route === 'health')
      return method === 'GET'
        ? json({ status: 'healthy', framework: 'sveltekit' })
        : json({ message: 'Method not allowed' }, 405);
    if (method === 'GET') {
      if (route === 'genres') return json(await tmdb.getGenres());
      if (route === 'search') {
        const q = url.searchParams.get('q');
        return q
          ? json(await tmdb.searchMovies(q))
          : json({ message: 'Search query is required' }, 400);
      }
      if (route === 'recommendations/trending')
        return json(await tmdb.getTrending());
      if (
        /^movies\/(trending|popular|top_rated|upcoming|now_playing)$/.test(
          route
        )
      ) {
        const name = route.split('/')[1];
        const result = await tmdb.getPublicResource<{ results: unknown[] }>(
          name === 'trending' ? '/trending/movie/week' : `/movie/${name}`
        );
        return json(result.data.results);
      }
      if (/^(movies|tv)\/\d+(\/(similar|videos|reviews))?$/.test(route)) {
        const result = await tmdb.getPublicResource<any>(
          '/' + route.replace(/^movies/, 'movie')
        );
        return json(result.data.results ?? result.data);
      }
      const similar = route.match(
        /^recommendations\/(similar|because-you-liked)\/(\d+)$/
      );
      const tvSimilar = route.match(/^tv\/(\d+)\/similar\/enhanced$/);
      if (similar || tvSimilar) {
        const handlers = await import('../../server/api/recommendations');
        const input = {
          params: { movieId: similar?.[2] || '', tvId: tvSimilar?.[1] || '' }
        };
        return tvSimilar
          ? handlers.getSimilarTVShowsEnhanced(input)
          : similar?.[1] === 'similar'
            ? handlers.getSimilarMovies(input)
            : handlers.getBecauseYouLikedRecommendations(input);
      }
    }

    const protectedRoute =
      /^(auth\/user|preferences|watchlist(?:\/.*)?|history|watch-history(?:\/.*)?|recommendations(?:\/personalized)?)$/.test(
        route
      );
    if (!protectedRoute) return json({ message: 'API route not found' }, 404);
    const token = request.headers
      .get('Authorization')
      ?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return json({ message: 'Unauthorized' }, 401);
    const { supabaseAdmin } = await import('../../server/supabaseAdmin');
    const {
      data: { user },
      error
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return json({ message: 'Unauthorized' }, 401);
    const { storage } = await import('../../server/storage');
    const userId = user.id;

    if (route === 'auth/user' && method === 'GET')
      return json(
        (await storage.getUser(userId)) || { id: userId, email: user.email }
      );
    if (route === 'preferences') {
      if (method === 'GET') {
        const prefs = await storage.getUserPreferences(userId);
        return json(
          prefs
            ? {
                ...prefs,
                completed:
                  (prefs.appSettings as Record<string, unknown>)
                    ?.onboardingCompleted ?? false
              }
            : {
                favoriteMovies: [],
                watchlist: [],
                watchHistory: [],
                likedGenres: [],
                dislikedGenres: [],
                collections: [],
                appSettings: {},
                completed: false,
                _isDefault: true
              }
        );
      }
      if (method === 'POST') {
        const data = preferencesSchema.parse(await request.json());
        const saved = await storage.updateUserPreferences(userId, data);
        return saved
          ? json({ success: true })
          : json({ message: 'Could not save preferences' }, 503);
      }
    }
    if (route === 'watchlist' && method === 'GET') {
      const list = await storage.getWatchlistItems(userId);
      return json(await tmdb.getMoviesByIds(list.map((item) => item.movieId)));
    }
    if (route === 'watchlist' && method === 'POST') {
      const { movieId } = z
        .object({ movieId: z.coerce.number().int().positive() })
        .parse(await request.json());
      return json({
        success: true,
        item: await storage.addToWatchlist({ userId, movieId })
      });
    }
    const watchlistId = route.match(/^watchlist\/(\d+)$/);
    if (watchlistId && method === 'DELETE') {
      await storage.removeFromWatchlist(userId, Number(watchlistId[1]));
      return json({ success: true });
    }
    const checkId = route.match(/^watchlist\/check\/(\d+)$/);
    if (checkId && method === 'GET')
      return json({
        isInWatchlist: await storage.isInWatchlist(userId, Number(checkId[1]))
      });
    if (
      (route === 'history' || route === 'watch-history') &&
      method === 'GET'
    ) {
      const history = await storage.getWatchHistory(userId);
      const details = await tmdb.getMoviesByIds(
        history.map((item) => item.movieId)
      );
      const byId = new Map(history.map((item) => [item.movieId, item]));
      return json(
        details.map((movie) => {
          const item = byId.get(movie.id);
          return {
            ...movie,
            watchData: {
              watchProgress: item?.watchProgress || 0,
              watchCount: item?.watchCount || 0,
              completed: item?.completed || false,
              rating: item?.rating ?? null,
              lastStoppedAt: item?.lastStoppedAt || 0,
              watchDuration: item?.watchDuration || 0,
              watchedAt: item?.watchedAt || null
            }
          };
        })
      );
    }
    const progressId = route.match(/^watch-history\/(\d+)\/progress$/);
    if (
      (route === 'history' && method === 'POST') ||
      (progressId && method === 'PUT')
    ) {
      const body = await request.json();
      const data = progressSchema.parse({
        ...body,
        ...(progressId ? { movieId: progressId[1] } : {})
      });
      return json({
        success: true,
        item: await storage.updateWatchProgress({ ...data, userId })
      });
    }
    if (
      (route === 'recommendations' ||
        route === 'recommendations/personalized') &&
      method === 'GET'
    ) {
      const { getPersonalizedRecommendations } =
        await import('../../server/api/recommendations');
      const response = await getPersonalizedRecommendations({
        params: {},
        user: { claims: { sub: userId } }
      });
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }
    return json({ message: 'Method not allowed' }, 405);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return json({ message: 'Invalid request data' }, 400);
    console.error(
      '[YMovies API]',
      route,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return json({ message: 'Service temporarily unavailable' }, 503);
  }
}
