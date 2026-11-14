<script lang="ts">
  import { page } from '$app/state';
  import type { browseCatalog } from '../../server/catalog';
  import { movieGenres, tvGenres } from '#lib/genres.ts';
  import { mediaKey } from '#lib/types/media.ts';
  import MediaCard from './MediaCard.svelte';
  let { data }: { data: Awaited<ReturnType<typeof browseCatalog>> } = $props();
  const labels: Record<string, string> = {
    trending: 'Trending',
    popular: 'Popular',
    top_rated: 'Top rated',
    upcoming: 'Upcoming',
    now_playing: 'Now playing',
    airing_today: 'Airing today',
    on_the_air: 'On the air'
  };
  let categories = $derived(
    data.type === 'movie'
      ? ['trending', 'popular', 'top_rated', 'upcoming', 'now_playing']
      : ['trending', 'popular', 'top_rated', 'airing_today', 'on_the_air']
  );
  function link(changes: Record<string, string>) {
    const params = new URLSearchParams(page.url.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    return `${page.url.pathname}?${params}`;
  }
</script>

<svelte:head
  ><title>{data.title} — YMovies</title><meta
    name="description"
    content={`Discover ${data.title.toLowerCase()} and find your next favorite on YMovies.`}
  /></svelte:head
>
<main id="main" class="page-container">
  <p class="eyebrow">Discover something great</p>
  <h1 class="page-title">{data.title}</h1>
  <nav class="tabs" aria-label="Catalog categories">
    {#each categories as category}<a
        class:active={data.category === category}
        href={link({ category, page: '1', genre: '', sort: '' })}
        >{labels[category]}</a
      >{/each}
  </nav>
  <form class="filter-bar" method="GET">
    <input type="hidden" name="category" value={data.category} /><label
      >Genre<select name="genre" value={String(data.selectedGenre || '')}
        ><option value="">All genres</option
        >{#each data.type === 'movie' ? movieGenres : tvGenres as [id, name]}<option
            value={id}>{name}</option
          >{/each}</select
      ></label
    ><label
      >Release year<input
        name="year"
        type="number"
        min="1888"
        max="2100"
        value={data.year}
        placeholder="Any year"
      /></label
    ><label
      >Sort by<select name="sort" value={data.sort}
        ><option value="popularity.desc">Most popular</option><option
          value="vote_average.desc">Highest rated</option
        ><option
          value={data.type === 'movie'
            ? 'primary_release_date.desc'
            : 'first_air_date.desc'}>Newest first</option
        ></select
      ></label
    ><button class="button secondary" type="submit">Apply filters</button><span
      class="muted">{data.totalResults.toLocaleString()} titles</span
    >
  </form>
  {#if data.unavailable}<div class="empty-state" role="status">
      <h2>The catalog is temporarily unavailable</h2>
      <p>Please try again in a moment.</p>
      <a
        class="button primary"
        href={page.url.pathname + page.url.search}
        data-sveltekit-reload>Try again</a
      >
    </div>{:else if !data.items.length}<div class="empty-state">
      <h2>No titles found</h2>
      <p>Try a different genre or sort order.</p>
    </div>{:else}<div class="media-grid">
      {#each data.items as item (mediaKey(item))}<MediaCard {item} />{/each}
    </div>{/if}
  {#if data.totalPages > 1}<nav class="pagination" aria-label="Catalog pages">
      {#if data.page > 1}<a
          class="button secondary"
          href={link({ page: String(data.page - 1) })}>Previous</a
        >{/if}<span>Page {data.page} of {data.totalPages}</span
      >{#if data.page < data.totalPages}<a
          class="button secondary"
          href={link({ page: String(data.page + 1) })}>Next</a
        >{/if}
    </nav>{/if}
</main>
