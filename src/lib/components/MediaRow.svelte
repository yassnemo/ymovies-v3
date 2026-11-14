<script lang="ts">
  import { onMount } from 'svelte';
  import { mediaKey, type Media } from '#lib/types/media.ts';
  import MediaCard from './MediaCard.svelte';
  import Icon from './Icon.svelte';
  let {
    title,
    items,
    href,
    ranked = false
  }: {
    title: string;
    items: Media[];
    href?: string;
    ranked?: boolean;
  } = $props();
  let rail = $state<HTMLDivElement>(null!);
  let start = $state(true);
  let end = $state(false);
  function update() {
    if (rail) {
      start = rail.scrollLeft < 10;
      end = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 10;
    }
  }
  onMount(() => {
    update();
    const observer = new ResizeObserver(update);
    if (rail) observer.observe(rail);
    return () => observer.disconnect();
  });
</script>

{#if items.length}<section class="cine-row media-section" class:ranked>
    {#if title}<div class="section-heading">
        {#if href}<h2>
            <a {href}>{title}<Icon name="right" size={18} /></a>
          </h2>{:else}<h2>{title}</h2>{/if}
      </div>{/if}
    <div class="cine-row-content">
      <button
        class="rail-arrow left"
        class:unavailable={start}
        aria-label={'Scroll ' + title + ' left'}
        onclick={() =>
          rail.scrollBy({ left: -rail.clientWidth * 0.8, behavior: 'smooth' })}
        ><Icon name="left" size={36} /></button
      >
      <div class="media-rail" bind:this={rail} onscroll={update}>
        {#each items as item, index (mediaKey(item))}{#if ranked}<div
              class="ranked-item"
            >
              <span class="ranking-number" aria-hidden="true">{index + 1}</span
              ><MediaCard {item} />
            </div>{:else}<MediaCard {item} />{/if}{/each}
      </div>
      <button
        class="rail-arrow right"
        class:unavailable={end}
        aria-label={'Scroll ' + title + ' right'}
        onclick={() =>
          rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: 'smooth' })}
        ><Icon name="right" size={36} /></button
      >
    </div>
  </section>{/if}
