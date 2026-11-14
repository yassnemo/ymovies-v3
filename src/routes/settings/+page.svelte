<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { useApp } from '#lib/state.ts';
  import Icon from '#lib/components/Icon.svelte';
  const app = useApp();
  const { session, preferences, ready, syncing } = app;
  let firstName = $state('');
  let lastName = $state('');
  let password = $state('');
  let confirm = $state('');
  let busy = $state(false);
  let problem = $state('');
  let message = $state('');
  let activeSection = $state('account');
  const sections = [
    ['account', 'Account'],
    ['appearance', 'Appearance'],
    ['activity', 'Activity'],
    ['your-data', 'Your data']
  ];
  onMount(() => {
    const updateSection = () => {
      activeSection =
        sections
          .filter(
            ([id]) =>
              (document.getElementById(id)?.getBoundingClientRect().top ??
                Infinity) < 240
          )
          .at(-1)?.[0] || 'account';
    };
    window.addEventListener('scroll', updateSection, { passive: true });
    return () => window.removeEventListener('scroll', updateSection);
  });
  $effect(() => {
    firstName = $session?.user.user_metadata.first_name || '';
    lastName = $session?.user.user_metadata.last_name || '';
  });
  const defaults: Record<string, boolean> = {
    recommendations: true,
    newReleases: true,
    watchHistory: true,
    useForRecommendations: true
  };
  const options = [
    [
      'recommendations',
      'Personal recommendations',
      'Discover titles picked for your taste.'
    ],
    ['newReleases', 'New releases', 'Keep up with new titles.'],
    [
      'watchHistory',
      'Save watch history',
      'Keep a record of the stories you watch.'
    ],
    [
      'useForRecommendations',
      'Use my activity for recommendations',
      'Let your watch history help shape your suggestions.'
    ]
  ];
  let notifications = $derived({
    ...defaults,
    ...(($preferences.appSettings.notifications as Record<string, boolean>) ||
      {})
  });
  function toggle(key: string) {
    void app.update({
      appSettings: {
        ...$preferences.appSettings,
        notifications: { ...notifications, [key]: !notifications[key] }
      }
    });
  }
  async function saveProfile(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    problem = '';
    message = '';
    try {
      const { error } = await app.auth().updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim()
        }
      });
      if (error) throw error;
      message = 'Your profile has been updated.';
    } catch (error) {
      problem =
        error instanceof Error
          ? error.message
          : 'Profile could not be updated.';
    } finally {
      busy = false;
    }
  }
  async function changePassword(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    problem = '';
    message = '';
    try {
      if (password !== confirm) throw new Error('Passwords do not match.');
      const { error } = await app.auth().updateUser({ password });
      if (error) throw error;
      message = 'Your password has been updated.';
      password = '';
      confirm = '';
    } catch (error) {
      problem =
        error instanceof Error
          ? error.message
          : 'Password could not be updated.';
    } finally {
      busy = false;
    }
  }
  async function signOut() {
    try {
      const { error } = await app.auth().signOut();
      if (error) throw error;
      await goto('/home');
    } catch (error) {
      problem = error instanceof Error ? error.message : 'Could not sign out.';
    }
  }
  function clearHistory() {
    if (window.confirm('Clear the watch history in your library?'))
      void app.update({ watchHistory: [] });
  }
  function appearance(key: string, value: unknown) {
    void app.update({
      appSettings: { ...$preferences.appSettings, [key]: value }
    });
  }
</script>

