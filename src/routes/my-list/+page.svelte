<script lang="ts">
  import { page } from '$app/state';
  import { useApp } from '#lib/state.ts';
  import { mediaKey, mediaTitle, mediaType } from '#lib/types/media.ts';
  import MediaRow from '#lib/components/MediaRow.svelte';
  import MediaCard from '#lib/components/MediaCard.svelte';
  const app = useApp();
  const { preferences, ready, session } = app;
  const tabs = [
    'overview',
    'watching',
    'watchlist',
    'favorites',
    'history',
    'collections'
  ];
  let tab = $derived(
    tabs.includes(page.url.searchParams.get('tab') || '')
      ? page.url.searchParams.get('tab')!
      : 'overview'
  );
  let query = $state('');
  let type = $state('all');
  let sort = $state('recent');
  let name = $state('');
  let selectedCollection = $state('');
  let editing = $state('');
  let editedName = $state('');
  let watching = $derived(
    $preferences.watchHistory.filter(
      (item) =>
        (item.watchData?.watchProgress || 0) > 0 && !item.watchData?.completed
    )
  );
  let collection = $derived(
    $preferences.collections.find((value) => value.id === selectedCollection)
  );
  let items = $derived(
    tab === 'watchlist'
      ? $preferences.watchlist
      : tab === 'favorites'
        ? $preferences.favoriteMovies
        : tab === 'watching'
          ? watching
          : tab === 'history'
            ? $preferences.watchHistory
            : collection?.items || []
  );
  let filtered = $derived.by(() => {
    const values = items.filter(
      (item) =>
        mediaTitle(item).toLowerCase().includes(query.toLowerCase()) &&
        (type === 'all' || mediaType(item) === type)
    );
    return sort === 'title'
      ? values.toSorted((a, b) => mediaTitle(a).localeCompare(mediaTitle(b)))
      : values;
  });
  async function create(event: SubmitEvent) {
    event.preventDefault();
    const title = name.trim();
    if (!title) return;
    const value = {
      id: crypto.randomUUID(),
      name: title,
      items: [],
      createdAt: new Date().toISOString()
    };
    await app.update({ collections: [...$preferences.collections, value] });
    name = '';
    selectedCollection = value.id;
  }
  async function rename(event: SubmitEvent) {
    event.preventDefault();
    if (!editedName.trim()) return;
    await app.update({
      collections: $preferences.collections.map((value) =>
        value.id === editing ? { ...value, name: editedName.trim() } : value
      )
    });
    editing = '';
  }
  async function remove(id: string) {
    if (
      !window.confirm(
        'Delete this collection? Your saved titles will stay in your library.'
      )
    )
      return;
    await app.update({
      collections: $preferences.collections.filter((value) => value.id !== id)
    });
    if (selectedCollection === id) selectedCollection = '';
  }
  function removeItem(key: string) {
    if (!collection) return;
    void app.update({
      collections: $preferences.collections.map((value) =>
        value.id === collection.id
          ? {
              ...value,
              items: value.items.filter((item) => mediaKey(item) !== key)
            }
          : value
      )
    });
  }
</script>

