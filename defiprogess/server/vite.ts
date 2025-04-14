import express, { Express } from 'express';
import { Server } from 'http';
import path from 'path';
import fs from 'fs';

export function log(message: string, source = "express") {
  console.log(`[${source}] ${message}`);
}

export async function setupVite(app: any, server: Server) {
  // In development, use Vite's dev server
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: {
        clientPort: 443,
      },
      watch: {
        usePolling: true,
      },
      host: '0.0.0.0',
      fs: {
        strict: false,
        allow: ['..']
      },
    },
    appType: 'custom',
    root: path.resolve(process.cwd(), 'defiprogess/client'),
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);
  
  // Handle client-side routing
  app.use('*', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const url = req.originalUrl;
    
    try {
      // If this is an API request, skip to the next handler
      if (url.startsWith('/api/')) {
        return next();
      }
      
      // Serve the index.html
      let template = fs.readFileSync(
        path.resolve(process.cwd(), 'defiprogess/client', 'index.html'),
        'utf-8'
      );
      
      // Apply Vite HTML transforms
      template = await vite.transformIndexHtml(url, template);
      
      // Send the transformed HTML
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      // If an error is caught, let Vite handle it
      vite.ssrFixStacktrace(e as Error);
      console.error(e);
      next(e);
    }
  });
  
  return app;
}

export function serveStatic(app: any) {
  // Serve static assets from client/dist
  const clientDistPath = path.resolve(process.cwd(), 'defiprogess/client/dist');
  
  app.use(express.static(clientDistPath));
  
  // Handle client-side routing
  app.get('*', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // If this is an API request, skip to the next handler
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // Otherwise, serve the index.html
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}