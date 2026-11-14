<script lang="ts">
  import { useApp } from '#lib/state.ts';
  import {
    mediaKey,
    mediaTitle,
    mediaYear,
    imageUrl,
    type Detail,
    type MediaType,
    type Video
  } from '#lib/types/media.ts';
  import Icon from './Icon.svelte';
  import MediaRow from './MediaRow.svelte';
  import Episodes from './Episodes.svelte';
  import Providers from './Providers.svelte';
  import { genreHref } from '#lib/genres.ts';
  let { data }: { data: { item: Detail; type: MediaType } } = $props();
  const app = useApp();
  const { preferences } = app;
  let item = $derived(data.item);
  let saved = $derived(
    $preferences.watchlist.some((value) => mediaKey(value) === mediaKey(item))
  );
  let favorite = $derived(
    $preferences.favoriteMovies.some(
      (value) => mediaKey(value) === mediaKey(item)
    )
  );
  let history = $derived(
    $preferences.watchHistory.find(
      (value) => mediaKey(value) === mediaKey(item)
    )
  );
  let videos = $derived(
    (item.videos?.results || []).filter(
      (video) => video.site === 'YouTube' && /^[a-zA-Z0-9_-]+$/.test(video.key)
    )
  );
  let selectedVideo = $state<Video | null>(null);
  let dialog: HTMLDialogElement;
  let tab = $state('cast');
  let collection = $state('');
  let progress = $state(0);
  let expandedReviews = $state<string[]>([]);
  let expandedOverview = $state(false);
  let directors = $derived(
    (item.credits?.crew || [])
      .filter((person) => person.job === 'Director' || person.job === 'Creator')
      .map((person) => person.name)
      .filter((name, index, names) => names.indexOf(name) === index)
      .slice(0, 3)
  );
  let language = $derived(
    item.original_language
      ? new Intl.DisplayNames(['en'], { type: 'language' }).of(
          item.original_language
        )
      : null
  );
  $effect(() => {
    item.id;
    tab = 'cast';
    collection = '';
    expandedOverview = false;
    document.body.style.setProperty(
      '--ambient-image',
      'url("' + imageUrl(item.backdrop_path || item.poster_path, 'w300') + '")'
    );
  });
  $effect(() => {
    progress = history?.watchData?.watchProgress || 0;
  });
  function play(video: Video) {
    selectedVideo = video;
    dialog.showModal();
  }
  async function addCollection() {
    const value = $preferences.collections.find(
      (entry) => entry.id === collection
    );
    if (!value) return;
    if (value.items.some((entry) => mediaKey(entry) === mediaKey(item))) {
      app.tell('This title is already in the collection.');
      return;
    }
    await app.update({
      collections: $preferences.collections.map((entry) =>
        entry.id === collection
          ? { ...entry, items: [...entry.items, item] }
          : entry
      )
    });
    app.tell(`Added to ${value.name}.`);
  }
</script>

