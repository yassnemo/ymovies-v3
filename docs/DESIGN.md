# Design

YMovies uses dark surfaces, generous artwork and compact controls. The catalog should feel calm even when there is a lot to explore.

`src/lib/styles/base.css` contains shared layout and form styles. `catalog.css` handles navigation, discovery, cards and details. `hero-background.css` lets artwork dissolve into the ambient background; keep its transparent masks and extended blurred layer together when changing hero heights. `motion.css` owns interaction and navigation motion.

The interface uses the bundled Inter font. The favicon and app icons use the YMovies monogram. The default social preview uses the supplied homepage image at `static/og-image.jpg`; `static/social-card.svg` remains the editable source for the previous PNG artwork. Keep text readable when changing these assets, and retain the font license.

SvelteKit owns navigation. The root layout uses the View Transition API where available and respects reduced-motion preferences. Background motion, hero rotation and preview behavior also respect the appearance settings. Avoid adding a second router or a library that replaces Svelte's DOM.

Run `npm run test:design` with the app running. It captures desktop and mobile browser frames under `.temp/`. Check hero fades, narrow-screen navigation, keyboard focus, poster previews, dialogs and reduced motion after changing shared styles.

By Yassine Erradouani · [yerradouani.me](https://yerradouani.me)
