# Security

Report vulnerabilities privately through [GitHub's security reporting form](https://github.com/yassnemo/ymovies-v3/security/advisories/new). Include the affected route or file, steps to reproduce, and the likely impact. Do not post credentials, account data or exploit details in a public issue. If private reporting is unavailable, use the contact options on [yerradouani.me](https://yerradouani.me).

The supported code is the current `main` branch. Use current dependencies and deploy fixes promptly. Never commit environment files. Rotate exposed credentials at their provider; deleting a file does not remove it from Git history.

## Boundaries

- TMDB and service-role credentials belong on the server. Only the Supabase project URL and anonymous key are browser configuration.
- Account APIs verify the Supabase bearer token and derive the account ID from that session.
- JSON writes have body, depth and schema bounds. The public TMDB gateway allows specific resources and query parameters.
- Recommendation services authenticate with a separate shared token, reject redirects and limit request sizes and caches.
- Browser responses use a Content Security Policy and security headers. Logs avoid raw SQL, authentication tokens and upstream response bodies.

These controls do not replace monitoring, backups, provider access controls or a deployment-level rate limit. Process-local caches do not impose a global request quota across multiple instances.

## Dependency review

Run `npm audit` when updating dependencies. The current tree has one underlying low-severity advisory in `deepmerge`, reached through Svelte's build plugin. It merges trusted compiler configuration in this project, not request data. There is no patched release listed for [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). Do not downgrade SvelteKit to an obsolete version to silence the audit. Track the upstream fix and keep untrusted input out of build configuration.

By [Yassine Erradouani](https://yerradouani.me).
