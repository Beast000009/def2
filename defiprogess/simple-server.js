import express from 'express';
import cors from 'cors';
import path from 'path';
import { ethers } from 'ethers';
import { fileURLToPath } from 'url';

// Get current file directory with ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Contract addresses from the latest deployment
const CONTRACT_ADDRESSES = {
  TOKEN_SWAP: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
  SPOT_TRADING: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  ETH: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  USDT: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
  BTC: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  LINK: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e"
};

// Basic API endpoints
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'running',
    blockchain: 'connected',
    contracts: CONTRACT_ADDRESSES
  });
});

// Serve static files from the client directory with proper MIME types
app.use(express.static(path.join(__dirname, 'client'), {
  setHeaders: (res, filePath) => {
    // Set correct MIME types for JavaScript files
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    // Set correct MIME types for CSS files
    else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    // Set correct MIME types for JSON files
    else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// Simple catch-all route for client-side routing
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Simple server running on port ${port}`);
  console.log(`API available at http://0.0.0.0:${port}/api`);
  console.log(`UI available at http://0.0.0.0:${port}`);
});