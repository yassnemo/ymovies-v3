<script lang="ts">
  import { useApp } from '#lib/state.ts';
  import {
    mediaTitle,
    mediaType,
    type Media,
    type CatalogSection
  } from '#lib/types/media.ts';
  import MediaRow from './MediaRow.svelte';
  const app = useApp();
  const { preferences, session, ready } = app;
  let sections = $state<CatalogSection[]>([]);
  let similar = $state<Media[]>([]);
  let favorite = $derived($preferences.favoriteMovies[0]);
  $effect(() => {
    const user = $session?.user.id;
    let cancelled = false;
    sections = [];
    if (user)
      app
        .api<{
          recommendation_categories?: { category: string; movies: Media[] }[];
        }>('/api/recommendations/personalized')
        .then((data) => {
          if (!cancelled)
            sections = (data.recommendation_categories || []).map((value) => ({
              title: value.category,
              items: value.movies
            }));
        })
        .catch(() => {});
    return () => {
      cancelled = true;
    };
  });
  $effect(() => {
    const item = favorite;
    const genres = $preferences.likedGenres;
    let cancelled = false;
    similar = [];
    if ($ready && (item || genres.length)) {
      const type = item ? mediaType(item) : 'movie';
      const path = item
        ? `/${type}/${item.id}/recommendations`
        : `/discover/movie?with_genres=${encodeURIComponent(genres.join(','))}`;
      fetch(`/api/tmdb${path}`)
        .then((response) => {
          if (!response.ok) throw new Error();
          return response.json();
        })
        .then((data) => {
          if (!cancelled)
            similar = (data.results || []).map((value: Media) => ({
              ...value,
              media_type: type
            }));
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  });
</script>

{#each sections as section}<MediaRow {...section} />{/each}
<MediaRow
  title={favorite
    ? `Because you liked ${mediaTitle(favorite)}`
    : 'Picked for your taste'}
  items={similar}
/>
