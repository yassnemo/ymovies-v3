Inter is the only bundled interface font.

Inter-latin-variable.woff2 covers Latin characters at weights 100–900.
It is loaded locally by src/lib/styles/catalog.css and preloaded in
src/app.html. The 48,256-byte file replaces the 876,576-byte TTF preload
(94.5% fewer font bytes for Latin-only text, before transfer compression).

Source (version pinned, downloaded through jsDelivr):
https://cdn.jsdelivr.net/npm/@fontsource-variable/inter@5.2.8/files/inter-latin-wght-normal.woff2

Inter-variable.woff2 is the full fallback for other characters. It is
352,240 bytes, versus 876,576 bytes for the original TTF. If both WOFF2
files load, they total 400,496 bytes (54.3% fewer bytes than the old TTF,
before transfer compression).

Full fallback source (version pinned, downloaded through jsDelivr):
https://cdn.jsdelivr.net/npm/inter-ui@4.1.0/variable/InterVariable.woff2

The original TTF is retained as a source asset, but is no longer requested.
Both WOFF2 files are self-hosted; visitors do not connect to jsDelivr.

Copyright Rasmus Andersson. Distributed under the SIL Open Font License;
keep the corresponding license with redistributed copies:
- Inter-OFL.txt: original TTF
- Inter-fontsource-OFL.txt: Latin WOFF2 subset
- Inter-ui-OFL.txt: full WOFF2 fallback

YMovies by Yassine Erradouani · https://yerradouani.me
