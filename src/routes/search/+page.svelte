<script lang="ts">
  import { page } from '$app/state';
  import type { PageProps } from './$types';
  import { mediaKey } from '#lib/types/media.ts';
  import MediaCard from '#lib/components/MediaCard.svelte';
  import MediaRow from '#lib/components/MediaRow.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import SearchInput from '#lib/components/SearchInput.svelte';
  import { movieGenres, tvGenres } from '#lib/genres.ts';
  let { data }: PageProps = $props();
  function link(number: number) {
    const params = new URLSearchParams(page.url.search);
    params.set('page', String(number));
    return `/search?${params}`;
  }
</script>

<svelte:head
  ><title>{data.q ? `Search: ${data.q}` : 'Search'} — YMovies</title
  ></svelte:head
>
<main id="main" class="page-container">
  <p class="eyebrow">Find your next favorite</p>
  <h1 class="page-title">Search</h1>
  <form method="GET">
    <div class="search-form">
      <SearchInput value={data.q} /><button class="button primary" type="submit"
        ><Icon name="search" />Search</button
      >
    </div>
    <div class="filter-bar">
      <label
        >Type<select name="type" value={data.type}
          ><option value="multi">Movies &amp; TV shows</option><option
            value="movie">Movies</option
          ><option value="tv">TV shows</option></select
        ></label
      >
      <label
        >Release year<input
          name="year"
          type="number"
          min="1888"
          max="2100"
          value={data.year}
          placeholder="Any year"
        /></label
      >
      <label
        >Minimum rating<select name="rating" value={data.rating}
          ><option value="0">Any rating</option
          >{#each [5, 6, 7, 8, 9] as rating}<option value={rating}
              >{rating}+ / 10</option
            >{/each}</select
        ></label
      >
      <label
        >Sort by<select name="sortBy" value={data.sort}
          ><option value="">Recommended</option><option value="popularity.desc"
            >Most popular</option
          ><option value="release_date.desc">Newest first</option><option
            value="release_date.asc">Oldest first</option
          ><option value="vote_average.desc">Top rated</option></select
        ></label
      >
      <label
        >Genre<select name="genre" value={String(data.selectedGenre || '')}
          ><option value="">All genres</option
          >{#each data.type === 'tv' ? tvGenres : movieGenres as [id, name]}<option
              value={id}>{name}</option
            >{/each}</select
        ></label
      >
      <label
        >Language<select name="language" value={data.language}
          ><option value="">All languages</option><option value="en"
            >English</option
          ><option value="ar">Arabic</option><option value="fr">French</option
          ><option value="es">Spanish</option><option value="ko">Korean</option
          ><option value="ja">Japanese</option><option value="hi">Hindi</option
          ><option value="zh">Chinese</option><option value="de">German</option
          ><option value="it">Italian</option></select
        ></label
      >
      {#if !data.q}<label
          >Country<select name="country" value={data.country}
            ><option value="">All countries</option><option value="US"
              >United States</option
            ><option value="MA">Morocco</option><option value="GB"
              >United Kingdom</option
            ><option value="FR">France</option><option value="KR"
              >South Korea</option
            ><option value="JP">Japan</option><option value="IN">India</option
            ></select
          ></label
        >{/if}
      <button class="button secondary" type="submit">Apply filters</button
      >{#if data.filtered}<a
          class="button secondary"
          href={`/search?q=${encodeURIComponent(data.q)}&type=${data.type}`}
          >Clear filters</a
        >{/if}
    </div>
  </form>
  {#if data.unavailable}<div class="empty-state" role="status">
      <h2>Search is temporarily unavailable</h2>
      <p>Please try again in a moment.</p>
    </div>
  {:else if data.q || data.filtered}<div class="section-heading">
      <h2>{data.q ? `Results for “${data.q}”` : 'Discover titles'}</h2>
      <span class="muted">Page {data.page}</span>
    </div>
    {#if data.items.length}<div class="media-grid">
        {#each data.items as item (mediaKey(item))}<MediaCard {item} />{/each}
      </div>{:else}<div class="empty-state">
        <h2>No matches found</h2>
        <p>Try a different title or remove a filter.</p>
      </div>{/if}
    {#if data.totalPages > 1}<nav
        class="pagination"
        aria-label="Search result pages"
      >
        {#if data.page > 1}<a
            class="button secondary"
            href={link(data.page - 1)}>Previous</a
          >{/if}<span>Page {data.page} of {data.totalPages}</span
        >{#if data.page < data.totalPages}<a
            class="button secondary"
            href={link(data.page + 1)}>Next</a
          >{/if}
      </nav>{/if}
  {:else}{#each data.sections as section}<MediaRow {...section} />{/each}{/if}
</main>
