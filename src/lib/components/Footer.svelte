<script lang="ts">
  import { site } from '#lib/site.ts';
</script>

<footer class="site-footer">
  <a class="brand" href="/home">YMovies</a>
  <p>Find something good. Keep it close.</p>
  <nav aria-label="Explore YMovies">
    <a href="/movies">Movies</a><a href="/tv">TV shows</a><a href="/genres"
      >Genres</a
    ><a href="/providers">Providers</a><a href="/about">About YMovies</a>
  </nav>
  <nav aria-label="Footer">
    <a href="/privacy">Privacy</a><a href="/terms">Terms</a><a
      href="https://www.themoviedb.org"
      target="_blank"
      rel="noreferrer">Data from TMDB</a
    ><a href={site.repository} target="_blank" rel="noreferrer">Source code</a
    ><a href="/about">Built by Yassine Erradouani</a><a
      href={site.author.website}
      target="_blank"
      rel="me noreferrer">yerradouani.me</a
    >
  </nav>
  <small
    >This product uses the TMDB API but is not endorsed or certified by TMDB.</small
  >
</footer>
