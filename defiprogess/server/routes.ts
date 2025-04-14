import { Express, Request, Response, Router } from 'express';
import { Server } from 'http';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { swapTokensSchema, spotTradeSchema } from '../shared/schema';

// Connect to local Hardhat node
const provider = new ethers.JsonRpcProvider('http://0.0.0.0:8545/');

// Use first account as admin
const ADMIN_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

// Contract ABIs
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function mint(address to, uint256 amount)",
];

const TOKEN_SWAP_ABI = [
  // View Functions
  "function getSwapAmount(address fromToken, address toToken, uint256 fromAmount) view returns (uint256)",
  "function supportedTokens(address token) view returns (bool)",
  "function exchangeRates(address fromToken, address toToken) view returns (uint256)",
  "function feePercentage() view returns (uint256)",
  
  // State Changing Functions
  "function swap(address fromToken, address toToken, uint256 fromAmount, uint256 minToAmount, uint256 deadline) returns (uint256)",
  
  // Events
  "event SwapExecuted(address indexed user, address indexed fromToken, address indexed toToken, uint256 fromAmount, uint256 toAmount, uint256 timestamp)",
];

const SPOT_TRADING_ABI = [
  // View Functions
  "function getOrder(uint256 orderId) view returns (tuple(uint256 id, address trader, address tokenAddress, address baseTokenAddress, uint256 amount, uint256 price, uint256 filled, uint256 timestamp, bool isBuyOrder, bool isActive))",
  "function getActiveBuyOrders(address tokenAddress) view returns (uint256[])",
  "function getActiveSellOrders(address tokenAddress) view returns (uint256[])",
  "function get24HourVolume(address tokenAddress, address baseTokenAddress) view returns (uint256)",
  
  // State Changing Functions
  "function createBuyOrder(address tokenAddress, address baseTokenAddress, uint256 amount, uint256 price) returns (uint256)",
  "function createSellOrder(address tokenAddress, address baseTokenAddress, uint256 amount, uint256 price) returns (uint256)",
  "function cancelOrder(uint256 orderId)",
];

// Contract addresses
const CONTRACT_ADDRESSES = {
  TOKEN_SWAP: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  SPOT_TRADING: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  ETH: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", 
  USDT: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  BTC: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  LINK: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
};

