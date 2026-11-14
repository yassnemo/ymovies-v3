<script lang="ts">
  import { onMount } from 'svelte';
  import type { CatalogSection, Media } from '#lib/types/media.ts';
  import MediaRow from './MediaRow.svelte';
  let target = $state<HTMLElement>(null!);
  let sections = $state<CatalogSection[]>([]);
  onMount(() => {
    const controller = new AbortController();
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const groups: [string, 'movie' | 'tv', number[]][] = [
          [
            'Award Winning Movies',
            'movie',
            [
              1064213, 872585, 545611, 776503, 581734, 496243, 490132, 399055,
              376867, 314365, 194662, 76203
            ]
          ],
          [
            'Award Winning Shows',
            'tv',
            [
              126308, 241259, 227882, 136315, 127902, 111803, 76331, 97546,
              87739, 65494, 87108, 1399
            ]
          ]
        ];
        void Promise.all(
          groups.map(async ([title, type, ids]) => {
            const values = await Promise.allSettled(
              ids.map(async (id) => {
                const response = await fetch('/api/tmdb/' + type + '/' + id, {
                  signal: controller.signal
                });
                if (!response.ok) throw new Error();
                return {
                  ...(await response.json()),
                  media_type: type
                } as Media;
              })
            );
            return {
              title,
              items: values.flatMap((value) =>
                value.status === 'fulfilled' ? [value.value] : []
              )
            };
          })
        ).then((values) => {
          if (!controller.signal.aborted) sections = values;
        });
      },
      { rootMargin: '500px' }
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  });
</script>

<div bind:this={target}>
  {#each sections as section}<MediaRow {...section} />{/each}
</div>
