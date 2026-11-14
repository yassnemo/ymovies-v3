<script lang="ts">
  import type { CatalogSection, Media } from '#lib/types/media.ts';
  import { useApp } from '#lib/state.ts';
  import Hero from '#lib/components/Hero.svelte';
  import MediaRow from '#lib/components/MediaRow.svelte';
  import Recommendations from '#lib/components/Recommendations.svelte';
  import Onboarding from '#lib/components/Onboarding.svelte';
  import Discovery from '#lib/components/Discovery.svelte';
  let { data }: { data: { sections: CatalogSection[]; unavailable: boolean } } =
    $props();
  const { preferences, ready } = useApp();
  let featured = $derived(
    data.sections.flatMap((section) => section.items.slice(0, 3)).slice(0, 9)
  );
  let watching = $derived(
    $preferences.watchHistory.filter(
      (item) =>
        !item.watchData?.completed && (item.watchData?.watchProgress || 0) > 0
    )
  );
</script>

<svelte:head><title>Discover movies and TV shows — YMovies</title></svelte:head>
<main id="main">
  {#if data.unavailable}<div class="page-container empty-state">
      <h1>Your next great watch is on its way</h1>
      <p>
        The catalog is temporarily unavailable. Please try again in a moment.
      </p>
      <a class="button primary" href="/home" data-sveltekit-reload>Try again</a>
    </div>{:else}<Hero items={featured} />
    <div class="home-rows">
      {#if $ready && !$preferences.completed}<Onboarding />{/if}<MediaRow
        title="Continue watching"
        items={watching}
        href="/my-list?tab=watching"
      /><Recommendations />{#each data.sections as section}<MediaRow
          {...section}
        />{/each}<Discovery />
    </div>{/if}
</main>