<main id="main">
  <section class="detail-hero">
    <div
      class="hero-background-glow"
      style:background-image={'url("' +
        imageUrl(item.backdrop_path || item.poster_path, 'w300') +
        '")'}
      aria-hidden="true"
    ></div>
    <img
      class="hero-backdrop"
      src={imageUrl(item.backdrop_path || item.poster_path, 'w1280')}
      alt=""
      fetchpriority="high"
    />
    <div class="hero-shade"></div>
    <img
      class="detail-poster"
      src={imageUrl(item.poster_path, 'w342')}
      alt={`${mediaTitle(item)} poster`}
      width="200"
      height="300"
    />
    <div class="detail-copy">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="/">Home</a><span aria-hidden="true">/</span><a
          href={data.type === 'tv' ? '/tv' : '/movies'}
          >{data.type === 'tv' ? 'TV shows' : 'Movies'}</a
        >
      </nav>
      <p class="eyebrow">{data.type === 'tv' ? 'TV series' : 'Movie'}</p>
      <h1>{mediaTitle(item)}</h1>
      {#if item.tagline}<p class="tagline">{item.tagline}</p>{/if}
      <div class="detail-meta">
        <span>{mediaYear(item)}</span><span
          >★ {item.vote_average?.toFixed(1) || '—'}</span
        >{#if item.runtime}<span
            >{Math.floor(item.runtime / 60)}h {item.runtime % 60}m</span
          >{/if}{#if item.number_of_seasons}<span
            >{item.number_of_seasons} seasons</span
          >{/if}<span>{item.status || ''}</span>
      </div>
      <div class="chip-list">
        {#each item.genres || [] as genre}<a
            class="chip"
            href={genreHref(data.type, genre.name)}>{genre.name}</a
          >{/each}
      </div>
      {#if directors.length}<p class="detail-director">
          Director: <strong>{directors.join(', ')}</strong>
        </p>{/if}
      <div class="overview detail-overview">
        <p class:clamped={!expandedOverview}>
          {item.overview || 'No overview available.'}
        </p>
        {#if (item.overview?.length || 0) > 140}<button
            class="more"
            aria-expanded={expandedOverview}
            onclick={() => (expandedOverview = !expandedOverview)}
            >{expandedOverview ? 'Read Less' : 'Read More'}</button
          >{/if}
      </div>
      <div class="actions">
        {#if videos[0]}<button
            class="button primary"
            onclick={() =>
              play(
                videos.find((video) => video.type === 'Trailer') || videos[0]
              )}><Icon name="play" />Watch trailer</button
          >{/if}<button
          class="button secondary"
          aria-label={saved ? 'Remove from my list' : 'Add to my list'}
          title={saved ? 'Remove from my list' : 'Add to my list'}
          aria-pressed={saved}
          onclick={() => app.toggle('watchlist', item)}
          ><Icon name={saved ? 'check' : 'plus'} />{saved
            ? 'In my list'
            : 'My list'}</button
        ><button
          class="button secondary"
          aria-label={favorite ? 'Unfavorite' : 'Favorite'}
          title={favorite ? 'Unfavorite' : 'Favorite'}
          aria-pressed={favorite}
          onclick={() => app.toggle('favoriteMovies', item)}
          ><Icon name="heart" />{favorite ? 'Favorited' : 'Favorite'}</button
        ><button
          class="button secondary"
          aria-label={history?.watchData?.completed
            ? 'Mark unwatched'
            : 'Mark watched'}
          title={history?.watchData?.completed
            ? 'Mark unwatched'
            : 'Mark watched'}
          onclick={() =>
            app.watch(item, history?.watchData?.completed ? 0 : 100)}
          ><Icon name="check" />{history?.watchData?.completed
            ? 'Mark unwatched'
            : 'Mark watched'}</button
        >
      </div>
    </div>
    {#if language || item.release_date || item.first_air_date}<aside
        class="detail-facts"
        aria-label="Title information"
      >
        {#if language}<div>
            <span>Language</span><strong>{language}</strong>
          </div>{/if}
        {#if item.release_date || item.first_air_date}<div>
            <span>{data.type === 'tv' ? 'First Aired' : 'Release Date'}</span
            ><strong
              >{new Date(
                (item.release_date || item.first_air_date) + 'T12:00:00Z'
              ).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
              })}</strong
            >
          </div>{/if}
      </aside>{/if}
  </section>
  <div class="page-container" style="padding-top:24px">
    <div class="two-columns">
      <section class="panel">
        <h2>Your watch progress</h2>
        <p>
          {history?.watchData?.completed ? 'Completed' : `${progress}% watched`}
        </p>
        <div class="filter-bar">
          <label style="flex:1"
            >Progress<input
              type="range"
              min="0"
              max="100"
              step="5"
              bind:value={progress}
            /></label
          ><button
            class="button secondary small"
            onclick={() => app.watch(item, progress)}>Save progress</button
          >
        </div>
        <div class="actions" role="group" aria-label="Rate this title">
          {#each [1, 2, 3, 4, 5] as rating}<button
              class="icon-button"
              style={rating <= (history?.watchData?.rating || 0)
                ? 'color:#f5c861'
                : ''}
              aria-label={`Rate ${rating} out of 5 stars`}
              aria-pressed={history?.watchData?.rating === rating}
              onclick={() =>
                app.watch(
                  item,
                  history?.watchData?.watchProgress || 100,
                  rating
                )}><Icon name="star" /></button
            >{/each}
        </div>
        {#if $preferences.collections.length}<div class="filter-bar">
            <label
              >Add to collection<select bind:value={collection}
                ><option value="">Choose collection</option
                >{#each $preferences.collections as entry}<option
                    value={entry.id}>{entry.name}</option
                  >{/each}</select
              ></label
            ><button
              class="button secondary small"
              disabled={!collection}
              onclick={addCollection}>Add</button
            >
          </div>{/if}
      </section>
      <Providers id={item.id} type={data.type} />
    </div>
    <nav class="tabs" aria-label="Title details">
      {#each data.type === 'tv' ? ['cast', 'episodes', 'reviews', 'videos'] : ['cast', 'reviews', 'videos'] as value}<button
          class:active={tab === value}
          aria-pressed={tab === value}
          onclick={() => (tab = value)}
          >{value === 'cast'
            ? 'Cast & crew'
            : value.charAt(0).toUpperCase() + value.slice(1)}</button
        >{/each}
    </nav>
    <section style="min-height:180px;margin-bottom:50px">
      {#if tab === 'cast'}<div class="section-heading"><h2>Cast</h2></div>
        <div class="cast-rail">
          {#each item.credits?.cast?.slice(0, 20) || [] as person}<div
              class="cast-person"
            >
              <img
                src={imageUrl(person.profile_path, 'w185')}
                alt={person.name}
                loading="lazy"
              /><strong>{person.name}</strong><span>{person.character}</span>
            </div>{:else}<p class="muted">
              No cast information available.
            </p>{/each}
        </div>
        <div class="chip-list">
          {#each (item.credits?.crew || [])
            .filter( (person) => ['Director', 'Creator', 'Screenplay', 'Executive Producer'].includes(person.job || '') )
            .slice(0, 8) as person}<span class="chip"
              >{person.name} · {person.job}</span
            >{/each}
        </div>
      {:else if tab === 'episodes'}<Episodes
          id={item.id}
          seasons={item.seasons || []}
        />
      {:else if tab === 'reviews'}{#each item.reviews?.results || [] as review}<article
            class="review"
          >
            <h3>{review.author}</h3>
            <p>
              {expandedReviews.includes(review.id)
                ? review.content
                : review.content.slice(0, 600)}{review.content.length > 600 &&
              !expandedReviews.includes(review.id)
                ? '…'
                : ''}
            </p>
            {#if review.content.length > 600}<button
                class="button secondary small"
                onclick={() =>
                  (expandedReviews = expandedReviews.includes(review.id)
                    ? expandedReviews.filter((id) => id !== review.id)
                    : [...expandedReviews, review.id])}
                >{expandedReviews.includes(review.id)
                  ? 'Read less'
                  : 'Read more'}</button
              >{/if}
          </article>{:else}<p class="muted">No reviews yet.</p>{/each}
      {:else}<div class="video-grid">
          {#each videos as video}<button onclick={() => play(video)}
              ><img
                src={`https://i.ytimg.com/vi/${video.key}/hqdefault.jpg`}
                alt=""
                loading="lazy"
              />
              <p>{video.name}</p></button
            >{:else}<p class="muted">No videos available.</p>{/each}
        </div>{/if}
    </section>
    <MediaRow
      title="More like this"
      items={(item.recommendations?.results?.length
        ? item.recommendations.results
        : item.similar?.results || []
      ).map((value) => ({ ...value, media_type: data.type }))}
    />
  </div>
</main>
<dialog
  class="trailer-dialog"
  bind:this={dialog}
  onclose={() => (selectedVideo = null)}
>
  <div class="section-heading">
    <h2>{selectedVideo?.name || 'Trailer'}</h2>
    <button
      class="icon-button"
      aria-label="Close trailer"
      onclick={() => dialog.close()}><Icon name="close" /></button
    >
  </div>
  {#if selectedVideo}<iframe
      title={selectedVideo.name}
      src={`https://www.youtube-nocookie.com/embed/${selectedVideo.key}?autoplay=1`}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>{/if}
</dialog>
