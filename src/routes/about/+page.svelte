<script lang="ts">
  import { site } from '#lib/site.ts';
</script>

<main id="main" class="page-container narrow about-page">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <a href="/">Home</a><span aria-hidden="true">/</span><span>About</span>
  </nav>
  <p class="section-kicker">A project by Yassine Erradouani</p>
  <h1 class="page-title">Find something good.<br />Remember it later.</h1>
  <p class="about-intro">
    I’m Yassine Erradouani — <a href={site.author.github} rel="me">yassnemo</a> on
    GitHub — and I build YMovies.
  </p>
  <p>
    YMovies brings movie discovery and a personal library into one place.
    Explore a cast, watch a trailer, find a provider, or save a title for
    another day. Your watchlist and episode progress stay close at hand.
  </p>
  <p>
    You can start browsing without an account. Your library stays on your
    device, and signing in lets you sync it across devices.
  </p>
  <div class="actions">
    <a class="button primary" href="/movies">Find a movie</a><a
      class="button secondary"
      href="/tv">Explore TV shows</a
    >
  </div>
  <section class="about-project">
    <h2>Built in the open</h2>
    <p>
      The interface runs on Svelte and SvelteKit. TMDB supplies the movie and TV
      metadata, Supabase handles sign-in, and PostgreSQL stores synced
      libraries. The source is available under the MIT license.
    </p>
    <div class="actions">
      <a href={site.repository} class="button secondary">Read the source</a><a
        href={site.author.website}
        class="button secondary"
        rel="me">More of my work</a
      >
    </div>
  </section>
  <section class="about-project">
    <h2>A few ways in</h2>
    <p>
      Pick a <a href="/genres">genre</a>, browse a
      <a href="/providers">provider catalog</a>, or
      <a href="/search">search for a title</a> you already have in mind.
    </p>
  </section>
</main>
