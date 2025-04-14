const express = require('express');
const path = require('path');
const cors = require('cors');
const { ethers } = require('ethers');

const app = express();
const port = 5000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, 'client')));

// Connect to Hardhat node
const provider = new ethers.JsonRpcProvider('http://0.0.0.0:8545/');

// Contract addresses
const CONTRACT_ADDRESSES = {
  TOKEN_SWAP: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  SPOT_TRADING: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  ETH: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  USDT: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  BTC: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  LINK: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
};

// Mock token data that matches our contract deployment
const mockTokensList = [
  {
    id: 1,
    symbol: "ETH",
    name: "Wrapped Ether",
    logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
    decimals: 18,
    contractAddress: CONTRACT_ADDRESSES.ETH,
    network: "Ethereum",
  },
  {
    id: 2,
    symbol: "BTC",
    name: "Wrapped Bitcoin",
    logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
    decimals: 8,
    contractAddress: CONTRACT_ADDRESSES.BTC,
    network: "Ethereum",
  },
  {
    id: 3,
    symbol: "USDT",
    name: "Tether USD",
    logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.png",
    decimals: 6,
    contractAddress: CONTRACT_ADDRESSES.USDT,
    network: "Ethereum",
  },
  {
    id: 4,
    symbol: "LINK",
    name: "Chainlink Token",
    logoUrl: "https://cryptologos.cc/logos/chainlink-link-logo.png",
    decimals: 18,
    contractAddress: CONTRACT_ADDRESSES.LINK,
    network: "Ethereum",
  },
];

// Basic API endpoints
app.get('/api/tokens', (req, res) => {
  res.json(mockTokensList);
});

// Get token prices
app.get('/api/prices', (req, res) => {
  try {
    // Simulate token prices from the blockchain
    const prices = mockTokensList.map(token => {
      let price = "0";
      let priceChange24h = (Math.random() * 10 - 5).toFixed(2);
      
      // Set baseline prices
      if (token.symbol === "ETH") price = "3000";
      else if (token.symbol === "BTC") price = "60000";
      else if (token.symbol === "USDT") price = "1";
      else if (token.symbol === "LINK") price = "15";
      
      return {
        id: token.id,
        symbol: token.symbol,
        name: token.name,
        logoUrl: token.logoUrl,
        price,
        priceChange24h,
        volume24h: (parseFloat(price) * 1000000).toString(),
        marketCap: (parseFloat(price) * 10000000).toString(),
      };
    });
    
    res.json(prices);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Catch-all route for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`Connected to Ethereum node at http://0.0.0.0:8545`);
  console.log(`Contract Addresses:`, CONTRACT_ADDRESSES);
});