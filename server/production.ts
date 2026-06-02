import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from 'path';
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
    return originalResJson.apply(this, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

(async () => {
  // Register API routes
  registerRoutes(app);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV 
    });
  });

  // For production, we don't serve static files since frontend is on Vercel
  if (process.env.NODE_ENV === 'production') {
    // Simple API-only server for Heroku
    app.get('/', (req, res) => {
      res.json({ 
        message: 'YMovies API Server',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          movies: '/api/movies',
          search: '/api/search',
          recommendations: '/api/recommendations'
        }
      });
    });
  }

  // Error handling
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
  });

  const port = parseInt(process.env.PORT!) || 5000;
  
  app.listen(port, "0.0.0.0", () => {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    
    console.log(`${formattedTime} [express] serving production API on port ${port}`);
    
    if (app.get("env") === "development") {
      console.log(`${formattedTime} [express] development mode enabled`);
    }
  });
})();

// Optional: Start Python recommendation service in the background (if needed)
if (process.env.NODE_ENV === 'production' && process.env.START_RECOMMENDATION_SERVICE === 'true') {
  const { spawn } = require('child_process');
  
  console.log('Starting Python recommendation service...');
  const pythonService = spawn('python', ['recommendation_service/app.py'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  pythonService.on('error', (error: Error) => {
    console.error('Python service error:', error);
  });
  
  pythonService.on('close', (code: number) => {
    console.log(`Python service exited with code ${code}`);
  });
}