<main id="main" class="page-container narrow settings-page">
  <p class="eyebrow">Make it yours</p>
  <h1 class="page-title"><Icon name="settings" size={30} />Settings</h1>
  <nav class="settings-sections" aria-label="Settings sections">
    {#each sections as [id, title]}<a
        href={'#' + id}
        class:active={activeSection === id}
        aria-current={activeSection === id ? 'location' : undefined}>{title}</a
      >{/each}
  </nav>
  {#if problem}<p class="error-message" role="alert" style="margin-bottom:24px">
      {problem}
    </p>{/if}{#if message}<p
      class="success-message"
      role="status"
      style="margin-bottom:24px"
    >
      {message}
    </p>{/if}{#if !$ready}<p role="status">
      Loading settings…
    </p>{:else}{#if $session}<section class="panel" id="account">
        <p class="eyebrow">Account</p>
        <h2>Your profile</h2>
        <p style="margin-bottom:24px">{$session.user.email}</p>
        <form class="stack" onsubmit={saveProfile}>
          <div class="two-columns">
            <label
              >First name<input
                bind:value={firstName}
                autocomplete="given-name"
                required
              /></label
            ><label
              >Last name<input
                bind:value={lastName}
                autocomplete="family-name"
              /></label
            >
          </div>
          <div>
            <button class="button primary" disabled={busy} type="submit"
              >Save profile</button
            >
          </div>
        </form>
      </section>
      <section class="panel">
        <p class="eyebrow">Security</p>
        <h2>Change password</h2>
        <form class="stack" style="margin-top:24px" onsubmit={changePassword}>
          <label
            >New password<input
              type="password"
              minlength="8"
              bind:value={password}
              autocomplete="new-password"
              required
            /></label
          ><label
            >Confirm password<input
              type="password"
              minlength="8"
              bind:value={confirm}
              autocomplete="new-password"
              required
            /></label
          >
          <div>
            <button class="button secondary" disabled={busy} type="submit"
              >Update password</button
            >
          </div>
        </form>
      </section>{:else}<section class="panel" id="account">
        <h2>Account</h2>
        <p>Sign in to sync your settings and watch progress across devices.</p>
        <div class="settings-account-row">
          <div>
            <strong>Not signed in</strong>
            <p>Create an account or sign in to sync your data</p>
          </div>
          <a class="button primary" href="/signin?next=/settings">Sign in</a>
        </div>
      </section>{/if}
    <section class="panel" id="appearance">
      <h2>Appearance</h2>
      <p>Change the look of the site to suit your needs.</p>
      <div class="appearance-row">
        <div>
          <strong>Theme</strong><span
            >Pick a color palette for the entire interface.</span
          >
        </div>
        <label
          ><span class="sr-only">Theme</span><select
            value={String($preferences.appSettings.theme || 'default')}
            onchange={(event) => appearance('theme', event.currentTarget.value)}
            ><option value="default">Default</option><option value="green"
              >Green</option
            ><option value="violet">Violet</option><option value="red"
              >Red</option
            ></select
          ></label
        >
      </div>
      <label class="toggle-row" style="flex-direction:row"
        ><div>
          Reduce Motion<span>Reduce effects and automatic transitions.</span>
        </div>
        <input
          type="checkbox"
          checked={$preferences.appSettings.reduceMotion === true}
          onchange={(event) =>
            appearance('reduceMotion', event.currentTarget.checked)}
        /></label
      >
      <label class="toggle-row" style="flex-direction:row"
        ><div>
          Show Title Logos<span
            >Display movie and series titles as image logos.</span
          >
        </div>
        <input
          type="checkbox"
          checked={$preferences.appSettings.showLogos !== false}
          onchange={(event) =>
            appearance('showLogos', event.currentTarget.checked)}
        /></label
      >
    </section>
    <section class="panel" id="activity">
      <p class="eyebrow">Preferences</p>
      <h2>Activity &amp; discovery</h2>
      {#each options as [key, title, description]}<label
          class="toggle-row"
          style="flex-direction:row"
          ><div>{title}<span>{description}</span></div>
          <input
            type="checkbox"
            checked={notifications[key]}
            onchange={() => toggle(key)}
          /></label
        >{/each}
      <p style="font-size:11px;margin-top:16px" role="status">
        {$syncing
          ? 'Saving…'
          : $session
            ? 'Preferences sync with your account.'
            : 'Preferences are saved on this device.'}
      </p>
    </section>
    <section class="panel" id="your-data">
      <p class="eyebrow">Your data</p>
      <h2>Watch history</h2>
      <p>Manage the titles in your viewing history.</p>
      <div class="actions">
        <a class="button secondary" href="/my-list?tab=history">View history</a
        ><button class="button secondary" onclick={clearHistory}
          >Clear history</button
        >
      </div>
    </section>
    <section class="panel">
      <h2>About YMovies</h2>
      <p>Discover movies and TV shows. Keep your favorites close.</p>
      <div class="actions">
        <a class="button secondary small" href="/privacy">Privacy Policy</a><a
          class="button secondary small"
          href="/terms">Terms of Service</a
        >{#if $session}<button class="button secondary small" onclick={signOut}
            >Sign out</button
          >{/if}
      </div>
    </section>{/if}
</main>
