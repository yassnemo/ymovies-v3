<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { useApp } from '#lib/state.ts';
  import { safeNext } from '#lib/preferences.ts';
  let { mode }: { mode: 'signin' | 'signup' | 'reset' | 'confirm' | 'verify' } =
    $props();
  const app = useApp();
  const { session, ready } = app;
  let email = $state('');
  let password = $state('');
  let confirm = $state('');
  let firstName = $state('');
  let lastName = $state('');
  let busy = $state(false);
  let problem = $state('');
  let message = $state('');
  const titles = {
    signin: 'Welcome back',
    signup: 'Make room for great stories',
    reset: 'Reset your password',
    confirm: 'Choose a new password',
    verify: 'Check your inbox'
  };
  let title = $derived(titles[mode]);
  const callback = () => `${location.origin}/auth/callback`;
  onMount(() => {
    if (!['confirm', 'verify'].includes(mode)) return;
    const code = page.url.searchParams.get('code');
    const tokenHash = page.url.searchParams.get('token_hash');
    if (!code && !tokenHash) return;
    busy = true;
    void (async () => {
      try {
        const auth = app.auth();
        const result = code
          ? await auth.exchangeCodeForSession(code)
          : await auth.verifyOtp({
              token_hash: tokenHash!,
              type: mode === 'confirm' ? 'recovery' : 'email'
            });
        if (result.error) throw result.error;
        history.replaceState(null, '', location.pathname);
      } catch (error) {
        problem =
          error instanceof Error
            ? error.message
            : 'This link could not be verified.';
      } finally {
        busy = false;
      }
    })();
  });
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    problem = '';
    message = '';
    try {
      const auth = app.auth();
      if (mode === 'signin') {
        const result = await auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        await goto(safeNext(page.url.searchParams.get('next')));
      } else if (mode === 'signup') {
        if (password !== confirm) throw new Error('Passwords do not match.');
        const result = await auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callback(),
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim()
            }
          }
        });
        if (result.error) throw result.error;
        if (result.data.session) await goto('/home');
        else
          message = 'Check your email to confirm your account, then sign in.';
      } else if (mode === 'reset') {
        const result = await auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/reset-password`
        });
        if (result.error) throw result.error;
        message =
          'If an account exists for this email, you’ll receive a password reset link.';
      } else if (mode === 'confirm') {
        if (password !== confirm) throw new Error('Passwords do not match.');
        const result = await auth.updateUser({ password });
        if (result.error) throw result.error;
        message =
          'Your password has been updated. You can continue to YMovies.';
        password = '';
        confirm = '';
      } else {
        const result = await auth.resend({
          type: 'signup',
          email: email || $session?.user.email || '',
          options: { emailRedirectTo: callback() }
        });
        if (result.error) throw result.error;
        message = 'A new confirmation link has been sent. Check your inbox.';
      }
    } catch (error) {
      problem = error instanceof Error ? error.message : 'Please try again.';
    } finally {
      busy = false;
    }
  }
  async function google() {
    busy = true;
    problem = '';
    try {
      const result = await app
        .auth()
        .signInWithOAuth({
          provider: 'google',
          options: { redirectTo: callback() }
        });
      if (result.error) throw result.error;
    } catch (error) {
      problem =
        error instanceof Error
          ? error.message
          : 'Google sign in is unavailable.';
      busy = false;
    }
  }
</script>

<svelte:head><title>{title} — YMovies</title></svelte:head>
<main class="auth-shell" id="main">
  <section class="auth-card">
    <a class="brand" href="/"
      ><img
        src="/images/landing/brand-mark.svg"
        width="32"
        height="28"
        alt=""
      />YMovies</a
    >
    <h1>{title}</h1>
    <p class="intro">
      {mode === 'signin'
        ? 'Your next great watch is waiting.'
        : mode === 'signup'
          ? 'Save favorites, build your list, and discover more.'
          : mode === 'verify'
            ? 'Follow the confirmation link in your email to activate your account.'
            : 'We’ll help you get back to your movies.'}
    </p>
    {#if problem}<p
        class="error-message"
        role="alert"
        style="margin-bottom:18px"
      >
        {problem}
      </p>{/if}{#if message}<p
        class="success-message"
        role="status"
        style="margin-bottom:18px"
      >
        {message}
      </p>{/if}
    {#if mode === 'verify' && $session?.user.email_confirmed_at}<p
        class="success-message"
      >
        Your email is verified.
      </p>
      <a class="button primary" href="/home" style="margin-top:20px"
        >Continue to YMovies</a
      >
    {:else if mode === 'confirm' && $ready && !$session}<p
        class="error-message"
      >
        Open the password reset link from your email before choosing a new
        password.
      </p>
      <a class="button secondary" href="/reset-password" style="margin-top:20px"
        >Request a new link</a
      >
    {:else}<form onsubmit={submit}>
        {#if mode === 'signup'}<div class="two-columns">
            <label
              >First name<input
                autocomplete="given-name"
                bind:value={firstName}
                required
              /></label
            ><label
              >Last name<input
                autocomplete="family-name"
                bind:value={lastName}
                required
              /></label
            >
          </div>{/if}{#if mode !== 'confirm'}<label
            >Email<input
              type="email"
              autocomplete="email"
              bind:value={email}
              required
              placeholder="you@example.com"
            /></label
          >{/if}{#if ['signin', 'signup', 'confirm'].includes(mode)}<label
            >Password<input
              type="password"
              autocomplete={mode === 'signin'
                ? 'current-password'
                : 'new-password'}
              bind:value={password}
              minlength={mode === 'signin' ? 1 : 8}
              required
            /></label
          >{/if}{#if mode === 'signup' || mode === 'confirm'}<label
            >Confirm password<input
              type="password"
              autocomplete="new-password"
              bind:value={confirm}
              minlength="8"
              required
            /></label
          >{/if}{#if mode === 'signup'}<label
            style="flex-direction:row;align-items:center;font-size:10px"
            ><input type="checkbox" required />I agree to the
            <a href="/terms">Terms</a>
            and <a href="/privacy">Privacy Policy</a>.</label
          >{/if}<button class="button primary" type="submit" disabled={busy}
          >{busy
            ? 'Please wait…'
            : mode === 'signin'
              ? 'Sign in'
              : mode === 'signup'
                ? 'Create account'
                : mode === 'reset'
                  ? 'Send reset link'
                  : mode === 'confirm'
                    ? 'Update password'
                    : 'Resend confirmation email'}</button
        >
      </form>{/if}
    {#if mode === 'signin' || mode === 'signup'}<div class="auth-divider">
        or
      </div>
      <button class="button secondary" onclick={google} disabled={busy}
        >Continue with Google</button
      >{/if}
    <div class="auth-links">
      {#if mode === 'signin'}<p>
          <a href="/reset-password">Forgot your password?</a>
        </p>
        <p style="margin-top:12px">
          New here? <a href="/signup">Create an account</a>
        </p>{:else}<a href="/signin">Back to sign in</a>{/if}
      <p style="margin-top:14px"><a href="/home">Explore as a guest</a></p>
    </div>
  </section>
</main>
