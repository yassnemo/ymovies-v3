<script lang="ts">
  import { resolveSeo, structuredDataTag, type SeoUrl } from '#lib/seo.ts';
  import { site } from '#lib/site.ts';
  let {
    url,
    data,
    status = 200
  }: { url: SeoUrl; data: unknown; status?: number } = $props();
  const seo = $derived(resolveSeo(url, data, status));
</script>

<svelte:head>
  <title>{seo.title}</title>
  <meta name="description" content={seo.description} />
  <meta name="author" content={site.author.name} />
  <meta
    name="robots"
    content={seo.noindex
      ? 'noindex, follow'
      : 'index, follow, max-image-preview:large'}
  />
  <link rel="canonical" href={seo.canonical} />
  <meta property="og:site_name" content={site.name} />
  <meta property="og:type" content={seo.kind} />
  <meta property="og:title" content={seo.title} />
  <meta property="og:description" content={seo.description} />
  <meta property="og:url" content={seo.canonical} />
  <meta property="og:image" content={seo.image} />
  <meta property="og:image:alt" content={seo.title} />
  <meta property="og:locale" content="en_US" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={seo.title} />
  <meta name="twitter:description" content={seo.description} />
  <meta name="twitter:image" content={seo.image} />
  {@html structuredDataTag(seo.structuredData)}
</svelte:head>
