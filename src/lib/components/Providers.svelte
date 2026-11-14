<script lang="ts">
  import { imageUrl, type MediaType } from '#lib/types/media.ts';
  let { id, type }: { id: number; type: MediaType } = $props();
  type Provider = {
    provider_id: number;
    provider_name: string;
    logo_path: string;
  };
  type Availability = {
    link?: string;
    flatrate?: Provider[];
    free?: Provider[];
    ads?: Provider[];
    rent?: Provider[];
    buy?: Provider[];
  };
  let country = $state('US');
  let results = $state<Record<string, Availability>>({});
  let loading = $state(true);
  let failed = $state(false);
  let provider = $derived(results[country]);
  $effect(() => {
    const controller = new AbortController();
    loading = true;
    failed = false;
    fetch(`/api/tmdb/${type}/${id}/watch/providers`, {
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) results = data.results || {};
      })
      .catch(() => {
        if (!controller.signal.aborted) failed = true;
      })
      .finally(() => {
        if (!controller.signal.aborted) loading = false;
      });
    return () => controller.abort();
  });
  const categories = [
    ['flatrate', 'Stream'],
    ['free', 'Free'],
    ['ads', 'With ads'],
    ['rent', 'Rent'],
    ['buy', 'Buy']
  ] as const;
</script>

<section class="panel">
  <div class="section-heading">
    <h2>Where to watch</h2>
    <label
      >Country<select bind:value={country}
        ><option value="US">United States</option><option value="MA"
          >Morocco</option
        ><option value="GB">United Kingdom</option><option value="CA"
          >Canada</option
        ><option value="FR">France</option>{#each Object.keys(results)
          .filter((code) => !['US', 'MA', 'GB', 'CA', 'FR'].includes(code))
          .sort() as code}<option value={code}
            >{new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ||
              code}</option
          >{/each}</select
      ></label
    >
  </div>
  {#if loading}<p role="status">Loading availability…</p>{:else if failed}<p>
      Watch availability is temporarily unavailable.
    </p>{:else if provider}{#each categories as [key, label]}{#if provider[key]?.length}<p
        >
          {label}
        </p>
        <div class="providers">
          {#each provider[key] || [] as value}<img
              src={imageUrl(value.logo_path, 'w92')}
              alt={value.provider_name}
              title={value.provider_name}
              loading="lazy"
            />{/each}
        </div>{/if}{/each}{#if provider.link}<a
        class="button secondary small"
        style="margin-top:20px"
        href={provider.link}
        target="_blank"
        rel="noreferrer">View options on TMDB</a
      >{/if}{:else}<p>
      No availability information for this country.
    </p>{/if}<small class="muted"
    >Availability provided by JustWatch via TMDB.</small
  >
</section>
