import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import os from 'os';

const app = express();

// CORS configuration for hybrid deployment
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  
  const origin = req.headers.origin;
  const isVercelPreview = origin ? (() => { try { return new URL(origin).hostname.endsWith('.vercel.app'); } catch { return false; } })() : false;
  if (origin && (allowedOrigins.includes(origin) || isVercelPreview)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    // Only log errors in development for cleaner output
    if (path.startsWith("/api") && res.statusCode >= 400) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Export function for serverless deployment
export async function createServer() {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Only send response if headers haven't been sent already
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  return app;
}

// Only start server if running directly (not in serverless environment)
if (import.meta.url === `file://${process.argv[1]}` || process.env.NODE_ENV !== 'production') {
(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Only send response if headers haven't been sent already
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Prefer port 5000 (or PORT env) but gracefully fall back if it's in use
  const preferredPort = Number(process.env.PORT) || 5000;
  const maxAttempts = 20; // try a small range of ports for local dev

  const tryListen = (startPort: number) => new Promise<void>((resolve, reject) => {
    let attempt = 0;

    const listenOn = (port: number) => {
      attempt++;

      const onListening = () => {
        // Detach listeners once we are listening
        server.off('error', onError);
        server.off('listening', onListening);
        console.log(`\n  ➜ Local:   \x1b[36mhttp://localhost:${port}\x1b[0m\n`);
        resolve();
      };

      const onError = (err: any) => {
        if (err && err.code === 'EADDRINUSE' && attempt < maxAttempts) {
          // Clean up and try the next port
          server.off('error', onError);
          server.off('listening', onListening);
          listenOn(port + 1);
          return;
        }
        reject(err);
      };

      server.once('error', onError);
      server.once('listening', onListening);

      if (os.platform() === 'win32') {
        // On Windows, bind without explicit hostname
        server.listen(port);
      } else {
        // On non-Windows, bind to 0.0.0.0
        server.listen({ port, host: '0.0.0.0', reusePort: true });
      }
    };

    listenOn(startPort);
  });

  try {
    await tryListen(preferredPort);
  } catch (err: any) {
    // Surface a clear error if we couldn't bind any port
    console.error(err);
    const reason = err?.code === 'EADDRINUSE'
      ? `All tested ports from ${preferredPort} to ${preferredPort + maxAttempts - 1} are in use.`
      : 'Failed to start server.';
    throw new Error(reason);
  }
})();
}
