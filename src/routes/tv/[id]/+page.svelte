<script lang="ts">
  import Detail from '#lib/components/Detail.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<Detail {data} />
