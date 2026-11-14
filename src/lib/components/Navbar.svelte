<script lang="ts">
  import { page } from '$app/state';
  import { useApp } from '#lib/state.ts';
  import Icon from './Icon.svelte';
  const app = useApp();
  const { session } = app;
  let open = $state(false);
  const links = [
    ['/home', 'Home', 'home'],
    ['/movies', 'Movies', 'film'],
    ['/tv', 'TV shows', 'tv'],
    ['/my-list', 'My list', 'bookmark']
  ];
  $effect(() => {
    page.url.pathname;
    open = false;
  });
</script>

<header class="site-header">
  <a class="brand" href="/home" aria-label="YMovies home"
    ><img
      src="/images/landing/brand-mark.svg"
      width="32"
      height="28"
      alt=""
    /><span>YMovies</span></a
  >
  <nav class="desktop-nav" aria-label="Main navigation">
    {#each links as [href, label]}<a
        {href}
        class:active={page.url.pathname === href}
        aria-current={page.url.pathname === href ? 'page' : undefined}
        >{label}</a
      >{/each}
  </nav>
  <div class="nav-actions">
    <a class="icon-button" href="/search" aria-label="Search"
      ><Icon name="search" /></a
    >
    {#if $session}<a class="avatar" href="/profile" aria-label="Your profile"
        >{($session.user.user_metadata.first_name || $session.user.email || 'Y')
          .slice(0, 1)
          .toUpperCase()}</a
      >
    {:else}<a class="button small primary" href="/signin">Sign in</a>{/if}
    <button
      class="icon-button mobile-menu"
      onclick={() => (open = !open)}
      aria-expanded={open}
      aria-label="Toggle account menu"><Icon name="menu" /></button
    >
  </div>
</header>
{#if open}<nav class="account-menu" aria-label="Account">
    <a href="/profile">Profile</a><a href="/settings">Settings</a
    >{#if $session}<button
        onclick={async () => {
          await app.auth().signOut();
          open = false;
        }}>Sign out</button
      >{/if}
  </nav>{/if}
<nav class="mobile-nav" aria-label="Mobile navigation">
  {#each links as [href, label, icon]}<a
      {href}
      class:active={page.url.pathname === href}
      aria-current={page.url.pathname === href ? 'page' : undefined}
      ><Icon name={icon} size={19} /><span>{label}</span></a
    >{/each}<a href="/search" class:active={page.url.pathname === '/search'}
    ><Icon name="search" size={19} /><span>Search</span></a
  >
</nav>
