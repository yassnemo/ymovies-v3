<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { useApp } from '#lib/state.ts';
  import Icon from './Icon.svelte';
  const app = useApp();
  const { session } = app;
  let menu = $state(false);
  $effect(() => {
    document.body.dataset.accountMenu = String(menu);
    return () => delete document.body.dataset.accountMenu;
  });
  let condensed = $state(false);
  let nav = $state<HTMLElement>(null!);
  let pill = $state({ x: 0, width: 108 });
  const links = [
    ['/', 'Home', 'home'],
    ['/movies', 'Movies', 'film'],
    ['/tv', 'Shows', 'tv'],
    ['/my-list', 'My List', 'bookmark']
  ];
  let active = $derived(
    page.url.pathname === '/home'
      ? '/'
      : page.url.pathname.startsWith('/movie')
        ? '/movies'
        : page.url.pathname.startsWith('/tv') ||
            page.url.pathname.startsWith('/series')
          ? '/tv'
          : page.url.pathname.startsWith('/my-list') ||
              page.url.pathname.startsWith('/lists')
            ? '/my-list'
            : page.url.pathname
  );
  function measure() {
    const item = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (item) pill = { x: item.offsetLeft, width: item.offsetWidth };
  }
  $effect(() => {
    active;
    menu = false;
    requestAnimationFrame(measure);
  });
  onMount(() => {
    const scroll = () => {
      condensed = window.scrollY > 80;
    };
    const resize = new ResizeObserver(measure);
    if (nav) resize.observe(nav);
    window.addEventListener('scroll', scroll, { passive: true });
    scroll();
    measure();
    return () => {
      resize.disconnect();
      window.removeEventListener('scroll', scroll);
    };
  });
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape') menu = false;
  }}
/>
<header class="cine-navigation" class:condensed>
  <div class="nav-brand-group">
    {#if active !== '/'}<button
        class="back-control"
        aria-label="Go back"
        onclick={() =>
          window.history.length > 1
            ? window.history.back()
            : window.location.assign('/')}
        ><Icon name="left" size={25} /></button
      >{/if}
    <a class="cine-brand" href="/" aria-label="YMovies home"
      ><img
        src="/images/landing/brand-mark.svg"
        alt="YMovies"
        width="42"
        height="44"
      /></a
    >
  </div>
  <nav class="cine-desktop-nav" aria-label="Main navigation" bind:this={nav}>
    <span
      class="active-nav-pill"
      style={'transform:translateX(' +
        pill.x +
        'px);width:' +
        pill.width +
        'px'}
    ></span>
    {#each links as [href, label, icon]}<a
        {href}
        class:active={active === href}
        aria-current={active === href ? 'page' : undefined}
        >{#if active === href}<Icon name={icon} size={15} />{/if}{label}</a
      >{/each}
    <span class="nav-divider"></span>
    <a
      class="nav-icon"
      class:active={active === '/search'}
      href="/search"
      aria-label="Search"><Icon name="search" size={21} /></a
    >
    <button
      class="nav-icon"
      class:active={menu || active === '/settings'}
      aria-label="Settings"
      aria-expanded={menu}
      onclick={() => (menu = !menu)}><Icon name="settings" size={20} /></button
    >
  </nav>
</header>
{#if menu}<button
    class="menu-dismiss"
    aria-label="Close account menu"
    onclick={() => (menu = false)}
  ></button>
  <nav class="cine-account-menu" aria-label="Account menu">
    <a href={$session ? '/profile' : '/signin'}
      ><Icon name="user" size={17} />{$session ? 'Your profile' : 'Login'}</a
    >
    <hr />
    <a href="/settings"><Icon name="settings" size={17} />Settings</a>
    <a href="/my-list?tab=history"
      ><Icon name="clock" size={17} />Watch History</a
    >
    <a href="/my-list?tab=collections"
      ><Icon name="bookmark" size={17} />Collections</a
    >
    {#if $session}<button
        onclick={async () => {
          await app.auth().signOut();
          menu = false;
        }}><Icon name="logout" size={17} />Sign out</button
      >{/if}
  </nav>{/if}
<nav class="cine-mobile-nav mobile-nav" aria-label="Mobile navigation">
  {#each links as [href, label, icon]}<a
      {href}
      class:active={active === href}
      aria-current={active === href ? 'page' : undefined}
      aria-label={label}><Icon name={icon} size={23} /></a
    >{/each}
  <a href="/search" class:active={active === '/search'} aria-label="Search"
    ><Icon name="search" size={24} /></a
  >
  <button
    aria-label="Settings"
    class:active={menu || active === '/settings'}
    aria-expanded={menu}
    onclick={() => (menu = !menu)}><Icon name="settings" size={23} /></button
  >
</nav>
