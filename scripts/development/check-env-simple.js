#!/usr/bin/env node
// Run with: node --env-file-if-exists=.env scripts/development/check-env-simple.js
const configured = (value) =>
  Boolean(value && !value.includes('your_') && !value.includes('_here'));
const catalog =
  configured(process.env.TMDB_API_KEY) ||
  configured(process.env.TMDB_BEARER_TOKEN);
const publicUrl =
  process.env.PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const publicKey =
  process.env.PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
console.log('Catalog credential configured:', catalog);
console.log(
  'Browser accounts configured:',
  configured(publicUrl) && configured(publicKey)
);
console.log(
  'Account sync configured:',
  ['DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].every((key) =>
    configured(process.env[key])
  )
);
if (!catalog) {
  console.error('Set TMDB_API_KEY or TMDB_BEARER_TOKEN for catalog browsing.');
  process.exitCode = 1;
}
