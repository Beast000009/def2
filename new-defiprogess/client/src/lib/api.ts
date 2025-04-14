import axios from 'axios';

// Create an axios instance with default configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Handle API error responses
const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with a status code that falls out of the range of 2xx
    if (error.response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else {
      throw new Error(error.response.data?.message || 'Server error occurred');
    }
  } else if (error.request) {
    // The request was made but no response was received
    throw new Error('No response received from server. Please check your connection.');
  } else {
    // Something happened in setting up the request that triggered an Error
    throw new Error(error.message || 'An unexpected error occurred');
  }
};

export interface Token {
  id: number;
  symbol: string;
  name: string;
  logoUrl: string;
  decimals?: number;
  contractAddress?: string;
  network?: string;
}

export interface TokenPrice {
  id: number;
  symbol: string;
  name: string;
  logoUrl: string;
  price: string;
  priceChange24h: string;
  volume24h?: string;
  marketCap?: string;
  rank?: number;
  supply?: string;
  ath?: string;
  athChangePercentage?: string;
}

export interface PortfolioAsset {
  id: number;
  token: {
    id: number;
    symbol: string;
    name: string;
    logoUrl: string;
  };
  balance: string;
  value: string;
  price: string;
}

export interface Portfolio {
  walletAddress: string;
  totalValue: string;
  todayChange?: string;  // optional since it might come from real wallet data
  assets: PortfolioAsset[];
}

export interface Transaction {
  id: number;
  type: string;
  status: string;
  fromToken: {
    id: number;
    symbol: string;
    name: string;
    logoUrl: string;
  } | null;
  toToken: {
    id: number;
    symbol: string;
    name: string;
    logoUrl: string;
  } | null;
  fromAmount: string;
  toAmount: string;
  price: string;
  txHash: string | null;
  networkFee: string;
  createdAt: string;
  timestamp: number;
}

export interface GasPrice {
  gasPrice: string;
  unit: string;
  timestamp: string;
}

export interface SwapParams {
  fromTokenId: number;
  toTokenId: number;
  fromAmount: string;
  walletAddress?: string;
}

export interface SwapResponse {
  transactionId: number;
  status: string;
  fromToken: {
    id: number;
    symbol: string;
    name: string;
  };
  toToken: {
    id: number;
    symbol: string;
    name: string;
  };
  fromAmount: string;
  toAmount: string;
  rate: string;
  networkFee: string;
}

export interface TradeParams {
  tokenId: number;
  baseTokenId: number;
  amount: string;
  price: string;
  type: "buy" | "sell";
  walletAddress?: string;
}

export interface TradeResponse {
  transactionId: number;
  status: string;
  type: "buy" | "sell";
  token: {
    id: number;
    symbol: string;
    name: string;
  };
  baseToken: {
    id: number;
    symbol: string;
    name: string;
  };
  amount: string;
  price: string;
  total: string;
  networkFee: string;
}

// Chart Data interface
export interface ChartData {
  prices: Array<[number, number]>; // [timestamp, price]
  marketCaps: Array<[number, number]>; // [timestamp, market_cap]
  totalVolumes: Array<[number, number]>; // [timestamp, volume]
}

// API Functions

export const fetchTokens = async (): Promise<Token[]> => {
  try {
    const response = await api.get("/tokens");
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchTokenPrices = async (): Promise<TokenPrice[]> => {
  try {
    const response = await api.get('/prices');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchChartData = async (coinSymbol: string, days: string = '1'): Promise<ChartData> => {
  try {
    const response = await api.get(`/coins/${coinSymbol}/chart?days=${days}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchPortfolio = async (walletAddress: string): Promise<Portfolio> => {
  try {
    const response = await api.get(`/portfolio/${walletAddress}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchTransactions = async (walletAddress: string): Promise<Transaction[]> => {
  try {
    const response = await api.get(`/transactions/${walletAddress}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchGasPrice = async (): Promise<GasPrice> => {
  try {
    const response = await api.get('/gas-price');
    console.log('Gas price response:', response.data);
    return response.data as GasPrice;
  } catch (error) {
    console.error('Error fetching gas price:', error);
    throw handleApiError(error);
  }
};

export const swapTokens = async (params: SwapParams): Promise<SwapResponse> => {
  try {
    const response = await api.post('/swap', params);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const executeTrade = async (params: TradeParams): Promise<TradeResponse> => {
  try {
    const response = await api.post('/trade', params);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

// Utility functions for working with token amounts

export const formatTokenAmount = (amount: string | number, decimals = 6): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  // Handle zero or extremely small values better
  if (num === 0 || Math.abs(num) < 1e-10) {
    return '0';
  }

  if (num < 0.000001) {
    // Handle very small numbers in a more readable way
    return num.toFixed(8);
  }

  if (num < 0.01) {
    return num.toFixed(6);
  }

  if (num < 1) {
    return num.toFixed(4);
  }

  if (num < 1000) {
    return num.toFixed(2);
  }

  if (num < 1000000) {
    return (num / 1000).toFixed(2) + 'K';
  }

  if (num < 1000000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }

  return (num / 1000000000).toFixed(2) + 'B';
};

export const formatUsdValue = (value: string | number): string => {
  const parsedValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(parsedValue)) return '$0.00';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(parsedValue);
};

export const formatPriceChange = (priceChange: string | number): string => {
  const parsedChange = typeof priceChange === 'string' ? parseFloat(priceChange) : priceChange;

  if (isNaN(parsedChange)) return '0.00%';

  return (parsedChange >= 0 ? '+' : '') + parsedChange.toFixed(2) + '%';
};

export const getFormattedTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }

  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? 's' : ''} ago`;
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'text-success';
    case 'pending':
      return 'text-warning';
    case 'failed':
      return 'text-error';
    default:
      return 'text-neutral-400';
  }
};

export const getTransactionTypeIcon = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'swap':
      return 'ri-arrow-left-right-line';
    case 'buy':
      return 'ri-arrow-down-line';
    case 'sell':
      return 'ri-arrow-up-line';
    default:
      return 'ri-funds-line';
  }
};

// Add formatCurrency at the end of the file
export function formatCurrency(value: number, currency: string = 'USD', decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export const fetchGlobalMarketData = async () => {
  try {
    const response = await api.get('/market/global');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchTrendingCoins = async () => {
  try {
    const response = await api.get('/trending');
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchCoinDetails = async (coinId: string) => {
  try {
    const response = await api.get(`/coins/${coinId}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

export const fetchCoinChartData = async (coinId: string, days = 7) => {
  try {
    const response = await api.get(`/coins/${coinId}/chart?days=${days}`);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};