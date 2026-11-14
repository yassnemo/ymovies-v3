<script lang="ts">
  import type { CatalogSection, Media } from '#lib/types/media.ts';
  import { useApp } from '#lib/state.ts';
  import Hero from './Hero.svelte';
  import MediaRow from './MediaRow.svelte';
  import ProviderRow from './ProviderRow.svelte';
  import Recommendations from './Recommendations.svelte';
  import Discovery from './Discovery.svelte';
  import ProviderPicks from './ProviderPicks.svelte';
  import CuratedRows from './CuratedRows.svelte';
  let {
    data
  }: {
    data: {
      sections: CatalogSection[];
      unavailable: boolean;
      featured?: Media[];
      ranked?: Media[];
    };
  } = $props();
  const { preferences } = useApp();
  let featured = $derived(
    data.featured?.length
      ? data.featured
      : data.sections
          .flatMap((section) => section.items.slice(0, 3))
          .slice(0, 7)
  );
  let ranked = $derived(
    data.ranked?.length
      ? data.ranked
      : data.sections
          .flatMap((section) => section.items.slice(0, 3))
          .slice(0, 10)
  );
  let watching = $derived(
    $preferences.watchHistory.filter(
      (item) =>
        !item.watchData?.completed && (item.watchData?.watchProgress || 0) > 0
    )
  );
</script>

<main id="main">
  {#if data.unavailable}<div class="page-container empty-state">
      <h1>Your next great watch is on its way</h1>
      <p>The catalog is temporarily unavailable.</p>
      <a class="button primary" href="/" data-sveltekit-reload>Try again</a>
    </div>{:else}<Hero items={featured} />
    <div class="home-rows">
      <ProviderRow /><MediaRow
        title="Continue Watching"
        items={watching}
        href="/my-list?tab=watching"
      /><MediaRow
        title="Top 10 on YMovies today"
        items={ranked}
        ranked
      /><Recommendations
      />{#each data.sections.filter( (section) => section.title.startsWith('Trending') ) as section}<MediaRow
          {...section}
        />{/each}<ProviderPicks /><CuratedRows
      />{#each data.sections.filter((section) => !section.title.startsWith('Trending')) as section}<MediaRow
          {...section}
        />{/each}<Discovery />
    </div>{/if}
</main>
