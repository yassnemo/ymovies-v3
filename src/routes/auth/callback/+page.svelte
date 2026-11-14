<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { safeNext } from '#lib/preferences.ts';
  import { useApp } from '#lib/state.ts';
  const app = useApp();
  let problem = $state('');
  onMount(() => {
    void (async () => {
      try {
        if (page.url.searchParams.has('error'))
          throw new Error(
            page.url.searchParams.get('error_description') ||
              'This sign-in link could not be verified.'
          );
        const auth = app.auth();
        const code = page.url.searchParams.get('code');
        if (code) {
          const result = await auth.exchangeCodeForSession(code);
          if (result.error) throw result.error;
        }
        const result = await auth.getSession();
        if (!result.data.session)
          throw new Error(
            'This link has expired. Request a new one and try again.'
          );
        await goto(safeNext(page.url.searchParams.get('next')), {
          replaceState: true
        });
      } catch (error) {
        problem =
          error instanceof Error
            ? error.message
            : 'Sign in could not be completed.';
      }
    })();
  });
</script>

<main class="auth-shell" id="main">
  <section class="auth-card">
    <h1>{problem ? 'Unable to complete sign in' : 'Completing sign in…'}</h1>
    {#if problem}<p class="error-message" role="alert">{problem}</p>
      <a class="button primary" href="/signin" style="margin-top:20px"
        >Return to sign in</a
      >{:else}<p class="intro" role="status">
        Please wait while we verify your account.
      </p>{/if}
  </section>
</main>
