# Quick start

Install Node.js 24, then run:

```sh
npm ci
cp .env.example .env
npm run dev
```

On PowerShell use `Copy-Item .env.example .env`. Set `TMDB_API_KEY` or `TMDB_BEARER_TOKEN` before starting. Open http://localhost:5000.

Guest lists work locally. Add Supabase and database settings from [the installation guide](setup/INSTALLATION.md) for accounts and sync. Run `npm run check`, `npm test`, and `npm run build` before committing.
