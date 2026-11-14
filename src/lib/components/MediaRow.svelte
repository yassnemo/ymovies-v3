<script lang="ts">
  import type { Media } from '#lib/types/media.ts';
  import { mediaKey } from '#lib/types/media.ts';
  import MediaCard from './MediaCard.svelte';
  import Icon from './Icon.svelte';
  let { title, items, href }: { title: string; items: Media[]; href?: string } =
    $props();
  let rail = $state<HTMLDivElement>(null!);
</script>

{#if items.length}<section class="media-section">
    <div class="section-heading">
      <h2>{title}</h2>
      <div class="row-controls">
        {#if href}<a {href}>View all</a>{/if}<button
          class="icon-button"
          aria-label={`Scroll ${title} left`}
          onclick={() =>
            rail.scrollBy({
              left: -rail.clientWidth * 0.8,
              behavior: 'smooth'
            })}><Icon name="left" size={18} /></button
        ><button
          class="icon-button"
          aria-label={`Scroll ${title} right`}
          onclick={() =>
            rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: 'smooth' })}
          ><Icon name="right" size={18} /></button
        >
      </div>
    </div>
    <div class="media-rail" bind:this={rail}>
      {#each items as item (mediaKey(item))}<MediaCard {item} />{/each}
    </div>
  </section>{/if}
