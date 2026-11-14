<script lang="ts">
  import { useApp } from '#lib/state.ts';
  import { imageUrl, type Season, type Episode } from '#lib/types/media.ts';
  let { id, seasons }: { id: number; seasons: Season[] } = $props();
  const app = useApp();
  const { preferences, ready } = app;
  let season = $state(1);
  let episodes = $state<Episode[]>([]);
  let loading = $state(false);
  let failed = $state(false);
  let tracked = $state<
    Record<
      string,
      {
        watched: boolean;
        episodeId?: number;
        seasonNumber?: number;
        episodeNumber?: number;
        watchedAt?: string;
      }
    >
  >({});
  $effect(() => {
    season =
      seasons.find((value) => value.season_number > 0)?.season_number ?? 0;
  });
  $effect(() => {
    if (!$ready) return;
    const all = ($preferences.appSettings.episodeTracking || {}) as Record<
      string,
      typeof tracked
    >;
    if (all[String(id)]) tracked = all[String(id)];
    else {
      try {
        tracked = JSON.parse(
          localStorage.getItem(`episode-tracking-${id}`) || '{}'
        );
      } catch {
        tracked = {};
      }
    }
  });
  $effect(() => {
    const controller = new AbortController();
    loading = true;
    failed = false;
    episodes = [];
    fetch(`/api/tmdb/tv/${id}/season/${season}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) episodes = data.episodes || [];
      })
      .catch(() => {
        if (!controller.signal.aborted) failed = true;
      })
      .finally(() => {
        if (!controller.signal.aborted) loading = false;
      });
    return () => controller.abort();
  });
  let watched = $derived(
    episodes.filter(
      (episode) => tracked[`s${season}e${episode.episode_number}`]?.watched
    ).length
  );
  function save(values: typeof tracked) {
    tracked = values;
    const all = ($preferences.appSettings.episodeTracking || {}) as Record<
      string,
      typeof tracked
    >;
    void app.update({
      appSettings: {
        ...$preferences.appSettings,
        episodeTracking: { ...all, [id]: values }
      }
    });
  }
  function toggle(episode: Episode) {
    const key = `s${season}e${episode.episode_number}`;
    save({
      ...tracked,
      [key]: {
        episodeId: episode.id,
        seasonNumber: season,
        episodeNumber: episode.episode_number,
        watched: !tracked[key]?.watched,
        watchedAt: new Date().toISOString()
      }
    });
  }
  function markSeason() {
    const next = { ...tracked };
    const complete = watched !== episodes.length;
    for (const episode of episodes)
      next[`s${season}e${episode.episode_number}`] = {
        episodeId: episode.id,
        watched: complete,
        watchedAt: new Date().toISOString()
      };
    save(next);
  }
</script>

<section>
  <div class="section-heading">
    <h2>Episodes</h2>
    <label
      >Season<select bind:value={season}
        >{#each seasons as value}<option value={value.season_number}
            >{value.name}</option
          >{/each}</select
      ></label
    >
  </div>
  {#if loading}<p class="muted" role="status">
      Loading episodes…
    </p>{:else if failed}<p class="error-message" role="status">
      Episodes are temporarily unavailable. Choose a season to try again.
    </p>{:else if !episodes.length}<p class="muted">
      No episodes are available for this season.
    </p>{:else}<div class="section-heading">
      <p class="muted">{watched} / {episodes.length} episodes watched</p>
      <button class="button secondary small" onclick={markSeason}
        >{watched === episodes.length
          ? 'Reset season'
          : 'Mark season watched'}</button
      >
    </div>
    {#each episodes as episode}<article
        class="episode"
        class:watched={tracked[`s${season}e${episode.episode_number}`]?.watched}
      >
        {#if episode.still_path}<img
            src={imageUrl(episode.still_path, 'w300')}
            alt=""
            loading="lazy"
          />{/if}
        <div>
          <h3>{episode.episode_number}. {episode.name}</h3>
          <p>{episode.overview}</p>
          <small class="muted"
            >{episode.air_date || ''}{episode.runtime
              ? ` · ${episode.runtime} min`
              : ''}</small
          >
        </div>
        <label
          >Watched<input
            type="checkbox"
            checked={!!tracked[`s${season}e${episode.episode_number}`]?.watched}
            onchange={() => toggle(episode)}
            aria-label={`Mark episode ${episode.episode_number} ${tracked[`s${season}e${episode.episode_number}`]?.watched ? 'unwatched' : 'watched'}`}
          /></label
        >
      </article>{/each}{/if}
</section>
