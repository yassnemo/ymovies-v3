<script lang="ts">
  import { onMount } from 'svelte';
  import type { CatalogSection, Media, MediaType } from '#lib/types/media.ts';
  import MediaRow from './MediaRow.svelte';
  let target = $state<HTMLElement>(null!);
  let sections = $state<CatalogSection[]>([]);
  let loading = $state(false);
  let active = false;
  let generation = 0;
  let rotation = 0;
  const definitions: [string, MediaType, Record<string, string>][] = [
    ['A little action', 'movie', { with_genres: '28' }],
    ['Stories beyond this world', 'movie', { with_genres: '878' }],
    ['Something to make you laugh', 'movie', { with_genres: '35' }],
    ['Korean cinema', 'movie', { with_original_language: 'ko' }],
    [
      'One evening, one great film',
      'movie',
      {
        'with_runtime.lte': '100',
        'vote_average.gte': '7',
        'vote_count.gte': '300'
      }
    ],
    ['Animated worlds', 'tv', { with_genres: '16' }],
    ['Mysteries worth solving', 'tv', { with_genres: '9648' }],
    ['French favorites', 'movie', { with_original_language: 'fr' }],
    ['Real stories', 'movie', { with_genres: '99' }],
    ['Stay in suspense', 'movie', { with_genres: '53' }]
  ];
  async function refresh() {
    if (loading) return;
    loading = true;
    const version = ++generation;
    const offset =
      Math.floor(Date.now() / (30 * 60 * 1000)) % definitions.length;
    const chosen = Array.from(
      { length: 4 },
      (_, index) =>
        definitions[(offset + index + rotation) % definitions.length]
    );
    rotation = (rotation + 4) % definitions.length;
    const results = await Promise.allSettled(
      chosen.map(async ([title, type, params]) => {
        const query = new URLSearchParams({
          sort_by: 'popularity.desc',
          ...params
        });
        const response = await fetch(`/api/tmdb/discover/${type}?${query}`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        return {
          title,
          items: (data.results || []).map((item: Media) => ({
            ...item,
            media_type: type
          }))
        };
      })
    );
    if (version !== generation) return;
    sections = results.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    );
    loading = false;
  }
  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          active = true;
          void refresh();
          observer.disconnect();
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(target);
    const timer = setInterval(
      () => {
        if (active && !document.hidden) void refresh();
      },
      30 * 60 * 1000
    );
    return () => {
      generation++;
      observer.disconnect();
      clearInterval(timer);
    };
  });
</script>

<section bind:this={target} style="min-height:100px">
  <div class="section-heading">
    <h2>A little more to discover</h2>
    <button class="button secondary small" onclick={refresh} disabled={loading}
      >{loading ? 'Finding stories…' : 'Refresh picks'}</button
    >
  </div>
  {#each sections as section}<MediaRow {...section} />{/each}
</section>
