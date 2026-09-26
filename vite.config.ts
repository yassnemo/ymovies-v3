import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(() => {
  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    server: {
      host: "0.0.0.0",
      // When Vite runs on its own, keep API calls on the same origin as the page.
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${process.env.PORT || 5000}`,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    base: "/",
  };
});
