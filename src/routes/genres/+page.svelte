<script lang="ts">
  import { movieGenres, tvGenres, genreHref } from '#lib/genres.ts';
</script>

<main id="main" class="page-container discovery-hub">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <a href="/">Home</a><span aria-hidden="true">/</span><span>Genres</span>
  </nav>
  <h1 class="page-title">Follow your mood.</h1>
  <p class="hub-intro">
    A familiar favorite or something completely different. Explore movies and TV
    shows by genre.
  </p>
  <section>
    <h2>Movie genres</h2>
    <div class="hub-grid">
      {#each movieGenres as [id, name]}<a href={genreHref('movie', name)}
          ><span>{name}</span><span aria-hidden="true">↗</span></a
        >{/each}
    </div>
  </section>
  <section>
    <h2>TV genres</h2>
    <div class="hub-grid">
      {#each tvGenres as [id, name]}<a href={genreHref('tv', name)}
          ><span>{name}</span><span aria-hidden="true">↗</span></a
        >{/each}
    </div>
  </section>
  <p class="hub-footer">
    Prefer to browse by service? <a href="/providers"
      >Explore provider catalogs</a
    >.
  </p>
</main>
