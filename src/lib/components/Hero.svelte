<script lang="ts">
  import { onMount } from 'svelte';
  import type { Media } from '#lib/types/media.ts';
  import {
    mediaTitle,
    mediaHref,
    mediaYear,
    mediaKey,
    imageUrl
  } from '#lib/types/media.ts';
  import { useApp } from '#lib/state.ts';
  import Icon from './Icon.svelte';
  let { items }: { items: Media[] } = $props();
  const app = useApp();
  const { preferences } = app;
  let index = $state(0);
  let paused = $state(false);
  let hover = $state(false);
  let item = $derived(items[index % items.length]);
  let saved = $derived(
    item &&
      $preferences.watchlist.some((value) => mediaKey(value) === mediaKey(item))
  );
  onMount(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const timer = setInterval(() => {
      if (
        !paused &&
        !hover &&
        !motion.matches &&
        !document.hidden &&
        items.length
      )
        index = (index + 1) % items.length;
    }, 8000);
    return () => clearInterval(timer);
  });
</script>

{#if item}<section
    class="hero"
    aria-label="Featured titles"
    onpointerenter={() => (hover = true)}
    onpointerleave={() => (hover = false)}
  >
    {#key item.id}<img
        class="hero-backdrop"
        src={imageUrl(item.backdrop_path || item.poster_path, 'w1280')}
        alt=""
        fetchpriority="high"
      />{/key}
    <div class="hero-shade"></div>
    <div class="hero-copy">
      <p class="eyebrow">Your next great watch</p>
      <h1>{mediaTitle(item)}</h1>
      <p class="hero-meta">
        {mediaYear(item)}
        <span>★ {item.vote_average?.toFixed(1) || '—'}</span><span
          >{item.media_type === 'tv' ? 'TV series' : 'Movie'}</span
        >
      </p>
      <p class="hero-overview">{item.overview}</p>
      <div class="actions">
        <a class="button primary" href={mediaHref(item)}
          ><Icon name="info" />More details</a
        ><button
          class="button glass"
          aria-pressed={saved}
          onclick={() => app.toggle('watchlist', item)}
          ><Icon name={saved ? 'check' : 'plus'} />{saved
            ? 'In my list'
            : 'My list'}</button
        >
      </div>
    </div>
    <div class="hero-controls">
      <button
        class="icon-button"
        aria-label="Previous featured title"
        onclick={() => (index = (index - 1 + items.length) % items.length)}
        ><Icon name="left" /></button
      ><span>{(index % items.length) + 1} / {items.length}</span><button
        class="icon-button"
        aria-label="Next featured title"
        onclick={() => (index = (index + 1) % items.length)}
        ><Icon name="right" /></button
      ><button
        class="icon-button"
        aria-label={paused ? 'Resume featured titles' : 'Pause featured titles'}
        aria-pressed={paused}
        onclick={() => (paused = !paused)}
        ><Icon name={paused ? 'play' : 'pause'} size={16} /></button
      >
    </div>
  </section>{/if}
