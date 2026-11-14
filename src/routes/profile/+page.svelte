<script lang="ts">
  import { useApp } from '#lib/state.ts';
  import { movieGenres } from '#lib/genres.ts';
  import MediaRow from '#lib/components/MediaRow.svelte';
  const app = useApp();
  const { session, preferences, ready } = app;
  let name = $derived(
    $session?.user.user_metadata.full_name ||
      [
        $session?.user.user_metadata.first_name,
        $session?.user.user_metadata.last_name
      ]
        .filter(Boolean)
        .join(' ') ||
      $session?.user.email?.split('@')[0] ||
      'Your profile'
  );
  let mode = $state<'likedGenres' | 'dislikedGenres'>('likedGenres');
  function toggle(id: number) {
    const value = String(id);
    const other = mode === 'likedGenres' ? 'dislikedGenres' : 'likedGenres';
    const current = $preferences[mode];
    void app.update({
      [mode]: current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
      [other]: $preferences[other].filter((entry) => entry !== value)
    });
  }
</script>

<svelte:head><title>Your profile — YMovies</title></svelte:head>
<main id="main" class="page-container narrow">
  <p class="eyebrow">Your world of film</p>
  <div class="section-heading">
    <div>
      <h1 class="page-title" style="margin-bottom:8px">{name}</h1>
      <p class="muted">
        {$session?.user.email || 'Your movie journey, saved on this device.'}
      </p>
    </div>
    <a class="button secondary" href="/settings">Settings</a>
  </div>
  {#if !$session}<section class="panel">
      <h2>Take your library with you</h2>
      <p>Sign in to keep your favorites and preferences in sync.</p>
      <div class="actions">
        <a class="button primary" href="/signin?next=/profile">Sign in</a><a
          class="button secondary"
          href="/signup">Create account</a
        >
      </div>
    </section>{/if}{#if !$ready}<p role="status">
      Loading your profile…
    </p>{:else}<div class="stats">
      <div>
        <strong>{$preferences.favoriteMovies.length}</strong><span
          >Favorite titles</span
        >
      </div>
      <div>
        <strong
          >{$preferences.watchHistory.filter(
            (item) => item.watchData?.completed
          ).length}</strong
        ><span>Completed</span>
      </div>
      <div>
        <strong>{$preferences.collections.length}</strong><span
          >Collections</span
        >
      </div>
    </div>
    <section class="panel">
      <h2>Your taste in stories</h2>
      <p>Tell us what you enjoy and what you’d rather skip.</p>
      <nav class="tabs" style="margin-top:16px" aria-label="Genre preferences">
        <button
          class:active={mode === 'likedGenres'}
          aria-pressed={mode === 'likedGenres'}
          onclick={() => (mode = 'likedGenres')}>Genres I love</button
        ><button
          class:active={mode === 'dislikedGenres'}
          aria-pressed={mode === 'dislikedGenres'}
          onclick={() => (mode = 'dislikedGenres')}>Less of these</button
        >
      </nav>
      <div class="chip-list">
        {#each movieGenres as [id, genre]}<button
            class="chip"
            class:chosen={$preferences[mode].includes(String(id))}
            aria-pressed={$preferences[mode].includes(String(id))}
            onclick={() => toggle(id)}>{genre}</button
          >{/each}
      </div>
    </section>
    <MediaRow
      title="Your favorites"
      items={$preferences.favoriteMovies}
      href="/my-list?tab=favorites"
    /><MediaRow
      title="Recently watched"
      items={$preferences.watchHistory}
      href="/my-list?tab=history"
    />{/if}
</main>
