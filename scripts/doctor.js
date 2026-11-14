#!/usr/bin/env node
// Yassine Erradouani · https://yerradouani.me
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) loadEnvFile(file);
}
const [major, minor] = process.versions.node.split('.').map(Number);
const supported = major > 22 || (major === 22 && minor >= 12);
console.log(
  `Node ${process.versions.node}: ${supported ? 'supported' : 'requires 22.12 or newer'}`
);
let healthy = supported;
for (const file of [
  'node_modules/svelte/package.json',
  'src/app.html',
  'vite.config.ts',
  'static/favicon.svg'
]) {
  const present = existsSync(file);
  console.log(`${file}: ${present ? 'present' : 'missing'}`);
  healthy &&= present;
}
const configured = (...keys) =>
  keys.some((key) => Boolean(process.env[key]?.trim()));
const features = [
  ['Catalog', configured('TMDB_API_KEY', 'TMDB_BEARER_TOKEN')],
  [
    'Sign-in',
    configured('PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL') &&
      configured('PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')
  ],
  [
    'Account sync',
    configured('SUPABASE_URL') &&
      configured('SUPABASE_SERVICE_ROLE_KEY') &&
      configured('DATABASE_URL')
  ],
  [
    'Python recommendations',
    configured('RECOMMENDATION_SERVICE_URL') &&
      configured('RECOMMENDATION_SERVICE_TOKEN')
  ]
];
for (const [name, ready] of features)
  console.log(`${name}: ${ready ? 'configured' : 'not configured (optional)'}`);
console.log(
  'Configuration values are not printed. See docs/setup/INSTALLATION.md for setup.'
);
process.exitCode = healthy ? 0 : 1;
