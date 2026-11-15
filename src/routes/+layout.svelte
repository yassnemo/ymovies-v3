<script lang="ts">
  import {
    onDestroy,
    onMount,
    setContext,
    untrack,
    type Snippet
  } from 'svelte';
  import { page } from '$app/state';
  import { afterNavigate, onNavigate } from '$app/navigation';
  import { trackPageView } from '#lib/analytics.ts';
  import { APP_STATE, createAppState } from '#lib/state.ts';
  import Navbar from '#lib/components/Navbar.svelte';
  import Footer from '#lib/components/Footer.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import AmbientBackground from '#lib/components/AmbientBackground.svelte';
  import Seo from '#lib/components/Seo.svelte';
  import '#lib/styles/base.css';
  import '#lib/styles/catalog.css';
  import '#lib/styles/motion.css';
  import '#lib/styles/hero-background.css';
  let {
    data,
    children
  }: { data: { supabase: { url: string; key: string } }; children: Snippet } =
    $props();
  const app = createAppState(untrack(() => data.supabase));
  setContext(APP_STATE, app);
  const { notice, preferences, ready } = app;
  $effect(() => {
    const appearance = $preferences.appSettings;
    document.documentElement.dataset.appReady = String($ready);
    document.documentElement.dataset.reducedMotion = String(
      appearance.reduceMotion === true
    );
    const accents: Record<string, string> = {
      default: '#f2f2f2',
      green: '#95ff50',
      violet: '#c5a0ff',
      red: '#ff6371'
    };
    document.documentElement.style.setProperty(
      '--ym-accent',
      accents[String(appearance.theme)] || accents.default
    );
  });
  let scrollPosition = $state(0);
  onMount(() => app.init());
  afterNavigate(({ to }) => {
    if (to) trackPageView(to.url, document.title);
  });
  let activeTransition: ViewTransition | undefined;
  onDestroy(() => activeTransition?.skipTransition());
  onNavigate((navigation) => {
    // Finish an interrupted fade before capturing the next page.
    activeTransition?.skipTransition();
    if (
      !document.startViewTransition ||
      document.hidden ||
      navigation.from?.url.pathname === navigation.to?.url.pathname ||
      $preferences.appSettings.reduceMotion ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    return new Promise<void>((resolve) => {
      try {
        const transition = document.startViewTransition(async () => {
          // Release navigation immediately; never wait for the animation.
          resolve();
          await navigation.complete;
        });
        activeTransition = transition;
        // A failed/skipped snapshot must never hold up the router.
        void transition.ready.catch(() => resolve());
        void transition.finished
          .catch(() => {})
          .finally(() => {
            if (activeTransition === transition) activeTransition = undefined;
          });
      } catch {
        resolve();
      }
    });
  });
  let ambient = $derived(
    /^\/(search|my-list|lists|settings|profile)(\/|$)/.test(page.url.pathname)
  );
  let chrome = $derived(
    !/^\/(signin|signup|reset-password|confirm-reset-password|verify-email|verify-success|auth)(\/|$)/.test(
      page.url.pathname
    )
  );
</script>

<svelte:window bind:scrollY={scrollPosition} />

<Seo url={page.url} data={page.data} status={page.status} />
{#if chrome}{#if ambient}<AmbientBackground />{:else}<div
      class="catalog-ambient"
      aria-hidden="true"
    ></div>{/if}<a class="skip-link" href="#main">Skip to content</a><Navbar
  />{/if}
<div class="route-content" class:app-content={chrome}>{@render children()}</div>
{#if chrome}<Footer />{/if}
{#if chrome && scrollPosition > 600}<button
    class="back-to-top"
    aria-label="Back to top"
    onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    ><Icon name="left" size={23} /></button
  >{/if}
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
