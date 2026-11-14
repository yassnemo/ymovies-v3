<script lang="ts">
  import { useApp } from '#lib/state.ts';
  import { movieGenres } from '#lib/genres.ts';
  const app = useApp();
  const { preferences } = app;
  let selected = $state<string[]>([]);
  function toggle(id: number) {
    const value = String(id);
    selected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
  }
</script>

<section class="onboarding">
  <p class="eyebrow">Make yourself at home</p>
  <h2>What do you love watching?</h2>
  <p>Pick a few genres to make your recommendations more personal.</p>
  <div class="chip-list">
    {#each movieGenres as [id, name]}<button
        class="chip"
        class:chosen={selected.includes(String(id))}
        aria-pressed={selected.includes(String(id))}
        onclick={() => toggle(id)}>{name}</button
      >{/each}
  </div>
  <button
    class="button primary small"
    onclick={() => app.update({ likedGenres: selected, completed: true })}
    >Save preferences</button
  ><button
    class="button secondary small"
    onclick={() => app.update({ completed: true })}>Maybe later</button
  >
</section>
