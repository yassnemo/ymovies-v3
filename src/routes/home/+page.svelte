<script lang="ts">
  import HomeContent from '#lib/components/HomeContent.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<HomeContent {data} />
