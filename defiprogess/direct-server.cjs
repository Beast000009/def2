const express = require('express');
const path = require('path');
const cors = require('cors');
const { ethers } = require('ethers');
const fs = require('fs');

const app = express();
const port = 5000;

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Serve static files from the client directory with proper MIME types
app.use(express.static(path.join(__dirname, 'client'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

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

// Load smart contract ABIs
const TOKEN_SWAP_ABI = [
  "function swap(address fromToken, address toToken, uint256 amount) external returns (uint256)",
  "function getSwapRate(address fromToken, address toToken, uint256 amount) external view returns (uint256)",
  "function isSupportedToken(address token) external view returns (bool)",
  "function addSupportedToken(address token) external",
  "function setExchangeRate(address fromToken, address toToken, uint256 rate) external"
];

const SPOT_TRADING_ABI = [
  "function executeTrade(address token, address baseToken, uint256 amount, uint256 price, bool isBuy) external returns (uint256)",
  "function isSupportedToken(address token) external view returns (bool)",
  "function addSupportedToken(address token) external"
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)",
  "function mint(address to, uint256 amount) external"
];

// Create contract instances
let tokenSwapContract;
let spotTradingContract;
let tokenContracts = {};

async function initializeContracts() {
  try {
    // Get a signer
    const signer = await provider.getSigner();
    
    // Initialize contracts
    tokenSwapContract = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_SWAP, TOKEN_SWAP_ABI, signer);
    spotTradingContract = new ethers.Contract(CONTRACT_ADDRESSES.SPOT_TRADING, SPOT_TRADING_ABI, signer);
    
    // Initialize token contracts
    tokenContracts.ETH = new ethers.Contract(CONTRACT_ADDRESSES.ETH, ERC20_ABI, signer);
    tokenContracts.BTC = new ethers.Contract(CONTRACT_ADDRESSES.BTC, ERC20_ABI, signer);
    tokenContracts.USDT = new ethers.Contract(CONTRACT_ADDRESSES.USDT, ERC20_ABI, signer);
    tokenContracts.LINK = new ethers.Contract(CONTRACT_ADDRESSES.LINK, ERC20_ABI, signer);
    
    console.log("Contracts initialized successfully");
  } catch (error) {
    console.error("Error initializing contracts:", error);
  }
}

// Initialize the contracts
initializeContracts();

// API routes
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

// Get portfolio data
app.get('/api/portfolio/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    // Create a mock portfolio with data from our contracts
    const assets = [];
    let totalValue = 0;
    
    for (const token of mockTokensList) {
      try {
        const tokenContract = tokenContracts[token.symbol];
        if (!tokenContract) continue;
        
        // Get balance from contract
        const balance = await tokenContract.balanceOf(walletAddress);
        
        // Convert to user-friendly format based on decimals
        const decimals = token.decimals || 18;
        const formattedBalance = ethers.formatUnits(balance, decimals);
        
        // Use the price from our mock data
        let price = "0";
        if (token.symbol === "ETH") price = "3000";
        else if (token.symbol === "BTC") price = "60000";
        else if (token.symbol === "USDT") price = "1";
        else if (token.symbol === "LINK") price = "15";
        
        // Calculate value
        const value = parseFloat(formattedBalance) * parseFloat(price);
        totalValue += value;
        
        if (parseFloat(formattedBalance) > 0) {
          assets.push({
            id: assets.length + 1,
            token: {
              id: token.id,
              symbol: token.symbol,
              name: token.name,
              logoUrl: token.logoUrl
            },
            balance: formattedBalance,
            value: value.toString(),
            price
          });
        }
      } catch (error) {
        console.error(`Error getting balance for ${token.symbol}:`, error);
      }
    }
    
    // If we couldn't get real balances, add some mock data
    if (assets.length === 0) {
      assets.push({
        id: 1,
        token: {
          id: 1,
          symbol: "ETH",
          name: "Wrapped Ether",
          logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png"
        },
        balance: "5.5",
        value: "16500",
        price: "3000"
      });
      totalValue = 16500;
    }
    
    const portfolio = {
      walletAddress,
      totalValue: totalValue.toString(),
      todayChange: (Math.random() * 10 - 5).toFixed(2),
      assets
    };
    
    res.json(portfolio);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get transaction history
app.get('/api/transactions/:walletAddress', (req, res) => {
  try {
    // Mock transaction history
    const transactions = [
      {
        id: 1,
        type: "swap",
        status: "completed",
        fromToken: {
          id: 1,
          symbol: "ETH",
          name: "Wrapped Ether",
          logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png"
        },
        toToken: {
          id: 3,
          symbol: "USDT",
          name: "Tether USD",
          logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.png"
        },
        fromAmount: "1.5",
        toAmount: "4500",
        price: "3000",
        txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        networkFee: "0.001",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        timestamp: Date.now() - 86400000
      },
      {
        id: 2,
        type: "buy",
        status: "completed",
        fromToken: null,
        toToken: {
          id: 2,
          symbol: "BTC",
          name: "Wrapped Bitcoin",
          logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png"
        },
        fromAmount: "10000",
        toAmount: "0.16667",
        price: "60000",
        txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        networkFee: "0.001",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        timestamp: Date.now() - 172800000
      }
    ];
    
    res.json(transactions);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get gas price
app.get('/api/gas', (req, res) => {
  try {
    const gasPrice = {
      gasPrice: "20",
      unit: "gwei",
      timestamp: new Date().toISOString()
    };
    
    res.json(gasPrice);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Swap tokens
app.post('/api/swap', async (req, res) => {
  try {
    const { fromTokenId, toTokenId, fromAmount, walletAddress } = req.body;
    
    // Get the token objects
    const fromToken = mockTokensList.find(t => t.id === fromTokenId);
    const toToken = mockTokensList.find(t => t.id === toTokenId);
    
    if (!fromToken || !toToken) {
      return res.status(400).json({ error: 'Invalid token IDs' });
    }
    
    // Call blockchain swap function
    try {
      // Convert amount to blockchain format (considering decimals)
      const amountInWei = ethers.parseUnits(fromAmount, fromToken.decimals);
      
      // Check and approve token if needed
      const fromTokenContract = tokenContracts[fromToken.symbol];
      const allowance = await fromTokenContract.allowance(walletAddress, CONTRACT_ADDRESSES.TOKEN_SWAP);
      
      if (allowance < amountInWei) {
        console.log(`Approving token ${fromToken.symbol} for swap...`);
        const approveTx = await fromTokenContract.approve(CONTRACT_ADDRESSES.TOKEN_SWAP, amountInWei);
        // await approveTx.wait();
      }
      
      // Execute swap on blockchain
      // const swapTx = await tokenSwapContract.swap(
      //   fromToken.contractAddress,
      //   toToken.contractAddress,
      //   amountInWei
      // );
      
      // Simulate the result instead of waiting for transaction confirmation
      let rate = 1;
      if (fromToken.symbol === "ETH" && toToken.symbol === "USDT") rate = 3000;
      else if (fromToken.symbol === "USDT" && toToken.symbol === "ETH") rate = 1/3000;
      else if (fromToken.symbol === "BTC" && toToken.symbol === "USDT") rate = 60000;
      else if (fromToken.symbol === "USDT" && toToken.symbol === "BTC") rate = 1/60000;
      else if (fromToken.symbol === "LINK" && toToken.symbol === "USDT") rate = 15;
      else if (fromToken.symbol === "USDT" && toToken.symbol === "LINK") rate = 1/15;
      
      const toAmount = (parseFloat(fromAmount) * rate).toString();
      
      const swapResponse = {
        transactionId: Date.now(),
        status: "completed",
        fromToken: {
          id: fromToken.id,
          symbol: fromToken.symbol,
          name: fromToken.name
        },
        toToken: {
          id: toToken.id,
          symbol: toToken.symbol,
          name: toToken.name
        },
        fromAmount,
        toAmount,
        rate: rate.toString(),
        networkFee: "0.001"
      };
      
      res.json(swapResponse);
    } catch (error) {
      console.error('Blockchain error:', error);
      return res.status(500).json({ error: 'Blockchain error', message: error.message });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Execute trade
app.post('/api/trade', async (req, res) => {
  try {
    const { tokenId, baseTokenId, amount, price, type, walletAddress } = req.body;
    
    // Get the token objects
    const token = mockTokensList.find(t => t.id === tokenId);
    const baseToken = mockTokensList.find(t => t.id === baseTokenId);
    
    if (!token || !baseToken) {
      return res.status(400).json({ error: 'Invalid token IDs' });
    }
    
    // Calculate total
    const total = (parseFloat(amount) * parseFloat(price)).toString();
    
    // Blockchain integration (commented out for now)
    /* 
    try {
      // Convert amounts to blockchain format
      const amountInWei = ethers.parseUnits(amount, token.decimals);
      const priceInWei = ethers.parseUnits(price, baseToken.decimals);
      
      // Check and approve token if needed
      if (type === "sell") {
        const tokenContract = tokenContracts[token.symbol];
        const allowance = await tokenContract.allowance(walletAddress, CONTRACT_ADDRESSES.SPOT_TRADING);
        
        if (allowance < amountInWei) {
          console.log(`Approving token ${token.symbol} for trade...`);
          const approveTx = await tokenContract.approve(CONTRACT_ADDRESSES.SPOT_TRADING, amountInWei);
          await approveTx.wait();
        }
      } else { // buy
        const baseTokenContract = tokenContracts[baseToken.symbol];
        const totalInWei = ethers.parseUnits(total, baseToken.decimals);
        const allowance = await baseTokenContract.allowance(walletAddress, CONTRACT_ADDRESSES.SPOT_TRADING);
        
        if (allowance < totalInWei) {
          console.log(`Approving token ${baseToken.symbol} for trade...`);
          const approveTx = await baseTokenContract.approve(CONTRACT_ADDRESSES.SPOT_TRADING, totalInWei);
          await approveTx.wait();
        }
      }
      
      // Execute trade on blockchain
      const tradeTx = await spotTradingContract.executeTrade(
        token.contractAddress,
        baseToken.contractAddress,
        amountInWei,
        priceInWei,
        type === "buy"
      );
      
      // await tradeTx.wait();
    } catch (error) {
      console.error('Blockchain error:', error);
      return res.status(500).json({ error: 'Blockchain error', message: error.message });
    }
    */
    
    const tradeResponse = {
      transactionId: Date.now(),
      status: "completed",
      type,
      token: {
        id: token.id,
        symbol: token.symbol,
        name: token.name
      },
      baseToken: {
        id: baseToken.id,
        symbol: baseToken.symbol,
        name: baseToken.name
      },
      amount,
      price,
      total,
      networkFee: "0.001"
    };
    
    res.json(tradeResponse);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get chart data
app.get('/api/chart/:symbol/:days', (req, res) => {
  try {
    const { symbol, days } = req.params;
    const daysNum = parseInt(days) || 1;
    
    // Generate mock data for the chart
    const currentTime = Date.now();
    const interval = (daysNum * 24 * 60 * 60 * 1000) / 100; // 100 data points
    
    // Set base price based on token
    let basePrice = 3000; // Default for ETH
    if (symbol.toUpperCase() === 'BTC') basePrice = 60000;
    else if (symbol.toUpperCase() === 'USDT') basePrice = 1;
    else if (symbol.toUpperCase() === 'LINK') basePrice = 15;
    
    const prices = [];
    const marketCaps = [];
    const volumes = [];
    
    // Generate price data with some random fluctuation
    for (let i = 0; i < 100; i++) {
      const timestamp = currentTime - (99 - i) * interval;
      const randomFactor = 0.98 + (Math.random() * 0.04); // +/- 2%
      const price = basePrice * randomFactor;
      
      prices.push([timestamp, price]);
      marketCaps.push([timestamp, price * 1000000000]);
      volumes.push([timestamp, price * 10000000 * Math.random()]);
    }
    
    const chartData = {
      prices,
      marketCaps,
      totalVolumes: volumes
    };
    
    res.json(chartData);
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