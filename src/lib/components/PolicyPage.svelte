<script lang="ts">
  import type { Snippet } from 'svelte';
  import { site } from '#lib/site.ts';
  import Icon from './Icon.svelte';

  let {
    title,
    introduction,
    summary,
    sections,
    related,
    children
  }: {
    title: string;
    introduction: string;
    summary: { label: string; text: string }[];
    sections: { id: string; title: string }[];
    related: { href: string; title: string; description: string };
    children: Snippet;
  } = $props();
</script>

<main id="main" class="page-container policy-page">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <a href="/">Home</a><span aria-hidden="true">/</span><span
      aria-current="page">{title}</span
    >
  </nav>

  <header class="policy-header">
    <p class="section-kicker">YMovies / The details</p>
    <h1 class="page-title">{title}</h1>
    <p class="policy-introduction">{introduction}</p>
    <p class="policy-updated">
      <Icon name="calendar" size={15} />Last updated
      <time datetime="2026-11-14">November 14, 2026</time>
    </p>
  </header>

  <dl class="policy-summary" aria-label="At a glance">
    {#each summary as item}
      <div>
        <dt>{item.label}</dt>
        <dd>{item.text}</dd>
      </div>
    {/each}
  </dl>

  <div class="policy-layout">
    <aside class="policy-sidebar">
      <nav class="policy-contents" aria-label="On this page">
        <h2>On this page</h2>
        <ol>
          {#each sections as section, index}
            <li>
              <a href={'#' + section.id} data-sveltekit-reload
                ><span aria-hidden="true"
                  >{String(index + 1).padStart(2, '0')}</span
                >{section.title}</a
              >
            </li>
          {/each}
        </ol>
      </nav>
    </aside>

    <div class="policy-content">
      {@render children()}
      <div class="policy-contact">
        <div>
          <p class="section-kicker">A question about YMovies?</p>
          <h2>There’s a person behind it.</h2>
          <p>Get in touch with {site.author.name} through the contact page.</p>
        </div>
        <a class="button secondary" href={site.author.contact}
          >Contact Yassine<Icon name="right" size={16} /></a
        >
      </div>
      <a class="policy-related" href={related.href}
        ><div>
          <span>{related.title}</span>
          <p>{related.description}</p>
        </div>
        <Icon name="right" size={20} /></a
      >
    </div>
  </div>
</main>

<style>
  .policy-page {
    max-width: 1280px;
    padding-top: 132px;
  }
  .policy-page::before {
    content: '';
    position: fixed;
    inset: 0 0 auto;
    height: 108px;
    z-index: 10;
    pointer-events: none;
    background: linear-gradient(#050505 15%, #050505e6 50%, #05050500);
  }
  .policy-header {
    max-width: 760px;
  }
  .policy-header .section-kicker {
    color: var(--ym-accent);
    margin-bottom: 20px;
  }
  .policy-header .page-title {
    font-size: clamp(38px, 5vw, 64px);
    margin-bottom: 22px;
  }
  .policy-introduction {
    max-width: 640px;
    color: #ffffffab;
    font-size: 17px;
    line-height: 1.8;
  }
  .policy-updated {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 7px;
    color: #ffffff80;
    font-size: 12px;
    margin-top: 24px;
  }
  .policy-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 38px 0 52px;
    border: 1px solid #ffffff1a;
    border-radius: 18px;
    background: linear-gradient(120deg, #ffffff09, #ffffff03);
    overflow: hidden;
  }
  .policy-summary > div {
    padding: 23px 26px;
  }
  .policy-summary > div + div {
    border-left: 1px solid #ffffff14;
  }
  .policy-summary dt {
    color: #ffffff73;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 9px;
  }
  .policy-summary dd {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    font-weight: 500;
  }
  .policy-layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: clamp(36px, 6vw, 90px);
    align-items: start;
  }
  .policy-sidebar {
    position: sticky;
    top: 110px;
  }
  .policy-contents h2 {
    margin-bottom: 16px;
    font-size: 12px;
    font-weight: 600;
    color: #ffffffb3;
  }
  .policy-contents ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .policy-contents a {
    display: flex;
    gap: 12px;
    align-items: baseline;
    padding: 10px 0;
    min-height: 42px;
    color: #ffffff80;
    font-size: 12px;
    line-height: 1.5;
  }
  .policy-contents a span {
    font-size: 10px;
    color: #ffffff4d;
    font-variant-numeric: tabular-nums;
  }
  .policy-contents a:hover {
    color: #fff;
  }
  .policy-content {
    min-width: 0;
  }
  .policy-content :global(section) {
    scroll-margin-top: 110px;
    margin-bottom: 38px;
    padding-bottom: 38px;
    border-bottom: 1px solid #ffffff12;
  }
  .policy-content :global(section h2) {
    margin: 0 0 18px;
    color: #f2f2f2;
    font-size: 23px;
    line-height: 1.4;
    font-weight: 600;
    letter-spacing: -0.025em;
  }
  .policy-content :global(section p),
  .policy-content :global(section li) {
    font-size: 15px;
    line-height: 1.9;
    color: #ffffffa8;
  }
  .policy-content :global(section p + p),
  .policy-content :global(section ul + p) {
    margin-top: 15px;
  }
  .policy-content :global(section ul) {
    list-style: disc;
    padding-left: 21px;
    margin: 16px 0;
  }
  .policy-content :global(section li + li) {
    margin-top: 10px;
  }
  .policy-content :global(section li::marker) {
    color: #ffffff57;
  }
  .policy-content :global(section strong) {
    color: #ffffffd9;
    font-weight: 600;
  }
  .policy-content :global(section a) {
    color: #f2f2f2;
    text-decoration: underline;
    text-decoration-color: #ffffff4d;
    text-underline-offset: 4px;
    overflow-wrap: anywhere;
  }
  .policy-content :global(section a:hover) {
    text-decoration-color: var(--ym-accent);
  }
  .policy-contact {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 22px;
    padding: 28px;
    border: 1px solid #ffffff1a;
    border-radius: 18px;
    background: #ffffff05;
  }
  .policy-contact .section-kicker {
    color: #ffffff73;
    font-size: 9px !important;
  }
  .policy-contact h2 {
    margin: 10px 0 8px;
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  }
  .policy-contact p:not(.section-kicker) {
    max-width: 360px;
    color: #ffffff80;
    font-size: 13px;
    line-height: 1.8;
  }
  .policy-contact .button {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    white-space: nowrap;
  }
  .policy-related {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 26px 0;
  }
  .policy-related span {
    font-weight: 600;
    font-size: 14px;
  }
  .policy-related p {
    margin-top: 6px;
    color: #ffffff80;
    font-size: 12px;
    line-height: 1.7;
  }
  .policy-related:hover span {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  @media (max-width: 900px) {
    .policy-layout {
      grid-template-columns: minmax(0, 1fr);
      gap: 34px;
    }
    .policy-sidebar {
      position: static;
      padding-bottom: 24px;
      border-bottom: 1px solid #ffffff1a;
    }
    .policy-contents ol {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 24px;
    }
  }
  @media (max-width: 639px) {
    .policy-page {
      padding-top: 100px;
    }
    .policy-page::before {
      height: 90px;
    }
    .policy-header .page-title {
      font-size: 38px;
    }
    .policy-header .section-kicker {
      font-size: 10px !important;
    }
    .policy-introduction {
      font-size: 15px;
    }
    .policy-summary {
      grid-template-columns: minmax(0, 1fr);
      margin: 30px 0;
    }
    .policy-summary > div {
      padding: 18px 22px;
    }
    .policy-summary > div + div {
      border-left: 0;
      border-top: 1px solid #ffffff14;
    }
    .policy-summary dt {
      font-size: 10px;
      margin-bottom: 6px;
    }
    .policy-summary dd {
      font-size: 13px;
    }
    .policy-contents a {
      min-height: 44px;
    }
    .policy-content :global(section) {
      scroll-margin-top: 96px;
      margin-bottom: 30px;
      padding-bottom: 30px;
    }
    .policy-content :global(section h2) {
      font-size: 21px;
    }
    .policy-content :global(section p),
    .policy-content :global(section li) {
      font-size: 14px;
    }
    .policy-contact {
      padding: 22px;
    }
  }
</style>
