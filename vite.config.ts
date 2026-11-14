import { defineConfig, loadEnv } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import node from '@sveltejs/adapter-node';
import vercel from '@sveltejs/adapter-vercel';

export default defineConfig(({ mode }) => {
  // Database/recommendation services consume server-only process.env.
  const environment = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(environment)) {
    if (key !== 'NODE_ENV') process.env[key] ??= value;
  }
  // Vite owns NODE_ENV; an old deployment .env must not switch dev into production.
  if (mode === 'development') process.env.VITE_USER_NODE_ENV = 'development';
  else delete process.env.VITE_USER_NODE_ENV;
  return {
    plugins: [
      sveltekit({
        adapter: process.env.VERCEL ? vercel() : node(),
        preprocess: vitePreprocess(),
        files: { assets: 'client/public' }
      })
    ],
    server: {
      host: true,
      port: 5000,
      watch: { ignored: ['**/.temp/**', '**/build/**', '**/dist/**'] }
    }
  };
});
