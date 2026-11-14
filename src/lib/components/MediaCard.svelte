<script lang="ts">
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
</script>

<article class="media-card movie-card">
  <a
    class="poster"
    href={mediaHref(item)}
    aria-label={`View ${mediaTitle(item)}`}
    ><img
      src={imageUrl(item.poster_path, 'w342')}
      alt={`${mediaTitle(item)} poster`}
      width="342"
      height="513"
      loading="lazy"
      onerror={(event) => {
        const img = event.currentTarget as HTMLImageElement;
        if (!img.src.endsWith('/notFound.svg')) img.src = '/notFound.svg';
      }}
    />
    {#if (item.vote_average || 0) > 0}<span class="rating"
        ><Icon name="star" size={12} />{item.vote_average?.toFixed(1)}</span
      >{/if}
    {#if item.watchData?.watchProgress}<span
        class="watch-progress"
        style={`--progress:${item.watchData.watchProgress}%`}
      ></span>{/if}
  </a>
  <div class="card-actions">
    <button
      class:chosen={saved}
      aria-pressed={saved}
      aria-label={`${saved ? 'Remove' : 'Save'} ${mediaTitle(item)} ${saved ? 'from' : 'to'} watchlist`}
      onclick={() => app.toggle('watchlist', item)}
      ><Icon name={saved ? 'check' : 'plus'} size={17} /></button
    ><button
      class:chosen={favorite}
      aria-pressed={favorite}
      aria-label={`${favorite ? 'Unfavorite' : 'Favorite'} ${mediaTitle(item)}`}
      onclick={() => app.toggle('favoriteMovies', item)}
      ><Icon name="heart" size={16} /></button
    >
  </div>
  <a class="card-title" href={mediaHref(item)}>{mediaTitle(item)}</a>
  <p class="card-meta">
    {mediaYear(item)}<span
      >{item.media_type === 'tv' || item.name ? 'TV show' : 'Movie'}</span
    >
  </p>
</article>
