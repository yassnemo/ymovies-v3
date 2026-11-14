<script lang="ts">
  import Browse from '#lib/components/Browse.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<Browse {data} />
