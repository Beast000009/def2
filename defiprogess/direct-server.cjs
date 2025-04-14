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

// Contract addresses and ABIs
const CONTRACT_ADDRESSES = {
  TOKEN_SWAP: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
  SPOT_TRADING: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  ETH: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  USDT: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
  BTC: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  LINK: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e"
};

// Connect to local Ethereum node
const provider = new ethers.JsonRpcProvider('http://0.0.0.0:8545');

// ERC20 ABI (simplified for the mock tokens)
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// TokenSwap ABI
const TOKEN_SWAP_ABI = [
  "function addSupportedToken(address tokenAddress)",
  "function getSupportedTokens() view returns (address[])",
  "function getExchangeRate(address fromToken, address toToken) view returns (uint256)",
  "function setExchangeRate(address fromToken, address toToken, uint256 rate)",
  "function swapTokens(address fromToken, address toToken, uint256 amount) returns (uint256)"
];

// SpotTrading ABI
const SPOT_TRADING_ABI = [
  "function addSupportedToken(address tokenAddress)",
  "function getSupportedTokens() view returns (address[])",
  "function placeBuyOrder(address baseToken, address quoteToken, uint256 amount, uint256 price)",
  "function placeSellOrder(address baseToken, address quoteToken, uint256 amount, uint256 price)",
  "function getOrderBook(address baseToken, address quoteToken) view returns (uint256[], uint256[], bool[])",
  "function executeOrder(uint256 orderId)"
];

// Default tokens with icons
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

// Mock token prices
const mockTokenPrices = [
  { id: 1, tokenId: 1, price: 2856.25, change24h: 2.35, volume24h: 15765432.12 },
  { id: 2, tokenId: 2, price: 62453.78, change24h: 1.24, volume24h: 25432876.54 },
  { id: 3, tokenId: 3, price: 1.00, change24h: 0.01, volume24h: 87654123.45 },
  { id: 4, tokenId: 4, price: 17.82, change24h: -3.45, volume24h: 5432876.12 }
];

// API Endpoints
app.get('/api/tokens', (req, res) => {
  console.log('Fetching tokens');
  res.json(defaultTokens);
});

app.get('/api/prices', (req, res) => {
  console.log('Fetching prices');
  res.json(mockTokenPrices);
});

// Get a user's portfolio based on their wallet address
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

    // For each token, get the balance from the blockchain
    for (const token of defaultTokens) {
      try {
        // Create contract instance
        const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
        
        // Get user's balance
        const balance = await tokenContract.balanceOf(walletAddress);
        
        // Only add tokens with balance > 0
        if (balance > 0) {
          // Get token price from mock data
          const tokenPrice = mockTokenPrices.find(p => p.tokenId === token.id);
          const price = tokenPrice ? tokenPrice.price : 0;
          
          // Calculate token value in USD
          const decimals = token.decimals;
          const balanceFormatted = ethers.formatUnits(balance, decimals);
          const value = parseFloat(balanceFormatted) * price;
          
          // Add to total portfolio value
          portfolio.totalValue += value;
          
          // Add asset to portfolio
          portfolio.assets.push({
            token: token,
            balance: balanceFormatted,
            value: value,
            profit: value * (Math.random() * 0.1), // Mock profit data (random 0-10%)
            profitPercentage: Math.random() * 10 // Mock profit percentage (random 0-10%)
          });
        }
      } catch (error) {
        console.error(`Error fetching balance for ${token.symbol}:`, error);
      }
    }
    
    // Calculate overall profit/loss metrics (using mock data for demonstration)
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

// Get transaction history for a wallet address
app.get('/api/transactions/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  console.log(`Fetching transactions for ${walletAddress}`);
  
  // Mock transaction history data
  const mockTransactions = [
    {
      id: 1,
      type: 'SWAP',
      status: 'COMPLETED',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      fromToken: {
        id: 1,
        name: 'Ethereum',
        symbol: 'ETH',
        logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png"
      },
      toToken: {
        id: 3,
        name: 'Tether',
        symbol: 'USDT',
        logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.png"
      },
      fromAmount: '0.5',
      toAmount: '1425.35',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    },
    {
      id: 2,
      type: 'SPOT_BUY',
      status: 'COMPLETED',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      fromToken: {
        id: 3,
        name: 'Tether',
        symbol: 'USDT',
        logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.png"
      },
      toToken: {
        id: 2,
        name: 'Bitcoin',
        symbol: 'BTC',
        logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png"
      },
      fromAmount: '15000',
      toAmount: '0.24',
      price: '62500',
      txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    },
    {
      id: 3,
      type: 'SPOT_SELL',
      status: 'COMPLETED',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      fromToken: {
        id: 1,
        name: 'Ethereum',
        symbol: 'ETH',
        logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png"
      },
      toToken: {
        id: 3,
        name: 'Tether',
        symbol: 'USDT',
        logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.png"
      },
      fromAmount: '2',
      toAmount: '5700',
      price: '2850',
      txHash: '0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456'
    }
  ];
  
  res.json(mockTransactions);
});

