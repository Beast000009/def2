import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import { ethers } from 'ethers';
import cors from 'cors';
import path from 'path';
import { log, setupVite, serveStatic } from './vite';
import { registerRoutes } from './routes';

// Setup Express app
const app: Application = express();
app.use(express.json());
app.use(cors());

// Create HTTP server
const server: Server = createServer(app);

// Connect to local Ethereum blockchain (Hardhat)
const provider = new ethers.JsonRpcProvider('http://0.0.0.0:8545/');

// Sample contract ABIs and addresses
const CONTRACT_ADDRESSES = {
  TOKEN_SWAP: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  SPOT_TRADING: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  ETH: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", 
  USDT: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  BTC: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  LINK: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
};

// Global API error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong'
  });
});

// Initialize the server
async function initServer() {
  // Dev environment
  if (process.env.NODE_ENV !== 'production') {
    // Setup Vite dev middleware
    await setupVite(app, server);
  } else {
    // Production - serve static files
    serveStatic(app);
  }

  // Register API routes
  await registerRoutes(app);

  // Error handler for routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Start server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    log(`Connected to local Ethereum node at http://0.0.0.0:8545`);
    log(`Contract Addresses: ${JSON.stringify(CONTRACT_ADDRESSES, null, 2)}`);
  });
}

// Start the server
initServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Export for testing
export { app, server };