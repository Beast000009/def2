const express = require('express');
const cors = require('cors');
const path = require('path');
const { ethers } = require('ethers');

// Initialize Express app
const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Contract addresses and ABIs
const CONTRACT_ADDRESSES = {
  TOKEN_SWAP: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
  SPOT_TRADING: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
  ETH: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
  USDT: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
  BTC: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
  LINK: "0x59b670e9fA9D0A427751Af201D676719a970857b"
};

// Connect to local Ethereum node
const provider = new ethers.JsonRpcProvider('http://0.0.0.0:8545');

// ERC20 minimal ABI
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)"
];

// TokenSwap minimal ABI
const TOKEN_SWAP_ABI = [
  "function addSupportedToken(address tokenAddress)",
  "function getSupportedTokens() view returns (address[])",
  "function getExchangeRate(address fromToken, address toToken) view returns (uint256)",
  "function setExchangeRate(address fromToken, address toToken, uint256 rate)",
  "function swapTokens(address fromToken, address toToken, uint256 amount) returns (uint256)"
];

// SpotTrading minimal ABI
const SPOT_TRADING_ABI = [
  "function addSupportedToken(address tokenAddress)",
  "function getSupportedTokens() view returns (address[])",
  "function placeBuyOrder(address baseToken, address quoteToken, uint256 amount, uint256 price)",
  "function placeSellOrder(address baseToken, address quoteToken, uint256 amount, uint256 price)",
  "function getOrderBook(address baseToken, address quoteToken) view returns (uint256[], uint256[], bool[])",
  "function executeOrder(uint256 orderId)"
];

// Default tokens
const defaultTokens = [
  {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
    address: CONTRACT_ADDRESSES.ETH,
    logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  },
  {
    id: 2,
    name: "Bitcoin",
    symbol: "BTC",
    decimals: 8,
    address: CONTRACT_ADDRESSES.BTC,
    logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png",
  },
  {
    id: 3,
    name: "Tether",
    symbol: "USDT",
    decimals: 6,
    address: CONTRACT_ADDRESSES.USDT,
    logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  },
  {
    id: 4,
    name: "Chainlink",
    symbol: "LINK",
    decimals: 18,
    address: CONTRACT_ADDRESSES.LINK,
    logoUrl: "https://cryptologos.cc/logos/chainlink-link-logo.png",
  }
];

// Mock token prices (will be replaced with real data later)
const mockTokenPrices = [
  { id: 1, tokenId: 1, price: 2856.25, change24h: 2.35, volume24h: 15765432.12 },
  { id: 2, tokenId: 2, price: 62453.78, change24h: 1.24, volume24h: 25432876.54 },
  { id: 3, tokenId: 3, price: 1.00, change24h: 0.01, volume24h: 87654123.45 },
  { id: 4, tokenId: 4, price: 17.82, change24h: -3.45, volume24h: 5432876.12 }
];

// API endpoint for system status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'running',
    provider: provider ? 'connected' : 'disconnected',
    contracts: CONTRACT_ADDRESSES
  });
});

// API endpoint for tokens list
app.get('/api/tokens', (req, res) => {
  console.log('Fetching tokens list');
  res.json(defaultTokens);
});

// API endpoint for token prices
app.get('/api/prices', (req, res) => {
  console.log('Fetching token prices');
  res.json(mockTokenPrices);
});

// API endpoint for portfolio by wallet address
app.get('/api/portfolio/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    console.log(`Fetching portfolio for ${walletAddress}`);
    
    // Initialize portfolio with default values
    let portfolio = {
      totalValue: 0,
      totalProfitLoss: 0,
      profitLossPercentage: 0,
      assets: []
    };

    // Fetch balances for each token from the blockchain
    for (const token of defaultTokens) {
      try {
        const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
        const balance = await tokenContract.balanceOf(walletAddress);
        
        if (balance > 0) {
          const tokenPrice = mockTokenPrices.find(p => p.tokenId === token.id);
          const price = tokenPrice ? tokenPrice.price : 0;
          
          const balanceFormatted = ethers.formatUnits(balance, token.decimals);
          const value = parseFloat(balanceFormatted) * price;
          
          portfolio.totalValue += value;
          
          portfolio.assets.push({
            token: token,
            balance: balanceFormatted,
            value: value,
            profit: value * 0.05,  // Mock 5% profit
            profitPercentage: 5    // Mock 5% profit percentage
          });
        }
      } catch (error) {
        console.error(`Error fetching balance for ${token.symbol}:`, error);
      }
    }
    
    // Calculate overall profit/loss metrics
    if (portfolio.assets.length > 0) {
      portfolio.totalProfitLoss = portfolio.assets.reduce((sum, asset) => sum + asset.profit, 0);
      portfolio.profitLossPercentage = (portfolio.totalProfitLoss / portfolio.totalValue) * 100;
    }
    
    res.json(portfolio);
  } catch (error) {
    console.error('Error getting portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio data' });
  }
});

// API endpoint for transaction history
app.get('/api/transactions/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  console.log(`Fetching transactions for ${walletAddress}`);
  
  // Hard-coded transaction history for demonstration
  const transactions = [
    {
      id: 1,
      type: 'SWAP',
      status: 'COMPLETED',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      fromToken: defaultTokens[0],  // ETH
      toToken: defaultTokens[2],    // USDT
      fromAmount: '0.5',
      toAmount: '1425.35',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    },
    {
      id: 2,
      type: 'SPOT_BUY',
      status: 'COMPLETED',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      fromToken: defaultTokens[2],  // USDT
      toToken: defaultTokens[1],    // BTC
      fromAmount: '15000',
      toAmount: '0.24',
      price: '62500',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    }
  ];
  
  res.json(transactions);
});

