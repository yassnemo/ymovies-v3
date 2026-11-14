<script lang="ts">
  import {
    mediaHref,
    mediaKey,
    mediaTitle,
    mediaYear,
    imageUrl,
    type Media
  } from '#lib/types/media.ts';
  let { value = '' }: { value?: string } = $props();
  let query = $state('');
  let suggestions = $state<Media[]>([]);
  let focused = $state(false);
  let selected = $state(-1);
  $effect(() => {
    query = value;
  });
  $effect(() => {
    const text = query.trim();
    const controller = new AbortController();
    selected = -1;
    if (text.length < 2 || text === value) {
      suggestions = [];
      return;
    }
    const timer = setTimeout(() => {
      fetch(
        `/api/tmdb/search/multi?query=${encodeURIComponent(text)}&include_adult=false`,
        { signal: controller.signal }
      )
        .then((response) => {
          if (!response.ok) throw new Error();
          return response.json();
        })
        .then((data) => {
          if (!controller.signal.aborted)
            suggestions = (data.results || [])
              .filter(
                (item: Media & { media_type: string }) =>
                  item.media_type === 'movie' || item.media_type === 'tv'
              )
              .slice(0, 6);
        })
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  });
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      focused = false;
      return;
    }
    if (!focused || !suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selected = (selected + 1) % suggestions.length;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      selected = (selected - 1 + suggestions.length) % suggestions.length;
    }
    if (event.key === 'Enter' && selected >= 0) {
      event.preventDefault();
      document.getElementById(`search-suggestion-${selected}`)?.click();
    }
  }
</script>

<div class="search-input">
  <input
    type="search"
    name="q"
    bind:value={query}
    placeholder="Search movies and TV shows…"
    aria-label="Search movies and TV shows"
    role="combobox"
    aria-expanded={focused && suggestions.length > 0}
    aria-controls="search-suggestions"
    aria-autocomplete="list"
    aria-activedescendant={selected >= 0
      ? `search-suggestion-${selected}`
      : undefined}
    maxlength="200"
    autocomplete="off"
    onfocus={() => (focused = true)}
    onblur={() => setTimeout(() => (focused = false), 150)}
    onkeydown={keydown}
  />
  {#if focused && suggestions.length}<ul
      id="search-suggestions"
      role="listbox"
      aria-label="Suggested titles"
    >
      {#each suggestions as item, index (mediaKey(item))}<li
          role="option"
          aria-selected={selected === index}
        >
          <a
            id={`search-suggestion-${index}`}
            href={mediaHref(item)}
            tabindex="-1"
            class:active={selected === index}
            ><img src={imageUrl(item.poster_path, 'w92')} alt="" /><span
              >{mediaTitle(item)}<small
                >{mediaYear(item)} · {item.media_type === 'tv'
                  ? 'TV show'
                  : 'Movie'}</small
              ></span
            ></a
          >
        </li>{/each}
    </ul>{/if}
</div>

<style>
  .search-input {
    position: relative;
    flex: 1;
    min-width: 180px;
  }
  .search-input ul {
    position: absolute;
    z-index: 70;
    top: 100%;
    left: 0;
    right: 0;
    padding: 6px;
    margin: 6px 0 0;
    list-style: none;
    background: #17171d;
    border: 1px solid #ffffff20;
    border-radius: 6px;
    box-shadow: 0 20px 45px #0009;
  }
  .search-input a {
    display: flex;
    gap: 13px;
    align-items: center;
    padding: 8px;
    border-radius: 4px;
  }
  .search-input a:hover,
  .search-input a.active {
    background: #ffffff0d;
  }
  .search-input img {
    width: 35px;
    height: 52px;
    object-fit: cover;
    border-radius: 3px;
  }
  .search-input span {
    font-size: 12px;
  }
  .search-input small {
    display: block;
    color: #999;
    font-size: 10px;
  }
</style>
