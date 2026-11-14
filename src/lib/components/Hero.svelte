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
  import { movieGenres, tvGenres } from '#lib/genres.ts';
  import { useApp } from '#lib/state.ts';
  import Icon from './Icon.svelte';
  let { items, compact = false }: { items: Media[]; compact?: boolean } =
    $props();
  const app = useApp();
  const { preferences } = app;
  let index = $state(0);
  let paused = $state(false);
  let visible = $state(true);
  let systemReducedMotion = $state(false);
  onMount(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => (systemReducedMotion = motion.matches);
    const updateVisibility = () => (visible = !document.hidden);
    updateMotion();
    updateVisibility();
    motion.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      motion.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  });
  let previous = $state<Media | null>(null);
  let item = $derived(items.length ? items[index % items.length] : null);
  let saved = $derived(
    item &&
      $preferences.watchlist.some(
        (value) => mediaKey(value) === mediaKey(item!)
      )
  );
  let genres = $derived(
    item?.genres
      ?.map((genre) => genre.name)
      .slice(0, 1)
      .join('') ||
      (item?.media_type === 'tv' ? tvGenres : movieGenres).find(
        ([id]) => id === item?.genre_ids?.[0]
      )?.[1] ||
      (item?.media_type === 'tv' ? 'TV Series' : 'Movie')
  );
  let logos = $state<Record<string, string>>({});
  let failedLogo = $state('');
  $effect(() => {
    const current = item;
    if (!current || current.logo_path || logos[mediaKey(current)] !== undefined)
      return;
    const controller = new AbortController();
    fetch(
      '/api/tmdb/' +
        (current.media_type || 'movie') +
        '/' +
        current.id +
        '/images?include_image_language=en,null',
      { signal: controller.signal }
    )
      .then((response) => (response.ok ? response.json() : { logos: [] }))
      .then((data) => {
        if (!controller.signal.aborted) {
          const logo =
            data.logos?.find(
              (value: { iso_639_1: string }) => value.iso_639_1 === 'en'
            ) || data.logos?.[0];
          logos = { ...logos, [mediaKey(current)]: logo?.file_path || '' };
        }
      })
      .catch(() => {});
    return () => controller.abort();
  });
  let logo = $derived(
    $preferences.appSettings.showLogos === false
      ? ''
      : item
        ? item.logo_path || logos[mediaKey(item)]
        : ''
  );
  $effect(() => {
    if (item?.backdrop_path)
      document.body.style.setProperty(
        '--ambient-image',
        'url("' + imageUrl(item.backdrop_path, 'w300') + '")'
      );
  });
  function go(next: number) {
    if (!items.length) return;
    previous = item;
    index = (next + items.length) % items.length;
  }
  $effect(() => {
    const currentIndex = index;
    if (
      paused ||
      !visible ||
      $preferences.appSettings.reduceMotion ||
      systemReducedMotion
    )
      return;
    const timer = setTimeout(() => go(currentIndex + 1), 8000);
    return () => clearTimeout(timer);
  });
</script>

{#if item}<section
    class="ym-hero hero"
    class:compact
    aria-label="Featured titles"
  >
    {#if previous}{#key mediaKey(previous)}<div
          class="hero-background-glow outgoing"
          style:background-image={'url("' +
            imageUrl(previous.backdrop_path || previous.poster_path, 'w300') +
            '")'}
          aria-hidden="true"
        ></div>
        <img
          class="ym-hero-image outgoing"
          src={imageUrl(
            previous.backdrop_path || previous.poster_path,
            'w1280'
          )}
          alt=""
        />{/key}{/if}
    {#key mediaKey(item)}<div
        class="hero-background-glow"
        style:background-image={'url("' +
          imageUrl(item.backdrop_path || item.poster_path, 'w300') +
          '")'}
        aria-hidden="true"
      ></div>
      <img
        class="ym-hero-image"
        src={imageUrl(item.backdrop_path || item.poster_path, 'w1280')}
        alt=""
        fetchpriority="high"
      />{/key}
    <div class="ym-hero-scrim"></div>
    {#key mediaKey(item)}<div class="ym-hero-copy hero-copy">
        <h1
          class="ym-hero-title"
          class:has-logo={!!logo && failedLogo !== mediaKey(item)}
        >
          {#if logo && failedLogo !== mediaKey(item)}<img
              src={imageUrl(logo, 'w500')}
              alt={mediaTitle(item)}
              onerror={() => (failedLogo = mediaKey(item!))}
            />{:else}{mediaTitle(item)}{/if}
        </h1>
        <div class="ym-hero-meta">
          <span
            ><Icon name="star" size={17} />{item.vote_average?.toFixed(1) ||
              '—'}</span
          ><i>•</i><span
            ><Icon name="calendar" size={16} />{mediaYear(item)}</span
          ><i>•</i><span><Icon name="globe" size={16} />{genres}</span>
        </div>
        {#if item.rank}<p class="hero-ranking">
            <img src="/images/landing/brand-mark.svg" alt="" />#{item.rank} on YMovies
            today
          </p>{/if}
        <p class="ym-hero-overview">{item.overview}</p>
        <div class="ym-hero-actions">
          <a class="button primary hero-play" href={mediaHref(item)}
            ><Icon name="play" size={21} />Play</a
          >
          <div class="hero-split-button">
            <button
              aria-label={saved ? 'Remove from list' : 'Add to list'}
              aria-pressed={saved}
              onclick={() => app.toggle('watchlist', item!)}
              ><Icon name={saved ? 'check' : 'plus'} size={23} /></button
            ><span></span><a href={mediaHref(item)} aria-label="More Info"
              ><Icon name="info" size={24} /></a
            >
          </div>
        </div>
      </div>{/key}
    <div class="ym-hero-dots">
      {#each items as value, n}<button
          class:active={index % items.length === n}
          aria-label={'Go to slide ' + (n + 1)}
          aria-pressed={index % items.length === n}
          onclick={() => go(n)}
          >{#if index % items.length === n}{#key index}<span
                style:animation-play-state={paused ? 'paused' : 'running'}
              ></span>{/key}{/if}</button
        >{/each}<button
        class="hero-pause"
        aria-label={paused ? 'Resume featured titles' : 'Pause featured titles'}
        aria-pressed={paused}
        onclick={() => (paused = !paused)}
        ><Icon name={paused ? 'play' : 'pause'} size={12} /></button
      >
    </div>
  </section>{/if}
