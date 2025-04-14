import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
// Use blockchain storage instead of memory storage
import { blockchainStorage as storage } from "./blockchain";
import {
  insertUserSchema,
  swapTokensSchema,
  spotTradeSchema,
  insertUserBalanceSchema,
  insertTransactionSchema,
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import axios from "axios";
import { ethers } from "ethers";

// CoinGecko API key (Pro)
const COINGECKO_API_KEY = "CG-DabLio2kdoGa5MG2Pc7tqvNk";

// Nomics API base URL and key
const NOMICS_API_URL = "https://api.nomics.com/v1";
const NOMICS_API_KEY = process.env.NOMICS_API_KEY || "";

// Function to build URL with API key
const buildApiUrl = (endpoint: string) =>
  `${NOMICS_API_URL}/${endpoint}?key=${NOMICS_API_KEY}`;

// Mock Nomics call (for illustration purposes)
const getTokenPriceWithNomics = async (tokenSymbol: string) => {
  const fakeData = {
    price: "123.45",
    priceChange24h: "5.67",
    volume24h: "7890.12",
    marketCap: "345678901.23",
  };
  return fakeData;
};

// Replace CoinGecko fetching with Nomics
const getTokenPrice = async (tokenSymbol: string) => {
  return getTokenPriceWithNomics(tokenSymbol);
};

// API rate limiting management
const API_RATE_LIMIT = {
  isRateLimited: false,
  resetTime: 0,
  queue: [] as (() => void)[],
  batchSize: 5, // Increase the number of requests to process at once
  processingQueue: false,
  limit: 30, // CoinGecko's rate limit is 30 requests per minute for free tier
};

// Process the API request queue when rate limit resets
const processQueue = async () => {
  if (API_RATE_LIMIT.processingQueue || API_RATE_LIMIT.queue.length === 0)
    return;

  API_RATE_LIMIT.processingQueue = true;

  // Process batch of requests
  const batch = API_RATE_LIMIT.queue.splice(0, API_RATE_LIMIT.batchSize);
  for (const request of batch) {
    request();
    // Add a small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  API_RATE_LIMIT.processingQueue = false;

  // If there are more requests, schedule next batch
  if (API_RATE_LIMIT.queue.length > 0) {
    setTimeout(processQueue, 1000);
  }
};

// Handle rate limit reset
const handleRateLimitReset = () => {
  const now = Date.now();
  if (now >= API_RATE_LIMIT.resetTime) {
    API_RATE_LIMIT.isRateLimited = false;
    API_RATE_LIMIT.resetTime = 0;
    processQueue();
  } else {
    // Check again when reset time is reached
    const timeToReset = API_RATE_LIMIT.resetTime - now;
    setTimeout(handleRateLimitReset, timeToReset);
  }
};

// Mapping for token symbols to CoinGecko IDs
const COINGECKO_ID_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  BNB: "binancecoin",
  XRP: "ripple",
  DOT: "polkadot",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  LINK: "chainlink",
  USDT: "tether",
  USDC: "usd-coin",
  MATIC: "matic-network",
  UNI: "uniswap",
  SHIB: "shiba-inu",
  LTC: "litecoin",
  ATOM: "cosmos",
  XLM: "stellar",
  NEAR: "near",
  ALGO: "algorand",
  FIL: "filecoin",
  AAVE: "aave",
  CAKE: "pancakeswap-token",
  SAND: "the-sandbox",
  MANA: "decentraland",
  ENJ: "enjincoin",
  CRO: "crypto-com-chain",
  GRT: "the-graph",
  SUSHI: "sushi",
  COMP: "compound-governance-token",
  MKR: "maker",
  YFI: "yearn-finance",
  SNX: "synthetix-network-token",
  BAT: "basic-attention-token",
  CHZ: "chiliz",
  "1INCH": "1inch",
};

// Utility to handle API errors
const handleApiError = (res: Response, error: unknown) => {
  console.error("API Error:", error);

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: fromZodError(error).message,
    });
  }

  return res.status(500).json({
    message:
      error instanceof Error ? error.message : "An unknown error occurred",
  });
};