// Token ID to address mapping
const TOKEN_ID_TO_ADDRESS = {
  1: CONTRACT_ADDRESSES.ETH,
  2: CONTRACT_ADDRESSES.BTC,
  3: CONTRACT_ADDRESSES.USDT,
  4: CONTRACT_ADDRESSES.LINK,
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

// Error handler helper
const handleApiError = (res: Response, error: unknown) => {
  console.error('API Error:', error);
  
  if (error instanceof Error) {
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
  
  return res.status(500).json({
    error: 'Unknown error',
    message: 'An unknown error occurred'
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all tokens
  app.get('/api/tokens', (req, res) => {
    res.json(mockTokensList);
  });

  // Get token prices
  app.get('/api/prices', async (req, res) => {
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
      handleApiError(res, error);
    }
  });

  // Get chart data
  app.get('/api/chart/:symbol/:days', (req, res) => {
    try {
      const { symbol, days } = req.params;
      
      // Generate data points for the chart
      const numDataPoints = parseInt(days) * 24; // hourly data
      const chartData = {
        prices: [],
        marketCaps: [],
        totalVolumes: [],
      };
      
      // Find base price for the token
      let basePrice = 100;
      const token = mockTokensList.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
      
      if (symbol.toUpperCase() === 'ETH') {
        basePrice = 3000;
      } else if (symbol.toUpperCase() === 'BTC') {
        basePrice = 60000;
      } else if (symbol.toUpperCase() === 'USDT') {
        basePrice = 1;
      } else if (symbol.toUpperCase() === 'LINK') {
        basePrice = 15;
      }
      
      const volatility = 0.05; // 5% volatility
      let currentPrice = basePrice;
      const now = Date.now();
      const millisecondsPerDataPoint = (parseInt(days) * 24 * 60 * 60 * 1000) / numDataPoints;
      
      for (let i = 0; i < numDataPoints; i++) {
        // Random price movement
        const priceChange = currentPrice * (Math.random() * volatility * 2 - volatility);
        currentPrice += priceChange;
        currentPrice = Math.max(currentPrice, basePrice * 0.7); // Prevent price from going too low
        
        const timestamp = now - ((numDataPoints - i) * millisecondsPerDataPoint);
        
        // Add price data point
        chartData.prices.push([timestamp, currentPrice]);
        
        // Add market cap
        const marketCap = currentPrice * 1000000; // Assume 1M circulating supply
        chartData.marketCaps.push([timestamp, marketCap]);
        
        // Add volume
        const volume = Math.abs(priceChange) * currentPrice * 10000;
        chartData.totalVolumes.push([timestamp, volume]);
      }
      
      res.json(chartData);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Swap tokens
  app.post('/api/swap', async (req, res) => {
    try {
      const { fromTokenId, toTokenId, fromAmount, walletAddress } = swapTokensSchema.parse(req.body);
      
      // Get token addresses
      const fromTokenAddress = TOKEN_ID_TO_ADDRESS[fromTokenId];
      const toTokenAddress = TOKEN_ID_TO_ADDRESS[toTokenId];
      
      if (!fromTokenAddress || !toTokenAddress) {
        return res.status(400).json({ error: 'Invalid token IDs' });
      }
      
      // Get token objects
      const fromToken = mockTokensList.find(t => t.id === fromTokenId);
      const toToken = mockTokensList.find(t => t.id === toTokenId);
      
      // Simulate blockchain interaction for swap
      // In production, this would interact with the actual contracts
      
      // Simulate exchange rates
      const exchangeRates = {
        "ETH_USDT": "3000",
        "USDT_ETH": "0.000333",
        "BTC_USDT": "60000",
        "USDT_BTC": "0.0000166",
        "LINK_USDT": "15",
        "USDT_LINK": "0.0666",
        "ETH_BTC": "0.05",  // 1 ETH = 0.05 BTC
        "BTC_ETH": "20",    // 1 BTC = 20 ETH
        "ETH_LINK": "200",  // 1 ETH = 200 LINK
        "LINK_ETH": "0.005", // 1 LINK = 0.005 ETH
        "BTC_LINK": "4000", // 1 BTC = 4000 LINK
        "LINK_BTC": "0.00025" // 1 LINK = 0.00025 BTC
      };
      
      // Get exchange rate key
      const rateKey = `${fromToken.symbol}_${toToken.symbol}`;
      let rate = exchangeRates[rateKey] || "1";
      
      // Calculate output amount
      const outputAmount = (parseFloat(fromAmount) * parseFloat(rate)).toString();
      
      // Create response object
      const response = {
        transactionId: Date.now(), // Unique ID for the transaction
        status: "completed",
        fromToken: {
          id: fromToken.id,
          symbol: fromToken.symbol,
          name: fromToken.name,
        },
        toToken: {
          id: toToken.id,
          symbol: toToken.symbol,
          name: toToken.name,
        },
        fromAmount,
        toAmount: outputAmount,
        rate,
        networkFee: "0.001", // Mock network fee
      };
      
      res.json(response);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Execute trade (spot trading)
  app.post('/api/trade', async (req, res) => {
    try {
      const { tokenId, baseTokenId, amount, price, type, walletAddress } = spotTradeSchema.parse(req.body);
      
      // Get token objects
      const token = mockTokensList.find(t => t.id === tokenId);
      const baseToken = mockTokensList.find(t => t.id === baseTokenId);
      
      if (!token || !baseToken) {
        return res.status(400).json({ error: 'Invalid token IDs' });
      }
      
      // Calculate total cost in base token
      const totalCost = (parseFloat(amount) * parseFloat(price)).toString();
      
      // Create response object
      const response = {
        transactionId: Date.now(), // Unique ID for the transaction
        status: "completed",
        type,
        token: {
          id: token.id,
          symbol: token.symbol,
          name: token.name,
        },
        baseToken: {
          id: baseToken.id,
          symbol: baseToken.symbol,
          name: baseToken.name,
        },
        amount,
        price,
        total: totalCost,
        networkFee: "0.001", // Mock network fee
      };
      
      res.json(response);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Get portfolio
  app.get('/api/portfolio/:walletAddress', async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      // Simulate portfolio data
      // In production, this would get real balances from the blockchain
      const assets = mockTokensList.map(token => {
        const balance = (Math.random() * 10).toFixed(4);
        let price = "0";
        
        if (token.symbol === "ETH") price = "3000";
        else if (token.symbol === "BTC") price = "60000";
        else if (token.symbol === "USDT") price = "1";
        else if (token.symbol === "LINK") price = "15";
        
        const value = (parseFloat(balance) * parseFloat(price)).toString();
        
        return {
          id: token.id,
          token: {
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            logoUrl: token.logoUrl,
          },
          balance,
          value,
          price,
        };
      });
      
      // Calculate total value
      const totalValue = assets.reduce((sum, asset) => sum + parseFloat(asset.value), 0).toString();
      
      // Create portfolio object
      const portfolio = {
        walletAddress: walletAddress || adminWallet.address,
        totalValue,
        todayChange: (Math.random() * 10 - 5).toFixed(2), // Random change
        assets,
      };
      
      res.json(portfolio);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Get transaction history
  app.get('/api/transactions/:walletAddress', (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      // Simulate transaction history
      // In production, this would get real transaction data from the blockchain
      const transactions = [];
      
      // Add swap transactions
      for (let i = 0; i < 5; i++) {
        const fromToken = mockTokensList[Math.floor(Math.random() * mockTokensList.length)];
        let toToken;
        do {
          toToken = mockTokensList[Math.floor(Math.random() * mockTokensList.length)];
        } while (toToken.id === fromToken.id);
        
        const fromAmount = (Math.random() * 10).toFixed(4);
        let price = "1";
        if (fromToken.symbol === "ETH" && toToken.symbol === "USDT") price = "3000";
        else if (fromToken.symbol === "BTC" && toToken.symbol === "USDT") price = "60000";
        else if (fromToken.symbol === "LINK" && toToken.symbol === "USDT") price = "15";
        
        const toAmount = (parseFloat(fromAmount) * parseFloat(price)).toFixed(4);
        
        transactions.push({
          id: i + 1,
          type: "swap",
          status: "completed",
          fromToken: {
            id: fromToken.id,
            symbol: fromToken.symbol,
            name: fromToken.name,
            logoUrl: fromToken.logoUrl,
          },
          toToken: {
            id: toToken.id,
            symbol: toToken.symbol,
            name: toToken.name,
            logoUrl: toToken.logoUrl,
          },
          fromAmount,
          toAmount,
          price,
          txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
          networkFee: "0.001",
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          timestamp: Math.floor(Date.now() / 1000) - i * 24 * 60 * 60,
        });
      }
      
      // Add spot trading transactions
      for (let i = 0; i < 5; i++) {
        const token = mockTokensList[Math.floor(Math.random() * mockTokensList.length)];
        const baseToken = mockTokensList.find(t => t.symbol === "USDT");
        
        const amount = (Math.random() * 10).toFixed(4);
        let price = "1";
        if (token.symbol === "ETH") price = "3000";
        else if (token.symbol === "BTC") price = "60000";
        else if (token.symbol === "LINK") price = "15";
        
        transactions.push({
          id: i + 6,
          type: Math.random() > 0.5 ? "buy" : "sell",
          status: "completed",
          fromToken: null,
          toToken: null,
          fromAmount: "0",
          toAmount: "0",
          price,
          txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
          networkFee: "0.001",
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
          timestamp: Math.floor(Date.now() / 1000) - i * 24 * 60 * 60,
          // Additional fields for UI differentiation
          token: {
            id: token.id,
            symbol: token.symbol,
            name: token.name,
            logoUrl: token.logoUrl,
          },
          baseToken: {
            id: baseToken.id,
            symbol: baseToken.symbol,
            name: baseToken.name,
            logoUrl: baseToken.logoUrl,
          },
          amount,
          total: (parseFloat(amount) * parseFloat(price)).toFixed(4),
        });
      }
      
      // Sort by timestamp (newest first)
      transactions.sort((a, b) => b.timestamp - a.timestamp);
      
      res.json(transactions);
    } catch (error) {
      handleApiError(res, error);
    }
  });

  // Get gas price
  app.get('/api/gas', (req, res) => {
    const gasPrice = {
      gasPrice: "30",
      unit: "gwei",
      timestamp: new Date().toISOString(),
    };
    
    res.json(gasPrice);
  });

  return app;
}