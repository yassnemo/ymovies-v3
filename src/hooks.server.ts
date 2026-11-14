/*
__   __   __     __    _____
\ \ / /  /_ |   /_ |  |___ /
 \ V /    | |    | |    |_ \
  | |     | |    | |   ___) |
  |_|     |_|    |_|  |____/

Yassine Erradouani · https://yerradouani.me
*/
import type { Handle, HandleServerError } from '@sveltejs/kit/hooks';
import { site } from '#lib/site.ts';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  if (event.url.protocol === 'https:')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000');
  const preview =
    process.env.VERCEL_ENV === 'preview' &&
    event.url.hostname !== new URL(site.origin).hostname;
  if (
    preview ||
    response.status >= 400 ||
    /^\/(api|api-test|search|signin|signup|auth|profile|settings|my-list|reset-password|confirm-reset-password|verify-email|verify-success)(\/|$)/.test(
      event.url.pathname
    )
  ) {
    response.headers.set('X-Robots-Tag', 'noindex, follow');
  }
  return response;
};

export const handleError: HandleServerError = ({ kind }) => {
  if (kind !== 'unknown') return;
  // Library exceptions can contain query parameters or credentials.
  console.error('[YMovies] Request failed.');
  return { message: 'Something went wrong. Please try again.' };
};