// Simulate network fee for blockchain transactions
const simulateNetworkFee = () => {
  // Returns a fee between 0.001 and 0.01 ETH (in string format)
  const fee = (Math.random() * 0.009 + 0.001).toFixed(6);
  return fee;
};

// Simulate transaction hash for blockchain transactions
const simulateTxHash = () => {
  return (
    "0x" +
    Array(64)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join("")
  );
};

// Cache for storing token prices to reduce API calls
const tokenPriceCache = new Map<
  string,
  {
    data: {
      price: string;
      priceChange24h: string;
      volume24h: string | null;
      marketCap: string | null;
    };
    timestamp: number;
  }
>();

// Get token price from CoinGecko using their API with rate limiting and caching
const getTokenPriceFromCoinGecko = async (
  tokenSymbol: string,
): Promise<{
  price: string;
  priceChange24h: string;
  volume24h: string | null;
  marketCap: string | null;
}> => {
  // Check cache first (valid for 30 minutes - increased to reduce API calls)
  const cachedData = tokenPriceCache.get(tokenSymbol);
  if (cachedData && Date.now() - cachedData.timestamp < 1800000) {
    // 30 minutes
    return cachedData.data;
  }

  // Create mock data for development when rate limited
  const generateMockPriceData = (symbol: string) => {
    // Use deterministic pricing based on symbol to make it realistic
    const symbolHash = symbol
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    // Base price determined by symbol hash
    const basePrice = (symbolHash % 1000) + (symbolHash % 100) / 100;

    // Price change based on last digit of hash
    const changeDir = symbolHash % 2 === 0 ? 1 : -1;
    const priceChange = changeDir * ((symbolHash % 10) / 10);

    // Volume and market cap based on price and hash
    const volume = basePrice * 1000000 * (1 + (symbolHash % 10) / 10);
    const marketCap = basePrice * 10000000 * (1 + (symbolHash % 5) / 10);

    return {
      price: basePrice.toString(),
      priceChange24h: priceChange.toFixed(2),
      volume24h: volume.toString(),
      marketCap: marketCap.toString(),
    };
  };

  // Returns a promise that resolves with token price data
  return new Promise((resolve, reject) => {
    const fetchPrice = async () => {
      try {
        // Convert token symbol to CoinGecko ID
        const coinId =
          COINGECKO_ID_MAP[tokenSymbol] || tokenSymbol.toLowerCase();

        // Use the Demo API format
        const apiUrl = "https://api.coingecko.com/api/v3";

        // Build the request URL with demo API key format
        let url = `${apiUrl}/simple/price?ids=${coinId}&vs_currencies=usd&include_24h_vol=true&include_24h_change=true&include_market_cap=true&x_cg_demo_api_key=${COINGECKO_API_KEY}`;

        // Set headers with API key for additional authentication method
        const headers = {
          "x-cg-demo-api-key": COINGECKO_API_KEY,
        };

        try {
          // Try to get data from API with both query param and header authentication
          const response = await axios.get(url, { headers });

          if (!response.data || !response.data[coinId]) {
            throw new Error(`Price data not found for ${tokenSymbol}`);
          }

          const data = response.data[coinId];
          const result = {
            price: data.usd.toString(),
            priceChange24h: data.usd_24h_change
              ? data.usd_24h_change.toFixed(2)
              : "0.00",
            volume24h: data.usd_24h_vol ? data.usd_24h_vol.toString() : null,
            marketCap: data.usd_market_cap
              ? data.usd_market_cap.toString()
              : null,
          };

          // Update cache
          tokenPriceCache.set(tokenSymbol, {
            data: result,
            timestamp: Date.now(),
          });

          resolve(result);
        } catch (apiError: any) {
          // If we're rate limited, generate mock data based on the token symbol
          if (apiError.response && apiError.response.status === 429) {
            console.log(`Rate limited for ${tokenSymbol}. Using backup data.`);

            // Generate mock data
            const mockData = generateMockPriceData(tokenSymbol);

            // Cache the mock data
            tokenPriceCache.set(tokenSymbol, {
              data: mockData,
              timestamp: Date.now(),
            });

            resolve(mockData);
          } else {
            throw apiError;
          }
        }
      } catch (error: any) {
        console.error(`Error fetching price for ${tokenSymbol}:`, error);

        // If we have cached data, use that instead of rejecting on error
        if (cachedData) {
          console.log(`Using cached data for ${tokenSymbol} due to error`);
          resolve(cachedData.data);
        } else {
          // Generate mock data as a last resort
          const mockData = generateMockPriceData(tokenSymbol);

          // Cache the mock data
          tokenPriceCache.set(tokenSymbol, {
            data: mockData,
            timestamp: Date.now(),
          });

          resolve(mockData);
        }
      }
    };

    // Execute request immediately or use cached data
    if (API_RATE_LIMIT.isRateLimited) {
      if (cachedData) {
        // Use cached data
        console.log(
          `Using cached data for ${tokenSymbol} due to active rate limiting`,
        );
        resolve(cachedData.data);
      } else {
        // Generate mock data as we're rate limited and have no cache
        const mockData = generateMockPriceData(tokenSymbol);
        tokenPriceCache.set(tokenSymbol, {
          data: mockData,
          timestamp: Date.now(),
        });
        resolve(mockData);
      }
    } else {
      // Execute request immediately
      fetchPrice();
    }
  });
};