<svelte:head><title>My list — YMovies</title></svelte:head>
<main id="main" class="page-container">
  <p class="eyebrow">A collection of your kind of stories</p>
  <h1 class="page-title">My list</h1>
  {#if !$session}<p class="muted" style="margin-bottom:25px">
      Your library is saved on this device. <a
        href="/signin?next=/my-list"
        style="color:#ff6674">Sign in</a
      > to sync it with your account.
    </p>{/if}
  <nav class="tabs" aria-label="Library sections">
    {#each tabs as value}<a
        href={`/my-list?tab=${value}`}
        class:active={tab === value}
        aria-current={tab === value ? 'page' : undefined}
        >{value.charAt(0).toUpperCase() + value.slice(1)}</a
      >{/each}
  </nav>
  {#if !$ready}<p class="muted" role="status">
      Loading your library…
    </p>{:else if tab === 'overview'}<div class="stats">
      <div>
        <strong>{$preferences.watchlist.length}</strong><span
          >In your watchlist</span
        >
      </div>
      <div>
        <strong>{$preferences.favoriteMovies.length}</strong><span
          >Favorites</span
        >
      </div>
      <div>
        <strong>{$preferences.watchHistory.length}</strong><span
          >Watched titles</span
        >
      </div>
    </div>
    <MediaRow
      title="Continue watching"
      items={watching}
      href="/my-list?tab=watching"
    /><MediaRow
      title="Watchlist"
      items={$preferences.watchlist}
      href="/my-list?tab=watchlist"
    /><MediaRow
      title="Your favorites"
      items={$preferences.favoriteMovies}
      href="/my-list?tab=favorites"
    />{#if !$preferences.watchlist.length && !$preferences.favoriteMovies.length && !$preferences.watchHistory.length}<div
        class="empty-state"
      >
        <h2>Your next favorites start here</h2>
        <p>Save a title while browsing to build your own library.</p>
        <a class="button primary" href="/movies">Discover movies</a>
      </div>{/if}
  {:else}
    {#if tab === 'collections'}<section class="panel">
        <h2>Your collections</h2>
        <p>Keep your favorites together, your way.</p>
        <form class="collection-form" style="margin-top:18px" onsubmit={create}>
          <input
            bind:value={name}
            placeholder="Collection name"
            aria-label="New collection name"
            maxlength="80"
            required
          /><button class="button primary" type="submit"
            >Create collection</button
          >
        </form>
      </section>
      <div class="two-columns" style="margin-bottom:30px">
        {#each $preferences.collections as value}<article
            class="collection-card"
          >
            {#if editing === value.id}<form
                onsubmit={rename}
                class="collection-form"
              >
                <input
                  bind:value={editedName}
                  aria-label="Collection name"
                  maxlength="80"
                  required
                /><button class="button primary small" type="submit"
                  >Save</button
                ><button
                  class="button secondary small"
                  type="button"
                  onclick={() => (editing = '')}>Cancel</button
                >
              </form>{:else}<h3>{value.name}</h3>
              <p class="muted">{value.items.length} titles</p>
              <div class="actions">
                <button
                  class="button secondary small"
                  onclick={() =>
                    (selectedCollection =
                      selectedCollection === value.id ? '' : value.id)}
                  >{selectedCollection === value.id ? 'Close' : 'Open'}</button
                ><button
                  class="button secondary small"
                  onclick={() => {
                    editing = value.id;
                    editedName = value.name;
                  }}>Rename</button
                ><button
                  class="button secondary small"
                  onclick={() => remove(value.id)}>Delete</button
                >
              </div>{/if}
          </article>{/each}
      </div>
      {#if collection}<div class="section-heading">
          <h2>{collection.name}</h2>
        </div>{/if}{/if}
    {#if tab !== 'collections' || collection}<div class="filter-bar">
        <label
          >Find a title<input
            bind:value={query}
            type="search"
            placeholder="Search your library"
          /></label
        ><label
          >Type<select bind:value={type}
            ><option value="all">All titles</option><option value="movie"
              >Movies</option
            ><option value="tv">TV shows</option></select
          ></label
        ><label
          >Sort<select bind:value={sort}
            ><option value="recent">Recently added</option><option value="title"
              >Title A–Z</option
            ></select
          ></label
        >
      </div>
      {#if filtered.length}<div class="media-grid">
          {#each filtered as item (mediaKey(item))}<div>
              <MediaCard {item} />{#if tab === 'collections'}<button
                  class="button secondary small"
                  style="width:100%;margin-top:8px"
                  onclick={() => removeItem(mediaKey(item))}
                  >Remove from collection</button
                >{/if}
            </div>{/each}
        </div>{:else}<div class="empty-state">
          <h2>{query ? 'No titles match your search' : 'Nothing here yet'}</h2>
          <p>
            {tab === 'collections'
              ? 'Add titles to this collection from a movie or TV show’s detail page.'
              : 'Save titles or track your progress while browsing.'}
          </p>
          <a class="button secondary" href="/home">Explore YMovies</a>
        </div>{/if}{/if}
  {/if}
</main>
