// Script to check Vite environment variables
import { defineConfig } from 'vite';

console.log("Current environment variables:");
console.log("-------------------------------");
console.log("process.env.TMDB_API_KEY configured:", Boolean(process.env.TMDB_API_KEY));
console.log("import.meta.env available in Vite components");
