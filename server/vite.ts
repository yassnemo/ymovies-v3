import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Get the absolute path to the project root
  const rootPath = path.resolve(import.meta.dirname, '..');
  const clientPath = path.resolve(rootPath, 'client');
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    root: clientPath,
    base: '/',
    customLogger: {
      ...viteLogger,
      info: () => {}, // Suppress info messages
      warn: () => {}, // Suppress warnings
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
    optimizeDeps: {
      force: true
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'client/src'),
        '@shared': path.resolve(process.cwd(), 'shared'),
        '@assets': path.resolve(process.cwd(), 'attached_assets'),
      }
    }
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Use path.join with the clientPath for more reliable path resolution
      const clientTemplate = path.resolve(process.cwd(), 'client', 'index.html');

      // Check if the file exists
      if (!fs.existsSync(clientTemplate)) {
        log(`Warning: index.html not found at ${clientTemplate}`, 'vite');
        // Provide a fallback template
        let template = '<html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>';
        template = template.replace(
          `src="/src/main.tsx"`,
          `src="/src/main.tsx?v=${nanoid()}"`,
        );
        const page = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(page);
        return;
      }

      // Always reload the index.html file from disk in case it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      log(`Error processing ${url}: ${(e as Error).message}`, 'vite-error');
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // In serverless environments like Vercel, the static files are served differently
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    // For Vercel, static files might be in a different location
    const alternativeDistPath = path.resolve(process.cwd(), "public");
    if (fs.existsSync(alternativeDistPath)) {
      log(`Serving static files from alternative path: ${alternativeDistPath}`, 'static');
      app.use(express.static(alternativeDistPath, {
        maxAge: '1d',
        etag: true
      }));
    } else {
      log(`Warning: Could not find build directory at ${distPath} or ${alternativeDistPath}`, 'static');
    }
  } else {
    log(`Serving static files from: ${distPath}`, 'static');
    app.use(express.static(distPath, {
      maxAge: '1d',
      etag: true
    }));
  }

  // fall through to index.html if the file doesn't exist (critical for SPA routing)
  app.get("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    const alternativeIndexPath = path.resolve(process.cwd(), "public", "index.html");
    
    if (fs.existsSync(indexPath)) {
      log(`Serving index.html for SPA route from: ${indexPath}`, 'static');
      res.sendFile(indexPath);
    } else if (fs.existsSync(alternativeIndexPath)) {
      log(`Serving index.html for SPA route from alternative path: ${alternativeIndexPath}`, 'static');
      res.sendFile(alternativeIndexPath);
    } else {
      log(`Error: index.html not found in any expected location`, 'static');
      res.status(404).send('Application not found');
    }
  });
}
