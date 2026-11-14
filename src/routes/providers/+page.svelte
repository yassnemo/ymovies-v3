<script lang="ts">
  import { providers } from '#lib/providers.ts';
</script>

<main id="main" class="page-container discovery-hub">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <a href="/">Home</a><span aria-hidden="true">/</span><span>Providers</span>
  </nav>
  <h1 class="page-title">Start with your service.</h1>
  <p class="hub-intro">
    Browse movie and TV catalogs from a provider you already use. Catalog
    availability is based on the United States and can vary by country.
  </p>
  <div class="provider-directory">
    {#each providers as provider}<article>
        <img src={provider.logo} alt="" width="64" height="64" loading="lazy" />
        <h2>{provider.name}</h2>
        <div>
          <a href={'/provider/' + provider.id}>Movies</a><a
            href={'/provider/' + provider.id + '?type=tv'}>TV shows</a
          >
        </div>
      </article>{/each}
  </div>
  <p class="hub-footer">
    Looking for a particular mood? <a href="/genres">Browse by genre</a>.
  </p>
</main>
