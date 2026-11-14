import assert from 'node:assert/strict';
import test from 'node:test';
import { get } from 'svelte/store';
import {
  normalizePreferences,
  safeNext,
  toggleMedia
} from '../src/lib/preferences';
import { mediaHref, mediaKey, type Media } from '../src/lib/types/media';
import { createAppState } from '../src/lib/state';

test('movie and TV titles with the same numeric ID remain separate library entries', () => {
  const movie: Media = { id: 42, title: 'Movie', media_type: 'movie' };
  const tv: Media = { id: 42, name: 'Series', media_type: 'tv' };
  const entries = toggleMedia([movie], tv);
  assert.equal(entries.length, 2);
  assert.deepEqual(toggleMedia(entries, movie), [tv]);
  assert.notEqual(mediaKey(movie), mediaKey(tv));
});

test('legacy TV collection items normalized with a title still route to the TV detail', () => {
  const legacy: Media = {
    id: 1399,
    name: 'Game of Thrones',
    title: 'Game of Thrones',
    first_air_date: '2011-04-17'
  };
  assert.equal(mediaHref(legacy), '/tv/1399');
});

test('malformed saved preferences cannot break the catalog or collections', () => {
  const malformed = {
    watchlist: [null, { id: -1 }, { id: 1, title: 'Valid' }],
    favoriteMovies: 'bad',
    collections: [{ id: 'a', name: 'Weekend', items: null }, null],
    appSettings: null
  };
  const normalized = normalizePreferences(malformed as never);
  assert.deepEqual(normalized.watchlist, [{ id: 1, title: 'Valid' }]);
  assert.deepEqual(normalized.favoriteMovies, []);
  assert.deepEqual(normalized.collections[0].items, []);
  assert.deepEqual(normalized.appSettings, {});
  normalized.watchlist.push({ id: 2, title: 'Other' });
  assert.deepEqual(normalizePreferences(null).watchlist, []);
});

test('auth return URLs reject external origins and browser URL normalization tricks', () => {
  for (const value of [
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/\n/example.com',
    'javascript:alert(1)',
    null
  ])
    assert.equal(safeNext(value), '/home');
  assert.equal(safeNext('/my-list?tab=favorites'), '/my-list?tab=favorites');
});

test('legacy guest lists migrate and survive a new Svelte layout without sharing live state', async () => {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  const values = new Map<string, string>();
  const local = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    }
  };
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: local
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { addEventListener() {}, removeEventListener() {} }
  });
  values.set(
    'user_watchlist',
    JSON.stringify([{ id: 550, title: 'Fight Club' }])
  );
  values.set(
    'user_collections',
    JSON.stringify([
      {
        id: 'weekend',
        name: 'Weekend',
        items: [{ id: 550, title: 'Fight Club' }]
      }
    ])
  );
  const first = createAppState({ url: '', key: '' });
  const dispose = first.init();
  let disposeSecond = () => {};
  try {
    assert.equal(get(first.ready), true);
    assert.equal(get(first.preferences).watchlist[0].id, 550);
    assert.equal(get(first.preferences).collections[0].name, 'Weekend');
    await first.toggle('watchlist', {
      id: 550,
      name: 'A TV title',
      media_type: 'tv'
    });
    const second = createAppState({ url: '', key: '' });
    assert.deepEqual(get(second.preferences).watchlist, []);
    disposeSecond = second.init();
    assert.equal(get(second.preferences).watchlist.length, 2);
    await first.toggle('watchlist', { id: 550, title: 'Fight Club' });
    assert.equal(get(first.preferences).watchlist.length, 1);
    assert.equal(get(second.preferences).watchlist.length, 2);
  } finally {
    dispose();
    disposeSecond();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow
    });
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalStorage
    });
  }
});
