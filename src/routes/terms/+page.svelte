<script lang="ts">
  import PolicyPage from '#lib/components/PolicyPage.svelte';
  import { site } from '#lib/site.ts';

  const sections = [
    { id: 'the-service', title: 'What YMovies does' },
    { id: 'accounts', title: 'Your account' },
    { id: 'your-library', title: 'Your library' },
    { id: 'acceptable-use', title: 'Using it responsibly' },
    { id: 'content-and-links', title: 'Content and other services' },
    { id: 'availability', title: 'Availability and changes' },
    { id: 'contact', title: 'Questions and contact' }
  ];
</script>

<PolicyPage
  title="Terms of Service"
  introduction="A few ground rules for using YMovies: what the service offers, how your library works, and what to expect from the information you find here."
  summary={[
    {
      label: 'The service',
      text: 'Movie and TV discovery, trailers, and personal libraries.'
    },
    {
      label: 'Your choice',
      text: 'Browse as a guest or sign in to sync your library.'
    },
    {
      label: 'Full-length titles',
      text: 'YMovies does not host or stream movies or episodes.'
    }
  ]}
  {sections}
  related={{
    href: '/privacy',
    title: 'Read the Privacy Policy',
    description:
      'How account information, browser storage, and analytics are used.'
  }}
>
  <section id="the-service">
    <h2>1. What YMovies does</h2>
    <p>
      YMovies is a personal project created by <a href={site.author.website}
        >{site.author.name}</a
      >. It helps you discover movies and TV shows, explore cast and trailers,
      find provider information, and manage favorites, watchlists, collections,
      and viewing progress.
    </p>
    <p>
      By using YMovies, you agree to these terms. If you do not agree, please
      stop using the service. How your information is handled is explained
      separately in the <a href="/privacy">Privacy Policy</a>.
    </p>
  </section>

  <section id="accounts">
    <h2>2. Your account</h2>
    <p>
      You can browse and keep a library on your device without signing in.
      Account features use Supabase authentication, with email/password or
      Google sign-in where available.
    </p>
    <p>
      Keep your sign-in details private, provide accurate account information,
      and let me know if you believe someone has accessed your account without
      permission. Never send passwords, sign-in codes, or session tokens through
      a contact form.
    </p>
  </section>

  <section id="your-library">
    <h2>3. Your library</h2>
    <p>
      A guest library is stored in your browser. Clearing site data, changing
      browsers, or losing access to the device can remove it. Signing in allows
      your library and preferences to sync with your account; sync can be
      delayed when a connection or service is unavailable.
    </p>
    <p>
      You can manage saved titles and collections in <a href="/my-list"
        >Your library</a
      >, and account and appearance preferences in
      <a href="/settings">Settings</a>. Keep your own copy of information you
      cannot afford to lose.
    </p>
  </section>

  <section id="acceptable-use">
    <h2>4. Using it responsibly</h2>
    <p>Please do not use YMovies to:</p>
    <ul>
      <li>Break applicable laws or infringe someone else’s rights.</li>
      <li>
        Access another person’s account, bypass access controls, or expose
        private information.
      </li>
      <li>
        Overload the service, distribute malicious code, or interfere with other
        people’s access.
      </li>
      <li>
        Misuse catalog data, images, or third-party services contrary to their
        permissions.
      </li>
    </ul>
    <p>
      Access may be restricted to protect users or respond to misuse. Security
      problems can be <a href={site.repository + '/security/advisories/new'}
        >reported privately through GitHub</a
      >.
    </p>
  </section>

  <section id="content-and-links">
    <h2>5. Content and other services</h2>
    <p>
      Movie and TV information and images come from <a
        href="https://www.themoviedb.org">TMDB</a
      >; provider availability is supplied through TMDB by JustWatch. Posters,
      trailers, logos, and other third-party material remain subject to their
      owners’ rights.
    </p>
    <p>
      This product uses the TMDB API but is not endorsed or certified by TMDB.
    </p>
    <p>
      YMovies does not host full-length movies or TV episodes. Embedded trailers
      and links to external providers are governed by those services’ own terms
      and privacy policies. Check availability, access requirements, and pricing
      with the provider.
    </p>
    <p>
      The YMovies source code is available under the <a
        href={site.repository + '/blob/main/LICENSE'}>MIT license</a
      >. That license does not grant rights to third-party movie artwork,
      metadata, or videos.
    </p>
  </section>

  <section id="availability">
    <h2>6. Availability and changes</h2>
    <p>
      Features and third-party data can change or become unavailable. Catalog
      details, ratings, recommendations, and provider listings may be incomplete
      or out of date. YMovies does not guarantee a particular recommendation or
      uninterrupted access.
    </p>
    <p>
      These terms may be updated as the service changes. Revisions will appear
      here with a new update date. Nothing in these terms limits rights that
      applicable law does not allow to be limited.
    </p>
  </section>

  <section id="contact">
    <h2>7. Questions and contact</h2>
    <p>
      For questions about these terms or the service, <a
        href={site.author.contact}>contact Yassine Erradouani</a
      >. Mention YMovies and the issue you are asking about so I can help.
    </p>
  </section>
</PolicyPage>
