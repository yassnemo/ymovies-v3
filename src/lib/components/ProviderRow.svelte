<script lang="ts">
  import { providers } from '#lib/providers.ts';
</script>

<section class="provider-section">
  <h2>Browse by Provider</h2>
  <div class="provider-rail">
    {#each providers as provider}<a
        href={'/provider/' + provider.id}
        class="provider-tile"
        ><img
          src={provider.logo}
          alt={provider.name}
          width="80"
          height="80"
          loading="lazy"
        /><span>{provider.name}</span></a
      >{/each}
  </div>
</section>
