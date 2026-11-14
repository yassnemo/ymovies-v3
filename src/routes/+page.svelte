<script lang="ts">
  import { onMount } from 'svelte';
  import '#lib/styles/landing.css';
  import Icon from '#lib/components/Icon.svelte';
  let artworkReady = $state(false);
  let videoPlaying = $state(false);
  let reduceMotion = $state(true);
  onMount(() => {
    document.body.classList.add('ymovies-landing');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    reduceMotion = motion.matches;
    const update = () => (reduceMotion = motion.matches);
    motion.addEventListener('change', update);
    return () => {
      document.body.classList.remove('ymovies-landing');
      motion.removeEventListener('change', update);
    };
  });
</script>

<svelte:head><title>YMovies — Find your next movie</title></svelte:head>
{#snippet footer(mobile = false)}<footer
    class={mobile ? 'landing-footer landing-footer-mobile' : 'landing-footer'}
  >
    <nav aria-label={mobile ? 'Mobile landing footer' : 'Landing footer'}>
      <a href="/privacy">Privacy</a><a href="/terms">Terms</a><a
        href="https://yerradouani.me"
        target="_blank"
        rel="noreferrer">Website</a
      ><a
        class="landing-creator"
        href="https://yerradouani.me"
        target="_blank"
        rel="noreferrer">Crafted by Yassine Erradouani</a
      >
    </nav>
  </footer>{/snippet}
<main class="landing-shell" id="main">
  <a class="landing-skip" href="#landing-title">Skip to content</a>
  <section class="landing-hero" aria-labelledby="landing-title">
    <div class="landing-copy">
      <a href="/" class="landing-brand" aria-label="YMovies home"
        ><img
          src="/images/landing/brand-mark.svg"
          width="44"
          height="36"
          alt=""
        /><span>YMovies</span></a
      >
      <h1 id="landing-title" tabindex="-1">Find your next movie</h1>
      <p class="landing-description">
        Discover movies and TV shows. Track your watchlist, favorites, and
        episode progress.
      </p>
      <div class="landing-actions">
        <a href="/home" class="landing-primary"
          ><span class="landing-button-fill" aria-hidden="true"></span><span
            class="landing-button-content"
            ><Icon name="play" size={24} /><span>Explore YMovies</span></span
          ></a
        >
      </div>
    </div>
    {@render footer()}
  </section>
  <section class="landing-preview" aria-label="YMovies app preview">
    <div class="landing-phone-reveal">
      <div class="landing-phone">
        <div class="landing-phone-screen">
          {#if !reduceMotion}<video
              autoplay
              muted
              loop
              playsinline
              preload="metadata"
              poster="/images/landing/app-walkthrough-hd.jpg"
              aria-label="A walkthrough of the YMovies app"
              onplaying={() => (videoPlaying = true)}
              onerror={() => (videoPlaying = false)}
              ><source
                src="/images/landing/app-walkthrough-hd.webm"
                type="video/webm"
              /><track kind="captions" /></video
            >{/if}<img
            class={videoPlaying && !reduceMotion
              ? 'landing-phone-placeholder is-hidden'
              : 'landing-phone-placeholder'}
            src="/images/landing/app-walkthrough-hd.jpg"
            width="720"
            height="1280"
            fetchpriority="high"
            alt="YMovies home page with featured movies and browse controls"
          />
        </div>
      </div>
    </div>
    <div class="landing-preview-caption"><p>Movies &amp; TV shows</p></div>
    <div class="landing-artwork" aria-hidden="true">
      <div class="landing-artwork-picture">
        <img
          class={artworkReady
            ? 'landing-artwork-placeholder is-hidden'
            : 'landing-artwork-placeholder'}
          src="/images/sign-background-large-placeholder.jpg"
          alt=""
        /><img
          class={artworkReady
            ? 'landing-artwork-image is-ready'
            : 'landing-artwork-image'}
          src="/images/sign-background-large.jpg"
          alt=""
          decoding="async"
          onload={() => (artworkReady = true)}
        />
      </div>
      <svg
        class="landing-angle landing-angle-top"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"><polygon points="0 0, 100 0, 100 100" /></svg
      >
      <div class="landing-artwork-cover">
        <div class="landing-artwork-mask"></div>
        <svg
          class="landing-angle"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"><polygon points="0 0, 0 100, 100 100" /></svg
        >
      </div>
    </div>
  </section>
  {@render footer(true)}
</main>
