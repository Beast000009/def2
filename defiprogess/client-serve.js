import express from 'express';
import { createServer } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start Vite directly
console.log("Starting Vite development server...");
const viteProcess = exec('npx vite', { cwd: path.join(__dirname) });

viteProcess.stdout.on('data', (data) => {
  console.log(`Vite: ${data}`);
});

viteProcess.stderr.on('data', (data) => {
  console.error(`Vite Error: ${data}`);
});

// Create a proxy server
const app = express();
const port = 3000;  // Proxy server port

// Proxy API requests to the blockchain server
app.use('/api', createProxyMiddleware({
  target: 'http://0.0.0.0:5000',
  changeOrigin: true
}));

// Proxy all other requests to the Vite dev server
app.use('/', createProxyMiddleware({
  target: 'http://0.0.0.0:5173', 
  changeOrigin: true,
  ws: true,
}));

// Create HTTP server
const server = createServer(app);

server.listen(port, '0.0.0.0', () => {
  console.log(`Proxy server running on http://0.0.0.0:${port}`);
  console.log(`API requests are proxied to http://0.0.0.0:5000/api`);
  console.log(`Frontend requests are proxied to http://0.0.0.0:5173`);
});