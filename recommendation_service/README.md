# Recommendation service

This optional Flask service blends content similarity, viewing history, ratings and genre preferences. The SvelteKit app has a TypeScript engine and runs without it.

Use Python 3.12 or newer. Create a virtual environment, activate it, then install `requirements.txt`:

```sh
python -m venv .venv
python -m pip install -r requirements.txt
```

Set `TMDB_API_KEY` and `RECOMMENDATION_SERVICE_TOKEN` in the service environment before importing `app`. Use a long random service token and keep it private. In a separate terminal, configure the web app with the same token and `RECOMMENDATION_SERVICE_URL=http://localhost:5100`.

For local development:

```sh
python -m flask --app app run --port 5100
```

For production, use the included Gunicorn start command in `Procfile` on a Linux host. Remote service URLs require HTTPS. The web connector rejects redirects and URL credentials.

`GET /health` is public. Other routes require `Authorization: Bearer <RECOMMENDATION_SERVICE_TOKEN>`. Personalized requests accept only `watched_ids`, `rated_movies` and `liked_genres`. JSON bodies are capped at 64 KiB, and caches are bounded by age, entries and bytes.

Run `python -m unittest test_app` from this directory. Tests mock catalog calls and use test credentials; they do not contact live accounts or TMDB.

By [Yassine Erradouani](https://yerradouani.me). See the main [deployment guide](../docs/deployment/DEPLOYMENT.md) for hosting and the [security policy](../SECURITY.md) for reporting issues.
