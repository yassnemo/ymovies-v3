<script lang="ts">
  import { onMount } from 'svelte';
  import { providers } from '#lib/providers.ts';
  import type { Media } from '#lib/types/media.ts';
  import MediaRow from './MediaRow.svelte';
  let target = $state<HTMLElement>(null!);
  let visible = $state(false);
  let selected = $state(8);
  let movies = $state<Media[]>([]);
  let shows = $state<Media[]>([]);
  let loading = $state(false);
  onMount(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          visible = true;
          observer.disconnect();
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  });
  $effect(() => {
    if (!visible) return;
    const provider = selected;
    const controller = new AbortController();
    loading = true;
    Promise.allSettled(
      (['movie', 'tv'] as const).map(async (type) => {
        const response = await fetch(
          '/api/tmdb/discover/' +
            type +
            '?with_watch_providers=' +
            provider +
            '&watch_region=US&sort_by=popularity.desc',
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error();
        const data = await response.json();
        return (data.results || []).map((item: Media) => ({
          ...item,
          media_type: type
        }));
      })
    ).then((results) => {
      if (controller.signal.aborted) return;
      movies = results[0].status === 'fulfilled' ? results[0].value : [];
      shows = results[1].status === 'fulfilled' ? results[1].value : [];
      loading = false;
    });
    return () => controller.abort();
  });
</script>

<div class="provider-picks" bind:this={target}>
  <div class="section-heading">
    <h2>
      Movies on <select bind:value={selected} aria-label="Featured provider"
        >{#each providers as provider}<option value={provider.id}
            >{provider.name}</option
          >{/each}</select
      >
    </h2>
  </div>
  {#if loading && !movies.length}<div
      class="row-skeleton"
      aria-label="Loading provider movies"
    >
      {#each Array(7) as _}<span></span>{/each}
    </div>{/if}
  <MediaRow title="" items={movies} />
  {#if shows.length}<div class="section-heading">
      <h2>
        TV Series on <select
          bind:value={selected}
          aria-label="Featured TV provider"
          >{#each providers as provider}<option value={provider.id}
              >{provider.name}</option
            >{/each}</select
        >
      </h2>
    </div>
    <MediaRow title="" items={shows} />{/if}
</div>
