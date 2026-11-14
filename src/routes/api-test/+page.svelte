<script lang="ts">
  let result = $state('');
  let busy = $state(false);
  async function check() {
    busy = true;
    result = '';
    try {
      const response = await fetch('/api/tmdb/movie/550');
      const data = await response.json();
      result = response.ok
        ? `Gateway is responding: ${data.title} (${response.headers.get('X-TMDB-Cache') || 'OK'})`
        : `Gateway returned ${response.status}: ${data.message}`;
    } catch {
      result = 'The gateway could not be reached.';
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head><title>Movie API diagnostics — YMovies</title></svelte:head>
<main id="main" class="page-container narrow">
  <h1 class="page-title">Movie API diagnostics</h1>
  <p class="muted">Check the movie data gateway.</p>
  <button
    class="button primary"
    style="margin:24px 0"
    onclick={check}
    disabled={busy}>{busy ? 'Checking…' : 'Check gateway'}</button
  >
  <p role="status">{result}</p>
</main>
