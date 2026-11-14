import { getContext } from 'svelte';
import { get, writable } from 'svelte/store';
import {
  createClient,
  type Session,
  type SupabaseClient
} from '@supabase/supabase-js';
import {
  emptyPreferences,
  normalizePreferences,
  toggleMedia
} from './preferences.ts';
import {
  mediaKey,
  mediaType,
  type Media,
  type Preferences
} from './types/media.ts';

export const APP_STATE = Symbol('ymovies');
export function createAppState(config: { url: string; key: string }) {
  const session = writable<Session | null>(null);
  const ready = writable(false);
  const preferences = writable<Preferences>(emptyPreferences());
  const notice = writable('');
  const syncing = writable(false);
  let client: SupabaseClient | null = null;
  let owner: string | null = null;
  let generation = 0;
  let revision = 0;
  let timer: ReturnType<typeof setTimeout>;
  let saveQueue = Promise.resolve();
  function ensureClient() {
    if (!client && typeof window !== 'undefined' && config.url && config.key) {
      client = createClient(config.url, config.key, {
        auth: { flowType: 'pkce' }
      });
    }
    return client;
  }
  const key = () => `ymovies:preferences:${owner || 'guest'}`;
  const read = (name: string, fallback: unknown) => {
    try {
      return JSON.parse(localStorage.getItem(name) || 'null') ?? fallback;
    } catch {
      return fallback;
    }
  };
  const persist = (value: Preferences) => {
    try {
      localStorage.setItem(key(), JSON.stringify(value));
    } catch {
      tell(
        'Browser storage is unavailable. Keep this tab open to retain your changes.'
      );
    }
  };
  function tell(message: string) {
    notice.set(message);
    clearTimeout(timer);
    timer = setTimeout(() => notice.set(''), 6000);
  }
  async function api<T = unknown>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = (await client?.auth.getSession())?.data.session?.access_token;
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body) headers.set('Content-Type', 'application/json');
    const response = await fetch(path, { ...options, headers });
    const body = await response.json();
    if (!response.ok)
      throw new Error(body.message || 'The request could not be completed.');
    return body as T;
  }
  function sync(value = get(preferences)) {
    const userId = owner;
    if (!userId || !get(session)) return Promise.resolve();
    const version = generation;
    saveQueue = saveQueue
      .catch(() => {})
      .then(async () => {
        if (version !== generation || userId !== owner) return;
        syncing.set(true);
        try {
          await api('/api/preferences', {
            method: 'POST',
            body: JSON.stringify(value)
          });
          if (version === generation && value === get(preferences))
            localStorage.removeItem(`${key()}:pending`);
        } catch {
          if (version === generation) {
            localStorage.setItem(`${key()}:pending`, 'true');
            tell(
              'Saved on this device. Account sync will retry when you reconnect.'
            );
          }
        } finally {
          syncing.set(false);
        }
      });
    return saveQueue;
  }
  async function loadUser(next: Session | null) {
    session.set(next);
    const nextOwner = next?.user.id || null;
    if (owner === nextOwner && get(ready)) return;
    owner = nextOwner;
    const version = ++generation;
    const startRevision = revision;
    let local = read(key(), null) as Preferences | null;
    if (!local && !owner) {
      // Carry over existing local preference keys before saving the current format.
      local = normalizePreferences({
        favoriteMovies: read('user_favorites', []) as Media[],
        watchlist: read('user_watchlist', []) as Media[],
        watchHistory: read('user_watch_history', []) as Media[],
        likedGenres: read('user_liked_genres', []) as string[],
        dislikedGenres: read('user_disliked_genres', []) as string[],
        collections: read('user_collections', []) as Preferences['collections']
      });
    }
    const initial = normalizePreferences(local);
    preferences.set(initial);
    if (!owner) persist(initial);
    ready.set(true);
    if (!next) return;
    try {
      const remote = await api<Preferences & { _isDefault?: boolean }>(
        '/api/preferences'
      );
      if (version !== generation) return;
      if (read(`${key()}:pending`, false) || revision !== startRevision) {
        await sync();
        return;
      }
      if (remote._isDefault) {
        const guest = normalizePreferences(
          read('ymovies:preferences:guest', local) as Preferences
        );
        preferences.set(guest);
        persist(guest);
        await sync(guest);
      } else {
        const value = normalizePreferences(remote);
        preferences.set(value);
        persist(value);
      }
    } catch {
      if (version === generation)
        tell(
          'Your library is available on this device. Account sync is temporarily unavailable.'
        );
    }
  }
  function init() {
    ensureClient();
    const subscription = client?.auth.onAuthStateChange((_event, next) => {
      // Supabase callbacks must return before making another auth request.
      queueMicrotask(() => {
        void loadUser(next);
      });
    }).data.subscription;
    if (client)
      client.auth
        .getSession()
        .then(({ data }) => loadUser(data.session))
        .catch(() => loadUser(null));
    else void loadUser(null);
    const online = () => {
      void sync();
    };
    window.addEventListener('online', online);
    return () => {
      subscription?.unsubscribe();
      window.removeEventListener('online', online);
      clearTimeout(timer);
    };
  }
  function update(patch: Partial<Preferences>) {
    revision++;
    const next = normalizePreferences({ ...get(preferences), ...patch });
    preferences.set(next);
    persist(next);
    if (owner) {
      try {
        localStorage.setItem(`${key()}:pending`, 'true');
      } catch {}
    }
    return sync(next);
  }
  function toggle(kind: 'watchlist' | 'favoriteMovies', item: Media) {
    return update({ [kind]: toggleMedia(get(preferences)[kind], item) });
  }
  async function watch(item: Media, progress = 100, rating?: number) {
    const prefs = get(preferences);
    const previous = prefs.watchHistory.find(
      (entry) => mediaKey(entry) === mediaKey(item)
    );
    const entry = {
      ...item,
      watchData: {
        ...previous?.watchData,
        watchProgress: progress,
        completed: progress === 100,
        watchedAt: new Date().toISOString(),
        ...(rating !== undefined ? { rating } : {})
      }
    };
    await update({
      watchHistory: [
        entry,
        ...prefs.watchHistory.filter(
          (other) => mediaKey(other) !== mediaKey(item)
        )
      ]
    });
    if (get(session) && mediaType(item) === 'movie') {
      try {
        await api('/api/history', {
          method: 'POST',
          body: JSON.stringify({
            movieId: item.id,
            watchProgress: progress,
            ...(rating !== undefined ? { rating } : {})
          })
        });
      } catch {
        tell(
          'Watch history saved on this device. Progress sync is temporarily unavailable.'
        );
      }
    }
  }
  function auth() {
    const active = ensureClient();
    if (!active)
      throw new Error(
        'Sign in is not configured. Add the Supabase public environment variables.'
      );
    return active.auth;
  }
  return {
    session,
    ready,
    preferences,
    notice,
    syncing,
    init,
    api,
    update,
    toggle,
    watch,
    tell,
    auth
  };
}
export type AppState = ReturnType<typeof createAppState>;
export const useApp = () => getContext<AppState>(APP_STATE);