// Get trending cryptocurrencies from CoinGecko with rate limiting
const getTrendingCoins = async () => {
  return new Promise((resolve, reject) => {
    const fetchTrending = async () => {
      try {
        // Use the public CoinGecko API with demo key
        const apiUrl = "https://api.coingecko.com/api/v3";

        // Build the request URL with Demo API key format
        let url = `${apiUrl}/search/trending?x_cg_demo_api_key=${COINGECKO_API_KEY}`;

        // Set headers with API key for additional authentication method
        const headers = {
          "x-cg-demo-api-key": COINGECKO_API_KEY,
        };

        const response = await axios.get(url, { headers });
        const trendingCoins = response.data.coins.map((coin: any) => ({
          id: coin.item.id,
          name: coin.item.name,
          symbol: coin.item.symbol,
          logoUrl: coin.item.large,
          marketCapRank: coin.item.market_cap_rank,
        }));
        resolve(trendingCoins);
      } catch (error: any) {
        // Handle rate limiting
        if (error.response && error.response.status === 429) {
          console.log(
            "Rate limited when fetching trending coins. Adding to queue.",
          );

          // Get retry time from headers if available
          const retryAfter = error.response.headers["retry-after"];
          const resetTime = retryAfter
            ? Date.now() + parseInt(retryAfter) * 1000
            : Date.now() + 60000; // Default to 60 seconds

          // Update rate limit status
          API_RATE_LIMIT.isRateLimited = true;
          API_RATE_LIMIT.resetTime = Math.max(
            API_RATE_LIMIT.resetTime,
            resetTime,
          );

          // Add request to queue
          API_RATE_LIMIT.queue.push(() => {
            getTrendingCoins().then(resolve).catch(reject);
          });

          // Start rate limit reset handler if not already started
          if (API_RATE_LIMIT.resetTime > 0 && !API_RATE_LIMIT.processingQueue) {
            setTimeout(
              handleRateLimitReset,
              Math.max(1000, API_RATE_LIMIT.resetTime - Date.now()),
            );
          }

          // Return empty trending list for now
          resolve([]);
        } else {
          console.error("Error fetching trending coins:", error);
          reject(error);
        }
      }
    };

    // If currently rate limited, add to queue
    if (API_RATE_LIMIT.isRateLimited) {
      API_RATE_LIMIT.queue.push(() => {
        getTrendingCoins().then(resolve).catch(reject);
      });

      // Return empty trending list for now
      resolve([]);
    } else {
      // Execute request immediately
      fetchTrending();
    }
  });
};

