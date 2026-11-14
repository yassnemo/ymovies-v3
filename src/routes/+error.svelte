<script lang="ts">
  import { page } from '$app/state';
</script>

<main id="main" class="page-container empty-state">
  <p class="eyebrow">{page.status}</p>
  <h1>{page.error?.message || 'Something went wrong'}</h1>
  <p>
    {page.status === 404
      ? 'The page you’re looking for could not be found.'
      : 'Please try again in a moment.'}
  </p>
  <a class="button primary" href="/home">Back to YMovies</a>
</main>
