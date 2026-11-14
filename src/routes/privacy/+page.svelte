<script lang="ts">
  import PolicyPage from '#lib/components/PolicyPage.svelte';
  import { site } from '#lib/site.ts';

  const sections = [
    { id: 'who-runs-ymovies', title: 'Who runs YMovies' },
    { id: 'information', title: 'Information you provide' },
    { id: 'browser-storage', title: 'Browser storage' },
    { id: 'analytics', title: 'Analytics' },
    { id: 'service-providers', title: 'Other services' },
    { id: 'storage-and-retention', title: 'Storage and retention' },
    { id: 'your-choices', title: 'Your choices' },
    { id: 'changes-and-contact', title: 'Changes and contact' }
  ];
</script>

<PolicyPage
  title="Privacy Policy"
  introduction="You can browse without an account. This page explains what stays on your device, what is used when you sign in, and which services help YMovies work."
  summary={[
    { label: 'Guest library', text: 'Saved in your browser on this device.' },
    {
      label: 'Account access',
      text: 'Supabase handles email and Google sign-in.'
    },
    {
      label: 'Website usage',
      text: 'Google Analytics measures visits and navigation.'
    }
  ]}
  {sections}
  related={{
    href: '/terms',
    title: 'Read the Terms of Service',
    description: 'What YMovies offers and the ground rules for using it.'
  }}
>
  <section id="who-runs-ymovies">
    <h2>1. Who runs YMovies</h2>
    <p>
      YMovies is a personal project operated by <a href={site.author.website}
        >{site.author.name}</a
      >. This policy covers information used to provide movie and TV discovery,
      accounts, saved libraries, and website analytics.
    </p>
    <p>
      If you have a question about your information, use the <a
        href={site.author.contact}>contact page</a
      > and mention YMovies.
    </p>
  </section>

  <section id="information">
    <h2>2. Information you provide</h2>
    <ul>
      <li>
        <strong>Account information.</strong> When you register with email/password,
        Supabase processes your email, password, and the profile details you supply.
        With Google sign-in, basic account details can include your name, email, and
        profile image. YMovies does not receive your Google password or request access
        to Gmail, Drive, or contacts.
      </li>
      <li>
        <strong>Your library and preferences.</strong> Saved titles, favorites, collections,
        ratings, watch and episode progress, genre preferences, and appearance settings
        are used to provide your library and recommendations. When you are signed
        in, this information can sync with your account.
      </li>
      <li>
        <strong>Messages.</strong> If you contact me, the details you provide are
        used to respond to that request. Please do not include passwords or sign-in
        codes.
      </li>
    </ul>
  </section>

  <section id="browser-storage">
    <h2>3. Browser storage</h2>
    <p>
      YMovies uses local browser storage for guest libraries, appearance
      choices, and a device copy of signed-in preferences. Supabase also uses
      browser storage to maintain your sign-in session. This lets your account
      and library work across visits.
    </p>
    <p>
      Clearing site data can remove your guest library and sign you out. It does
      not delete information already synced with an account or previously
      processed by service providers. On a shared device, sign out and clear
      site data if you do not want saved library information to remain there.
    </p>
  </section>

  <section id="analytics">
    <h2>4. Analytics</h2>
    <p>
      YMovies uses Google Analytics to understand page views, navigation, and
      browser and device information. Google Analytics may use cookies and
      similar identifiers. Requests to Google also include technical information
      such as your IP address.
    </p>
    <p>
      The page-view events sent by YMovies remove query strings and URL
      fragments from the page and referrer URLs. Account passwords and saved
      library contents are not included in those events.
    </p>
    <p>
      Read <a href="https://policies.google.com/technologies/partner-sites"
        >how Google uses information from sites that use its services</a
      >. You can use browser tracking controls or Google’s
      <a href="https://tools.google.com/dlpage/gaoptout"
        >Analytics opt-out browser add-on</a
      >. Availability and behavior depend on your browser.
    </p>
  </section>

  <section id="service-providers">
    <h2>5. Other services</h2>
    <p>
      YMovies does not sell or rent your account information. It relies on
      services that process information to operate their part of the website:
    </p>
    <ul>
      <li>
        <strong>Sign-in and storage.</strong>
        <a href="https://supabase.com/privacy">Supabase</a> handles authentication.
        A PostgreSQL database stores synced library and account information.
      </li>
      <li>
        <strong>Website delivery.</strong>
        <a href="https://vercel.com/legal/privacy-notice">Vercel</a> hosts the website
        and can process connection information and operational logs to deliver and
        protect it.
      </li>
      <li>
        <strong>Catalog and images.</strong>
        <a href="https://www.themoviedb.org/privacy-policy">TMDB</a> supplies catalog
        data and receives catalog search requests. Your browser also contacts its
        image servers when loading artwork.
      </li>
      <li>
        <strong>Trailers.</strong> Opening a YouTube trailer loads an embedded
        player. Google can then receive connection and device information and
        use cookies according to its
        <a href="https://policies.google.com/privacy">Privacy Policy</a>.
      </li>
      <li>
        <strong>Recommendations.</strong> If the optional recommendation service is
        enabled, it receives a limited summary of watched title IDs, ratings, and
        preferred genres. The app does not send it your account ID, email, or full
        library records.
      </li>
    </ul>
    <p>
      These providers may process information in countries other than the one
      where you live. Their own policies explain how they handle information
      within their services.
    </p>
  </section>

  <section id="storage-and-retention">
    <h2>6. Storage and retention</h2>
    <p>
      Guest libraries remain in browser storage until you remove them, clear
      site data, or your browser removes that storage. Account information and
      synced libraries remain associated with your account until they are
      updated, removed, or a deletion request is handled.
    </p>
    <p>
      Copies in provider logs, backups, or analytics systems can remain subject
      to those services’ retention settings. Security controls help protect
      information, but no website or storage system can guarantee complete
      security.
    </p>
  </section>

  <section id="your-choices">
    <h2>7. Your choices</h2>
    <ul>
      <li>
        Browse without signing in and keep a guest library on your device.
      </li>
      <li>
        Manage saved titles and collections in <a href="/my-list"
          >Your library</a
        >, and update your profile or clear library history in
        <a href="/settings">Settings</a>.
      </li>
      <li>
        Use browser controls to clear local data or manage cookies and tracking.
        Clearing local data does not delete your account.
      </li>
      <li>
        Remove YMovies access through your <a
          href="https://myaccount.google.com/connections"
          >Google account connections</a
        > if you use Google sign-in. This does not itself delete YMovies account data.
      </li>
      <li>
        <a href={site.author.contact}>Request access, correction, or deletion</a
        > of your account information and saved data. I may need to verify account
        ownership before acting on a request.
      </li>
    </ul>
  </section>

  <section id="changes-and-contact">
    <h2>8. Changes and contact</h2>
    <p>
      This policy may change when YMovies or its services change. The revision
      date at the top of this page will be updated when the policy is revised.
    </p>
    <p>
      For privacy questions or account data requests, <a
        href={site.author.contact}>contact Yassine Erradouani</a
      >. Include the email address you use for YMovies so I can identify the
      relevant account, but never include your password or authentication codes.
    </p>
  </section>
</PolicyPage>