// Get global crypto market data with rate limiting
const getGlobalMarketData = async () => {
  return new Promise((resolve, reject) => {
    const fetchGlobalData = async () => {
      try {
        // Use the public CoinGecko API with demo key
        const apiUrl = "https://api.coingecko.com/api/v3";

        // Build the request URL with Demo API key format
        let url = `${apiUrl}/global?x_cg_demo_api_key=${COINGECKO_API_KEY}`;

        // Set headers with API key for additional authentication method
        const headers = {
          "x-cg-demo-api-key": COINGECKO_API_KEY,
        };

        const response = await axios.get(url, { headers });
        const data = response.data.data;

        resolve({
          totalMarketCap: data.total_market_cap.usd,
          totalVolume24h: data.total_volume.usd,
          marketCapPercentage: data.market_cap_percentage,
          marketCapChangePercentage24hUsd:
            data.market_cap_change_percentage_24h_usd,
        });
      } catch (error: any) {
        // Handle rate limiting
        if (error.response && error.response.status === 429) {
          console.log(
            "Rate limited when fetching global market data. Adding to queue.",
          );

          // Get retry time from headers if available
          const retryAfter = error.response.headers["retry-after"];
          const resetTime = retryAfter
            ? Date.now() + parseInt(retryAfter) * 1000
            : Date.now() + 60000; // Default to 60 seconds

          // Update rate limit status
          API_RATE_LIMIT.isRateLimited = true;
          API_RATE_LIMIT.resetTime = Math.max(
            API_RATE_LIMIT.resetTime,
            resetTime,
          );

          // Add request to queue
          API_RATE_LIMIT.queue.push(() => {
            getGlobalMarketData().then(resolve).catch(reject);
          });

          // Start rate limit reset handler if not already started
          if (API_RATE_LIMIT.resetTime > 0 && !API_RATE_LIMIT.processingQueue) {
            setTimeout(
              handleRateLimitReset,
              Math.max(1000, API_RATE_LIMIT.resetTime - Date.now()),
            );
          }

          // Return default market data for now
          resolve({
            totalMarketCap: 0,
            totalVolume24h: 0,
            marketCapPercentage: {},
            marketCapChangePercentage24hUsd: 0,
          });
        } else {
          console.error("Error fetching global market data:", error);
          reject(error);
        }
      }
    };

    // If currently rate limited, add to queue
    if (API_RATE_LIMIT.isRateLimited) {
      API_RATE_LIMIT.queue.push(() => {
        getGlobalMarketData().then(resolve).catch(reject);
      });

      // Return default market data for now
      resolve({
        totalMarketCap: 0,
        totalVolume24h: 0,
        marketCapPercentage: {},
        marketCapChangePercentage24hUsd: 0,
      });
    } else {
      // Execute request immediately
      fetchGlobalData();
    }
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes - prefix with /api
  
  // Status endpoint - verify blockchain connection
  app.get("/api/status", async (req, res) => {
    try {
      // Check connection to Ethereum node
      const provider = new ethers.JsonRpcProvider('http://0.0.0.0:8545');
      const blockNumber = await provider.getBlockNumber();
      
      return res.json({
        status: 'ok',
        provider: 'connected',
        blockNumber,
        contracts: {
          TOKEN_SWAP: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
          SPOT_TRADING: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
          ETH_TOKEN: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
          USDT_TOKEN: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
          BTC_TOKEN: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
          LINK_TOKEN: "0x59b670e9fA9D0A427751Af201D676719a970857b"
        }
      });
    } catch (error) {
      console.error("Error checking blockchain status:", error);
      return res.json({
        status: 'error',
        provider: 'disconnected',
        message: error instanceof Error ? error.message : "Unknown error connecting to blockchain"
      });
    }
  });

  // Get all tokens
  app.get("/api/tokens", async (req, res) => {
    try {
      const tokens = await storage.getAllTokens();
      return res.json(tokens);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get token prices
  app.get("/api/prices", async (req, res) => {
    try {
      const tokenPrices = await storage.getAllTokenPrices();
      const tokens = await storage.getAllTokens();

      const result = await Promise.all(
        tokens.map(async (token) => {
          const tokenPrice = tokenPrices.find((tp) => tp.tokenId === token.id);

          // Try to get real-time price from CoinGecko
          try {
            const livePrice = await getTokenPriceFromCoinGecko(token.symbol);

            // Update price in storage
            if (livePrice) {
              await storage.createOrUpdateTokenPrice({
                tokenId: token.id,
                price: livePrice.price,
                priceChange24h: livePrice.priceChange24h,
                volume24h: livePrice.volume24h || null,
                marketCap: livePrice.marketCap || null,
                rank: null,
                supply: null,
                ath: null,
                athChangePercentage: null,
              });
            }

            return {
              id: token.id,
              symbol: token.symbol,
              name: token.name,
              logoUrl: token.logoUrl,
              price: livePrice.price,
              priceChange24h: livePrice.priceChange24h,
              volume24h: livePrice.volume24h || "0",
              marketCap: livePrice.marketCap || "0",
            };
          } catch (error) {
            console.error(
              `Failed to fetch live price for ${token.symbol}:`,
              error,
            );
            // Use stored price data as fallback
            return {
              id: token.id,
              symbol: token.symbol,
              name: token.name,
              logoUrl: token.logoUrl,
              price: tokenPrice?.price || "0",
              priceChange24h: tokenPrice?.priceChange24h || "0",
              volume24h: tokenPrice?.volume24h || "0",
              marketCap: "0",
            };
          }
        }),
      );

      return res.json(result);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get trending cryptocurrencies
  app.get("/api/trending", async (req, res) => {
    try {
      const trendingCoins = await getTrendingCoins();
      return res.json(trendingCoins);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get global market data
  app.get("/api/market/global", async (req, res) => {
    try {
      const globalData = await getGlobalMarketData();
      return res.json(globalData);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get detailed information for a specific coin
  app.get("/api/coins/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const coinId = COINGECKO_ID_MAP[id.toUpperCase()] || id.toLowerCase();

      // Use the public CoinGecko API with demo key
      const apiUrl = "https://api.coingecko.com/api/v3";

      // Build the request URL with Demo API key format
      let url = `${apiUrl}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false&x_cg_demo_api_key=${COINGECKO_API_KEY}`;

      // Set headers with API key for additional authentication method
      const headers = {
        "x-cg-demo-api-key": COINGECKO_API_KEY,
      };

      const response = await axios.get(url, { headers });

      const data = response.data;

      return res.json({
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        logoUrl: data.image.large,
        description: data.description.en,
        marketCap: data.market_data.market_cap.usd,
        marketCapRank: data.market_cap_rank,
        fullyDilutedValuation:
          data.market_data.fully_diluted_valuation?.usd || null,
        totalVolume: data.market_data.total_volume.usd,
        high24h: data.market_data.high_24h.usd,
        low24h: data.market_data.low_24h.usd,
        priceChange24h: data.market_data.price_change_24h,
        priceChangePercentage24h: data.market_data.price_change_percentage_24h,
        priceChangePercentage7d: data.market_data.price_change_percentage_7d,
        priceChangePercentage30d: data.market_data.price_change_percentage_30d,
        marketCapChange24h: data.market_data.market_cap_change_24h,
        marketCapChangePercentage24h:
          data.market_data.market_cap_change_percentage_24h,
        circulatingSupply: data.market_data.circulating_supply,
        totalSupply: data.market_data.total_supply,
        maxSupply: data.market_data.max_supply,
        ath: data.market_data.ath.usd,
        athChangePercentage: data.market_data.ath_change_percentage.usd,
        athDate: data.market_data.ath_date.usd,
        atl: data.market_data.atl.usd,
        atlChangePercentage: data.market_data.atl_change_percentage.usd,
        atlDate: data.market_data.atl_date.usd,
        lastUpdated: data.last_updated,
      });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get market chart data for a specific coin
  app.get("/api/coins/:id/chart", async (req, res) => {
    try {
      const { id } = req.params;
      const { days = 7 } = req.query;
      const coinId = COINGECKO_ID_MAP[id.toUpperCase()] || id.toLowerCase();

      // Use the public CoinGecko API with demo key
      const apiUrl = "https://api.coingecko.com/api/v3";

      // Build the request URL with Demo API key format
      let url = `${apiUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&x_cg_demo_api_key=${COINGECKO_API_KEY}`;

      // Set headers with API key for additional authentication method
      const headers = {
        "x-cg-demo-api-key": COINGECKO_API_KEY,
      };

      const response = await axios.get(url, { headers });

      const { prices, market_caps, total_volumes } = response.data;

      return res.json({
        prices,
        marketCaps: market_caps,
        totalVolumes: total_volumes,
      });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get user portfolio (balances with token info)
  app.get("/api/portfolio/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;

      let user = await storage.getUserByWalletAddress(walletAddress);

      // If user doesn't exist, create a new one but don't add fake balances
      if (!user) {
        user = await storage.createUser({
          username: `user_${Math.floor(Math.random() * 10000)}`,
          password: "password", // This is a demo app
          walletAddress,
        });

        // Create empty balances
        const tokens = await storage.getAllTokens();
        for (const token of tokens) {
          await storage.createOrUpdateUserBalance({
            userId: user.id,
            tokenId: token.id,
            balance: "0",
          });
        }
      }

      const balances = await storage.getUserBalances(user.id);
      const tokens = await storage.getAllTokens();
      const tokenPrices = await storage.getAllTokenPrices();

      const portfolio = await Promise.all(
        balances.map(async (balance) => {
          const token = tokens.find((t) => t.id === balance.tokenId);
          const tokenPrice = tokenPrices.find(
            (tp) => tp.tokenId === balance.tokenId,
          );

          if (!token || !tokenPrice) return null;

          // Try to get real-time price from CoinGecko
          try {
            const livePrice = await getTokenPriceFromCoinGecko(token.symbol);
            const price = livePrice?.price || tokenPrice.price;

            return {
              id: balance.id,
              token: {
                id: token.id,
                symbol: token.symbol,
                name: token.name,
                logoUrl: token.logoUrl,
              },
              balance: balance.balance,
              value: (parseFloat(balance.balance) * parseFloat(price)).toFixed(
                2,
              ),
              price: price,
              priceChange24h:
                livePrice?.priceChange24h || tokenPrice.priceChange24h || "0",
            };
          } catch (error) {
            // Use stored price data as fallback
            return {
              id: balance.id,
              token: {
                id: token.id,
                symbol: token.symbol,
                name: token.name,
                logoUrl: token.logoUrl,
              },
              balance: balance.balance,
              value: (
                parseFloat(balance.balance) * parseFloat(tokenPrice.price)
              ).toFixed(2),
              price: tokenPrice.price,
              priceChange24h: tokenPrice.priceChange24h || "0",
            };
          }
        }),
      );

      // Filter out null values
      const filteredPortfolio = portfolio.filter((item) => item !== null);

      // Calculate total value
      const totalValue = filteredPortfolio
        .reduce((sum, item) => sum + parseFloat(item!.value), 0)
        .toFixed(2);

      return res.json({
        walletAddress,
        totalValue,
        assets: filteredPortfolio,
      });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get recent transactions
  app.get("/api/transactions/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;

      const user = await storage.getUserByWalletAddress(walletAddress);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const transactions = await storage.getUserTransactions(user.id, 10);
      const tokens = await storage.getAllTokens();

      const txWithDetails = transactions.map((tx) => {
        const fromToken = tokens.find((t) => t.id === tx.fromTokenId);
        const toToken = tokens.find((t) => t.id === tx.toTokenId);

        return {
          id: tx.id,
          type: tx.type,
          status: tx.status,
          fromToken: fromToken
            ? {
                id: fromToken.id,
                symbol: fromToken.symbol,
                name: fromToken.name,
                logoUrl: fromToken.logoUrl,
              }
            : null,
          toToken: toToken
            ? {
                id: toToken.id,
                symbol: toToken.symbol,
                name: toToken.name,
                logoUrl: toToken.logoUrl,
              }
            : null,
          fromAmount: tx.fromAmount,
          toAmount: tx.toAmount,
          price: tx.price,
          txHash: tx.txHash,
          networkFee: tx.networkFee,
          createdAt: tx.createdAt,
          timestamp: tx.createdAt ? tx.createdAt.getTime() : Date.now(),
        };
      });

      return res.json(txWithDetails);
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Swap tokens
  app.post("/api/swap", async (req, res) => {
    try {
      const swapData = swapTokensSchema.parse(req.body);

      const fromToken = await storage.getToken(swapData.fromTokenId);
      const toToken = await storage.getToken(swapData.toTokenId);

      if (!fromToken || !toToken) {
        return res.status(404).json({ message: "Token not found" });
      }

      // Get user by wallet address or create if not exists
      let user = await storage.getUserByWalletAddress(
        swapData.walletAddress || "",
      );

      if (!user && swapData.walletAddress) {
        user = await storage.createUser({
          username: `user_${Math.floor(Math.random() * 10000)}`,
          password: "password", // This is a demo app
          walletAddress: swapData.walletAddress,
        });
      }

      if (!user) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      // Get token prices from API
      let fromTokenPrice;
      let toTokenPrice;

      try {
        // Try to get live prices
        fromTokenPrice = await getTokenPriceFromCoinGecko(fromToken.symbol);
        toTokenPrice = await getTokenPriceFromCoinGecko(toToken.symbol);
      } catch (error) {
        console.error("Error fetching live prices for swap:", error);
        // Fallback to stored prices
        const storedFromPrice = await storage.getTokenPrice(fromToken.id);
        const storedToPrice = await storage.getTokenPrice(toToken.id);

        if (!storedFromPrice || !storedToPrice) {
          return res
            .status(404)
            .json({ message: "Token prices not available" });
        }

        fromTokenPrice = {
          price: storedFromPrice.price,
          priceChange24h: storedFromPrice.priceChange24h || "0",
        };

        toTokenPrice = {
          price: storedToPrice.price,
          priceChange24h: storedToPrice.priceChange24h || "0",
        };
      }

      // Calculate exchange rate and amount to receive
      const fromAmount = parseFloat(swapData.fromAmount);
      const rate =
        parseFloat(toTokenPrice.price) / parseFloat(fromTokenPrice.price);
      const toAmount = (fromAmount * rate).toFixed(toToken.decimals || 6);

      // Check if user has sufficient balance
      const userFromBalance = await storage.getUserBalance(
        user.id,
        fromToken.id,
      );

      if (
        !userFromBalance ||
        parseFloat(userFromBalance.balance) < fromAmount
      ) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Create transaction
      const networkFee = simulateNetworkFee();

      const transaction = await storage.createTransaction({
        userId: user.id,
        type: "swap",
        status: "pending",
        fromTokenId: fromToken.id,
        toTokenId: toToken.id,
        fromAmount: fromAmount.toString(),
        toAmount,
        price: fromTokenPrice.price,
        networkFee,
        metadata: {
          rate: rate.toString(),
          priceImpact: "0.05",
        },
      });

      // Simulate transaction confirmation (would be a blockchain call in production)
      // setTimeout(async () => {
      //   // Update transaction status
      //   const txHash = simulateTxHash();
      //   await storage.updateTransactionStatus(transaction.id, "completed", txHash);

      //   // Update user balances
      //   const updatedFromBalance = (parseFloat(userFromBalance.balance) - fromAmount).toString();
      //   await storage.createOrUpdateUserBalance({
      //     userId: user.id,
      //     tokenId: fromToken.id,
      //     balance: updatedFromBalance
      //   });

      //   // Update or create to balance
      //   const userToBalance = await storage.getUserBalance(user.id, toToken.id);
      //   const updatedToBalance = userToBalance
      //     ? (parseFloat(userToBalance.balance) + parseFloat(toAmount)).toString()
      //     : toAmount;

      //   await storage.createOrUpdateUserBalance({
      //     userId: user.id,
      //     tokenId: toToken.id,
      //     balance: updatedToBalance
      //   });
      // }, 2000);

      return res.json({
        transactionId: transaction.id,
        status: transaction.status,
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
        fromAmount: swapData.fromAmount,
        toAmount,
        rate: rate.toString(),
        networkFee,
      });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Spot trade (buy/sell)
  app.post("/api/trade", async (req, res) => {
    try {
      const tradeData = spotTradeSchema.parse(req.body);

      const token = await storage.getToken(tradeData.tokenId);
      const baseToken = await storage.getToken(tradeData.baseTokenId);

      if (!token || !baseToken) {
        return res.status(404).json({ message: "Token not found" });
      }

      // Get user by wallet address or create if not exists
      let user = await storage.getUserByWalletAddress(
        tradeData.walletAddress || "",
      );

      if (!user && tradeData.walletAddress) {
        user = await storage.createUser({
          username: `user_${Math.floor(Math.random() * 10000)}`,
          password: "password", // This is a demo app
          walletAddress: tradeData.walletAddress,
        });
      }

      if (!user) {
        return res.status(400).json({ message: "Wallet address is required" });
      }

      const amount = parseFloat(tradeData.amount);
      const price = parseFloat(tradeData.price);
      const total = amount * price;

      // For buy: check if user has enough baseToken (e.g., USDT)
      // For sell: check if user has enough token (e.g., ETH)
      const sourceTokenId = tradeData.type === "buy" ? baseToken.id : token.id;
      const sourceAmount = tradeData.type === "buy" ? total : amount;

      const userSourceBalance = await storage.getUserBalance(
        user.id,
        sourceTokenId,
      );

      if (
        !userSourceBalance ||
        parseFloat(userSourceBalance.balance) < sourceAmount
      ) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Create transaction
      const networkFee = simulateNetworkFee();

      const fromTokenId = tradeData.type === "buy" ? baseToken.id : token.id;
      const toTokenId = tradeData.type === "buy" ? token.id : baseToken.id;
      const fromAmount =
        tradeData.type === "buy" ? total.toString() : amount.toString();
      const toAmount =
        tradeData.type === "buy" ? amount.toString() : total.toString();

      const transaction = await storage.createTransaction({
        userId: user.id,
        type: tradeData.type,
        status: "pending",
        fromTokenId,
        toTokenId,
        fromAmount,
        toAmount,
        price: price.toString(),
        networkFee,
        metadata: {
          pair: `${token.symbol}/${baseToken.symbol}`,
        },
      });

      // Simulate transaction confirmation (would be a blockchain call in production)
      setTimeout(async () => {
        // Update transaction status
        const txHash = simulateTxHash();
        await storage.updateTransactionStatus(
          transaction.id,
          "completed",
          txHash,
        );

        // Update user balances
        // Decrease source balance
        const updatedSourceBalance = (
          parseFloat(userSourceBalance.balance) - sourceAmount
        ).toString();
        await storage.createOrUpdateUserBalance({
          userId: user.id,
          tokenId: sourceTokenId,
          balance: updatedSourceBalance,
        });

        // Increase target balance
        const targetTokenId =
          tradeData.type === "buy" ? token.id : baseToken.id;
        const targetAmount = tradeData.type === "buy" ? amount : total;

        const userTargetBalance = await storage.getUserBalance(
          user.id,
          targetTokenId,
        );
        const updatedTargetBalance = userTargetBalance
          ? (parseFloat(userTargetBalance.balance) + targetAmount).toString()
          : targetAmount.toString();

        await storage.createOrUpdateUserBalance({
          userId: user.id,
          tokenId: targetTokenId,
          balance: updatedTargetBalance,
        });
      }, 2000);

      return res.json({
        transactionId: transaction.id,
        status: transaction.status,
        type: tradeData.type,
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
        amount: tradeData.amount,
        price: tradeData.price,
        total: total.toString(),
        networkFee,
      });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  // Get gas price (simulated)
  app.get("/api/gas-price", async (req, res) => {
    try {
      // In a real app, this would call an actual gas price API
      const gasPrice = Math.floor(Math.random() * 70) + 20; // 20-90 Gwei

      return res.json({
        gasPrice: `${gasPrice}`,
        unit: "Gwei",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return handleApiError(res, error);
    }
  });

  return createServer(app);
}