// API endpoint for gas estimations
app.get('/api/gas', (req, res) => {
  // Mock gas data
  res.json({
    gasPrice: '25', 
    gasLimit: {
      swap: 150000,
      approve: 50000,
      spotTrade: 200000
    }
  });
});

// API endpoint for price charts
app.get('/api/chart/:symbol/:days', (req, res) => {
  const { symbol, days } = req.params;
  console.log(`Fetching chart data for ${symbol} over ${days} days`);
  
  const daysCount = parseInt(days) || 7;
  const dataPoints = [];
  
  const token = defaultTokens.find(t => t.symbol === symbol);
  const tokenId = token ? token.id : 1;
  const currentPrice = mockTokenPrices.find(p => p.tokenId === tokenId)?.price || 100;
  
  let price = currentPrice;
  const now = Date.now();
  const interval = (daysCount * 24 * 60 * 60 * 1000) / 100;
  
  for (let i = 100; i >= 0; i--) {
    const change = (Math.random() - 0.5) * 0.02;
    price = price * (1 + change);
    
    dataPoints.push({
      timestamp: new Date(now - (i * interval)).toISOString(),
      price: price.toFixed(2)
    });
  }
  
  res.json(dataPoints);
});

// API endpoint for token swaps
app.post('/api/swap', async (req, res) => {
  try {
    const { fromTokenId, toTokenId, amount, walletAddress } = req.body;
    
    console.log(`Swapping ${amount} from token ${fromTokenId} to token ${toTokenId} for ${walletAddress}`);
    
    const fromToken = defaultTokens.find(t => t.id === fromTokenId);
    const toToken = defaultTokens.find(t => t.id === toTokenId);
    
    if (!fromToken || !toToken) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }
    
    // Mock exchange rate based on token prices
    const fromPrice = mockTokenPrices.find(p => p.tokenId === fromTokenId)?.price || 1;
    const toPrice = mockTokenPrices.find(p => p.tokenId === toTokenId)?.price || 1;
    const rate = fromPrice / toPrice;
    
    const receivedAmount = parseFloat(amount) * rate;
    
    // Create transaction record
    const transaction = {
      id: Date.now(),
      type: 'SWAP',
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: receivedAmount.toFixed(8),
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`
    };
    
    res.json({ 
      transaction,
      exchangeRate: rate 
    });
  } catch (error) {
    console.error('Swap error:', error);
    res.status(500).json({ error: 'Failed to execute swap' });
  }
});

// API endpoint for spot trading
app.post('/api/spot-trade', async (req, res) => {
  try {
    const { baseTokenId, quoteTokenId, side, amount, price, walletAddress } = req.body;
    
    console.log(`Placing ${side} order for ${amount} of token ${baseTokenId} at price ${price} (quote token ${quoteTokenId}) for ${walletAddress}`);
    
    const baseToken = defaultTokens.find(t => t.id === baseTokenId);
    const quoteToken = defaultTokens.find(t => t.id === quoteTokenId);
    
    if (!baseToken || !quoteToken) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }
    
    const total = parseFloat(amount) * parseFloat(price);
    
    // Create transaction record
    const transaction = {
      id: Date.now(),
      type: side === 'BUY' ? 'SPOT_BUY' : 'SPOT_SELL',
      status: 'PENDING',
      timestamp: new Date().toISOString(),
      fromToken: side === 'BUY' ? quoteToken : baseToken,
      toToken: side === 'BUY' ? baseToken : quoteToken,
      fromAmount: side === 'BUY' ? total.toFixed(quoteToken.decimals) : amount,
      toAmount: side === 'BUY' ? amount : total.toFixed(quoteToken.decimals),
      price: price,
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`
    };
    
    res.json({ transaction });
  } catch (error) {
    console.error('Spot trade error:', error);
    res.status(500).json({ error: 'Failed to execute spot trade' });
  }
});

// We're not serving static files here anymore
// Frontend is served by the npm run dev command (vite dev server)
// This server only provides API endpoints

// Setup CORS to allow the frontend to communicate with this API server
app.use(cors({
  origin: ['http://localhost:5173', 'http://0.0.0.0:5173'],
  credentials: true
}));

// Provide instructions for the fallback route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>DeFi Progress API Server</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
          h1 { color: #333; }
          pre { background: #f4f4f4; padding: 10px; border-radius: 5px; }
          .note { background: #fff8dc; padding: 10px; border-left: 4px solid #e8c000; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>DeFi Progress API Server</h1>
        <p>This server is running the blockchain API endpoints.</p>
        <p>Available API endpoints:</p>
        <ul>
          <li><a href="/api/status">/api/status</a> - Check server status</li>
          <li><a href="/api/tokens">/api/tokens</a> - Get available tokens</li>
          <li><a href="/api/prices">/api/prices</a> - Get token prices</li>
          <li>/api/portfolio/:walletAddress - Get user portfolio</li>
          <li>/api/transactions/:walletAddress - Get user transactions</li>
          <li>/api/gas - Get gas estimates</li>
          <li>/api/chart/:symbol/:days - Get price chart data</li>
          <li>POST /api/swap - Execute a token swap</li>
          <li>POST /api/spot-trade - Execute a spot trade</li>
        </ul>
        <div class="note">
          <p><strong>Note:</strong> The frontend application should be started separately using:</p>
          <pre>cd defiprogess && npm run dev</pre>
          <p>This will start the Vite dev server and serve the frontend application.</p>
        </div>
      </body>
    </html>
  `);
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at http://0.0.0.0:${port}/api`);
  console.log(`UI available at http://0.0.0.0:${port}`);
});