// Get current gas price and gas limit estimates
app.get('/api/gas', (req, res) => {
  // Mock gas data
  res.json({
    gasPrice: '25', // in Gwei
    gasLimit: {
      swap: 150000,
      approve: 50000,
      spotTrade: 200000
    }
  });
});

// Get price chart data for a token over a specific period
app.get('/api/chart/:symbol/:days', (req, res) => {
  const { symbol, days } = req.params;
  console.log(`Fetching chart data for ${symbol} over ${days} days`);
  
  // Generate mock chart data points
  const daysCount = parseInt(days) || 7;
  const dataPoints = [];
  
  // Get the token's current price as a starting point
  const token = defaultTokens.find(t => t.symbol === symbol);
  const tokenId = token ? token.id : 1;
  const currentPrice = mockTokenPrices.find(p => p.tokenId === tokenId)?.price || 100;
  
  // Generate price points with some randomness
  let price = currentPrice;
  const now = Date.now();
  const interval = (daysCount * 24 * 60 * 60 * 1000) / 100; // 100 data points over the specified days
  
  // Generate price data
  for (let i = 100; i >= 0; i--) {
    // Add some randomness to the price
    const change = (Math.random() - 0.5) * 0.02; // -0.01 to +0.01
    price = price * (1 + change);
    
    // Add data point
    dataPoints.push({
      timestamp: new Date(now - (i * interval)).toISOString(),
      price: price.toFixed(2)
    });
  }
  
  res.json(dataPoints);
});

// Swap tokens API
app.post('/api/swap', async (req, res) => {
  try {
    const { fromTokenId, toTokenId, amount, walletAddress } = req.body;
    
    console.log(`Swapping ${amount} from token ${fromTokenId} to token ${toTokenId} for ${walletAddress}`);
    
    // Get token addresses
    const fromToken = defaultTokens.find(t => t.id === fromTokenId);
    const toToken = defaultTokens.find(t => t.id === toTokenId);
    
    if (!fromToken || !toToken) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }
    
    // For demonstration purposes, calculate a mock exchange rate
    const fromPrice = mockTokenPrices.find(p => p.tokenId === fromTokenId)?.price || 1;
    const toPrice = mockTokenPrices.find(p => p.tokenId === toTokenId)?.price || 1;
    const rate = fromPrice / toPrice;
    
    // Calculate the amount of tokens received
    const receivedAmount = parseFloat(amount) * rate;
    
    // Create a mock transaction for demonstration
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
    
    // Simulate transaction completion after a short delay
    setTimeout(() => {
      transaction.status = 'COMPLETED';
      console.log(`Swap completed: ${transaction.txHash}`);
    }, 2000);
    
    res.json({ 
      transaction,
      exchangeRate: rate 
    });
  } catch (error) {
    console.error('Swap error:', error);
    res.status(500).json({ error: 'Failed to execute swap' });
  }
});

// Place a spot trade order
app.post('/api/spot-trade', async (req, res) => {
  try {
    const { baseTokenId, quoteTokenId, side, amount, price, walletAddress } = req.body;
    
    console.log(`Placing ${side} order for ${amount} of token ${baseTokenId} at price ${price} (quote token ${quoteTokenId}) for ${walletAddress}`);
    
    // Get token information
    const baseToken = defaultTokens.find(t => t.id === baseTokenId);
    const quoteToken = defaultTokens.find(t => t.id === quoteTokenId);
    
    if (!baseToken || !quoteToken) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }
    
    // Total in quote token
    const total = parseFloat(amount) * parseFloat(price);
    
    // Create a mock transaction for demonstration
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
    
    // Simulate transaction completion after a short delay
    setTimeout(() => {
      transaction.status = 'COMPLETED';
      console.log(`Spot trade completed: ${transaction.txHash}`);
    }, 2000);
    
    res.json({ transaction });
  } catch (error) {
    console.error('Spot trade error:', error);
    res.status(500).json({ error: 'Failed to execute spot trade' });
  }
});

// Serve static files from the client directory
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

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at http://0.0.0.0:${port}/api`);
  console.log(`UI available at http://0.0.0.0:${port}`);
});