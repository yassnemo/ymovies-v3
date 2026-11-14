# Cinejoy visual reconstruction

Reference: <https://cinejoy.pk/>, inspected November 14, 2026.

The existing Svelte 5 / SvelteKit app now uses the reference's catalog layout and motion system. Root and `/home` share the same native Svelte implementation. YMovies branding, the live TMDB catalog, authentication, lists, favorites, collections, watch progress, and episode tracking remain connected to the existing services.

## Evidence

Local evidence lives in `.temp/cinejoy/` (ignored by Git). The reference was inspected with Chrome desktop and mobile captures, computed geometry, downloaded public styles, and the running WebGL program's shader and color uniforms.

- `reference-desktop.mp4`, `reference-mobile.mp4`: reference recordings.
- `refine-reference-desktop.png`, `reference-mobile-clean.png`: unobstructed reference home screens.
- `reference-desktop-search-clean.png`, `reference-desktop-settings-full.png`, `reference-movie-detail.png`: secondary screens.
- `refine-reference-desktop.json`: measured type, geometry, and shader uniforms.
- `final/desktop.mp4`, `final/mobile.mp4`: final implementation recordings, encoded from Chrome screencast frames with their original timestamps.
- `final/*.png`: final screenshots, including desktop hover/search/settings and 320/390/768px responsive checks.
- `design-results.json`, `browser-smoke.log`, `typecheck-final.log`, `build.log`, `unit-tests.log`: validation results.

Public assets and their SHA-256 manifest are in `.temp/cinejoy-static/`. `findings.md` records the source of the motion and styling measurements. The REA diagnostic reported no registered REA MCP server, so runtime inspection used direct Chrome DevTools Protocol; no machine configuration was changed.

## Layout and motion

| Element            | Implemented behavior                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Desktop navigation | 54px glass capsule, 40px items; 400ms spring for the active pill; 320ms condensing transition on scroll                   |
| Mobile navigation  | Floating icon capsule, 16px above the safe-area bottom; 370 × 64px at a 390px viewport                                    |
| Hero               | Full-bleed crossfade, title logo art, metadata, ranking, split controls; 8-second progress/advance, manual dots and pause |
| Poster rails       | 200 × 300px desktop cards, 16px gaps, 12px corners; horizontal arrows and scroll snapping                                 |
| Card motion        | 200ms entry from a 6px offset; 500ms image zoom; delayed glass preview with usable controls                               |
| Rankings           | Outlined 220px numerals on desktop, 150px on small screens                                                                |
| Ambient background | Fluid noise shader with the reference's measured four-color palette; bounded render resolution and frame rate             |
| Route changes      | Short fade/blur transition while fixed navigation stays in place                                                          |
| Accessibility      | Keyboard focus, named icon controls, Escape dismissal, reduced motion from OS or saved settings                           |

The refinement passes corrected font weight, row gutters and snapping, mobile backdrop crop, navigation width, shader colors, preview clipping, settings persistence, and small-screen button wrapping.

Hero artwork and its dark overlay now use transparent masks, blending into a blurred copy that extends behind the next sections. This treatment is shared by home, browse, and detail pages. Carousel changes fade both the artwork and its blurred backdrop, including fading the outgoing layers completely away.

## Scope and validation

`npm run test:design` uses a fresh Chrome profile and records both desktop and mobile flows. It checks automatic/manual carousel changes, saving titles, preview controls, row arrows, provider catalog changes, account-menu dismissal, search grids/results, persisted appearance, reduced-motion autoplay, fixed mobile navigation, and overflow at 320/390/768px. `npm run test:browser` checks the broader guest library, collections, filters, title detail, watch/episode tracking, authentication pages, settings, legal pages, and mobile navigation.

Catalog ordering, ranks, and descriptions come from YMovies' live data and can differ from Cinejoy. The implementation does not claim Cinejoy's streaming service, Trakt/Simkl integrations, download controls, or service announcements. Matching the visual reference does not add those services. Real account sign-in/email delivery still require the configured Supabase project.

Run `npm run dev`, then `npm run test:design`. Frames are written to `final/desktop-frames/` and `final/mobile-frames/`. Encode each recording from its `frames.ffconcat` with ffmpeg's concat demuxer, 30fps H.264, and `yuv420p` output.
