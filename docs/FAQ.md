# FAQ

## Which framework does YMovies use?

Svelte 5 and SvelteKit 3 with TypeScript, Vite, and Tailwind CSS. Every interface component is a Svelte component.

## Can I browse without signing in?

Yes. Browsing needs a TMDB server credential. Guest favorites, lists, collections, and progress are stored on the device. Sign in with Supabase to sync preferences.

## What happens to my existing list?

Existing local preference keys and per-show episode tracking are read by the Svelte app. Account preferences retain the existing database format. Movie and TV IDs are distinguished by media type.

## Does the app host movies?

No. Detail pages provide trailers, catalog information, and watch-provider availability.

## How do I run or deploy it?

See [quick start](QUICK_START.md), [installation](setup/INSTALLATION.md), and [deployment](deployment/DEPLOYMENT.md).
