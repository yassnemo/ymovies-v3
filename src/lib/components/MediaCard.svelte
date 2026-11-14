<script lang="ts">
  import { onDestroy } from 'svelte';
  import { useApp } from '#lib/state.ts';
  import {
    mediaHref,
    mediaKey,
    mediaTitle,
    mediaYear,
    imageUrl,
    type Media
  } from '#lib/types/media.ts';
  import Icon from './Icon.svelte';
  let { item }: { item: Media } = $props();
  const app = useApp();
  const { preferences } = app;
  let favorite = $derived(
    $preferences.favoriteMovies.some(
      (value) => mediaKey(value) === mediaKey(item)
    )
  );
  let saved = $derived(
    $preferences.watchlist.some((value) => mediaKey(value) === mediaKey(item))
  );
  let card = $state<HTMLElement>(null!);
  let preview = $state(false);
  let previewElement = $state<HTMLElement | undefined>();
  let position = $state({ left: 0, top: 0, width: 330 });
  let timer: ReturnType<typeof setTimeout>;
  function enter(event: MouseEvent | FocusEvent) {
    clearTimeout(timer);
    if (
      typeof window === 'undefined' ||
      innerWidth < 1024 ||
      ('pointerType' in event && event.pointerType === 'touch')
    )
      return;
    timer = setTimeout(() => {
      const r = card.getBoundingClientRect();
      position = {
        left: Math.max(16, Math.min(innerWidth - 346, r.x + r.width / 2 - 165)),
        top: Math.max(85, Math.min(innerHeight - 360, r.y - 25)),
        width: 330
      };
      preview = true;
    }, 450);
  }
  function leave(event?: MouseEvent | FocusEvent) {
    const next = event?.relatedTarget as Node | null;
    if (next && (card.contains(next) || previewElement?.contains(next))) return;
    clearTimeout(timer);
    preview = false;
  }
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }
  onDestroy(() => clearTimeout(timer));
</script>

<article
  class="ym-card media-card movie-card"
  bind:this={card}
  onmouseenter={enter}
  onmouseleave={leave}
  onfocusin={enter}
  onfocusout={(event) => {
    leave(event);
  }}
>
  <a
    class="poster"
    href={mediaHref(item)}
    aria-label={'View ' + mediaTitle(item)}
    ><img
      src={imageUrl(item.poster_path, 'w342')}
      alt={mediaTitle(item) + ' poster'}
      width="200"
      height="300"
      loading="lazy"
      onerror={(event) => {
        const img = event.currentTarget as HTMLImageElement;
        if (!img.src.endsWith('/notFound.svg')) img.src = '/notFound.svg';
      }}
    />
    <div class="card-caption">
      <strong class="card-title">{mediaTitle(item)}</strong>
      <p class="card-meta">
        {mediaYear(item)}
        <span
          ><Icon name="star" size={12} />{item.vote_average?.toFixed(1) ||
            '—'}</span
        >
      </p>
    </div>
    {#if item.watchData?.watchProgress}<span
        class="watch-progress"
        style={'--progress:' + item.watchData.watchProgress + '%'}
      ></span>{/if}
  </a>
  <div class="card-actions">
    <button
      aria-label={(saved ? 'Remove ' : 'Save ') +
        mediaTitle(item) +
        (saved ? ' from watchlist' : ' to watchlist')}
      aria-pressed={saved}
      class:chosen={saved}
      onclick={() => app.toggle('watchlist', item)}
      ><Icon name={saved ? 'check' : 'plus'} size={18} /></button
    ><button
      aria-label={(favorite ? 'Unfavorite ' : 'Favorite ') + mediaTitle(item)}
      aria-pressed={favorite}
      class:chosen={favorite}
      onclick={() => app.toggle('favoriteMovies', item)}
      ><Icon name="heart" size={17} /></button
    >
  </div>
  {#if preview}<div
      class="card-preview"
      use:portal
      bind:this={previewElement}
      onmouseleave={leave}
      onfocusout={leave}
      style={'left:' +
        position.left +
        'px;top:' +
        position.top +
        'px;width:' +
        position.width +
        'px'}
      role="group"
      aria-label={mediaTitle(item) + ' preview'}
    >
      <a href={mediaHref(item)} class="preview-image"
        ><img
          src={imageUrl(item.backdrop_path || item.poster_path, 'w780')}
          alt=""
        /><span class="preview-play"><Icon name="play" size={30} /></span></a
      >
      <div class="preview-copy">
        <h3>{mediaTitle(item)}</h3>
        <p class="preview-meta">
          ★ {item.vote_average?.toFixed(1) || '—'}
          <span>{mediaYear(item)}</span><span
            >{item.media_type === 'tv' ? 'TV Series' : 'Movie'}</span
          >
        </p>
        <p class="preview-overview">{item.overview}</p>
        <div class="preview-actions">
          <a class="button primary small" href={mediaHref(item)}
            ><Icon name="play" size={16} />Play</a
          ><button
            class="icon-button"
            aria-label={saved ? 'Remove from list' : 'Add to list'}
            aria-pressed={saved}
            onclick={() => app.toggle('watchlist', item)}
            ><Icon name={saved ? 'check' : 'plus'} /></button
          ><a class="icon-button" href={mediaHref(item)} aria-label="More info"
            ><Icon name="info" /></a
          >
        </div>
      </div>
    </div>{/if}
</article>
