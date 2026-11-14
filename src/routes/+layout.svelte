<script lang="ts">
  import { onMount, setContext, untrack, type Snippet } from 'svelte';
  import { page } from '$app/state';
  import { APP_STATE, createAppState } from '#lib/state.ts';
  import Navbar from '#lib/components/Navbar.svelte';
  import Footer from '#lib/components/Footer.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import '#lib/styles/legacy.css';
  import '#lib/styles/app.css';
  let {
    data,
    children
  }: { data: { supabase: { url: string; key: string } }; children: Snippet } =
    $props();
  const app = createAppState(untrack(() => data.supabase));
  setContext(APP_STATE, app);
  const { notice } = app;
  onMount(() => app.init());
  let chrome = $derived(
    page.url.pathname !== '/' &&
      !/^\/(signin|signup|reset-password|confirm-reset-password|verify-email|verify-success|auth)(\/|$)/.test(
        page.url.pathname
      )
  );
</script>

<svelte:head
  ><meta
    name="description"
    content="Discover movies and TV shows. Track your watchlist, favorites, and episode progress with YMovies."
  /></svelte:head
>
{#if chrome}<a class="skip-link" href="#main">Skip to content</a><Navbar />{/if}
<div class:app-content={chrome}>{@render children()}</div>
{#if chrome}<Footer />{/if}
<div class="toast-container" aria-live="polite">
  {#if $notice}<div class="toast">
      <p>{$notice}</p>
      <button
        class="icon-button"
        aria-label="Dismiss notification"
        onclick={() => notice.set('')}><Icon name="close" size={16} /></button
      >
    </div>{/if}
</div>
