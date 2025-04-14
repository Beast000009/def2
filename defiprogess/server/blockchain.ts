import { ethers } from 'ethers';
import { IStorage } from './storage';
import {
  User, InsertUser, Token, InsertToken, 
  UserBalance, InsertUserBalance, Transaction, InsertTransaction,
  TokenPrice, InsertTokenPrice
} from '@shared/schema';

// Contract addresses and ABIs from successful deployment
const CONTRACT_ADDRESSES = {
  TOKEN_SWAP: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
  SPOT_TRADING: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
  ETH: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
  USDT: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
  BTC: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
  LINK: "0x59b670e9fA9D0A427751Af201D676719a970857b"
};

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

// Default tokens with blockchain addresses
const defaultTokens: Token[] = [
  {
    id: 1,
    symbol: "ETH",
    name: "Ethereum",
    logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.svg",
    decimals: 18,
    contractAddress: CONTRACT_ADDRESSES.ETH,
    network: "ethereum"
  },
  {
    id: 2,
    symbol: "BTC",
    name: "Bitcoin",
    logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg",
    decimals: 8,
    contractAddress: CONTRACT_ADDRESSES.BTC,
    network: "ethereum" // Note: Using Ethereum network for our mock
  },
  {
    id: 3,
    symbol: "USDT",
    name: "Tether",
    logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.svg",
    decimals: 6,
    contractAddress: CONTRACT_ADDRESSES.USDT,
    network: "ethereum"
  },
  {
    id: 4,
    symbol: "LINK",
    name: "Chainlink",
    logoUrl: "https://cryptologos.cc/logos/chainlink-link-logo.svg",
    decimals: 18,
    contractAddress: CONTRACT_ADDRESSES.LINK,
    network: "ethereum"
  }
];

// Default token prices
const defaultTokenPrices: TokenPrice[] = [
  { 
    id: 1, 
    tokenId: 1, 
    price: "2856.25", 
    priceChange24h: "2.35", 
    volume24h: "15765432.12", 
    marketCap: "389452000000", 
    updatedAt: new Date() 
  },
  { 
    id: 2, 
    tokenId: 2, 
    price: "62453.78", 
    priceChange24h: "1.24", 
    volume24h: "25432876.54", 
    marketCap: "875300000000", 
    updatedAt: new Date() 
  },
  { 
    id: 3, 
    tokenId: 3, 
    price: "1.00", 
    priceChange24h: "0.01", 
    volume24h: "87654123.45", 
    marketCap: "96500000000", 
    updatedAt: new Date() 
  },
  { 
    id: 4, 
    tokenId: 4, 
    price: "17.82", 
    priceChange24h: "-3.45", 
    volume24h: "5432876.12", 
    marketCap: "7643500000", 
    updatedAt: new Date() 
  }
];

// Connect to local Ethereum node
const provider = new ethers.JsonRpcProvider('http://0.0.0.0:8545');

export class BlockchainStorage implements IStorage {
  private users: Map<number, User>;
  private tokens: Map<number, Token>;
  private transactions: Map<number, Transaction>;
  private tokenPrices: Map<number, TokenPrice>;
  
  private currentUserId: number;
  private currentTransactionId: number;
  private currentTokenPriceId: number;
  
  constructor() {
    this.users = new Map();
    this.tokens = new Map();
    this.transactions = new Map();
    this.tokenPrices = new Map();
    
    this.currentUserId = 1;
    this.currentTransactionId = 1;
    this.currentTokenPriceId = 1;
    
    // Initialize with token data
    this.initializeTokenData();
  }
  
  private initializeTokenData() {
    // Initialize tokens
    defaultTokens.forEach(token => {
      this.tokens.set(token.id, token);
    });
    
    // Initialize token prices
    defaultTokenPrices.forEach(tokenPrice => {
      this.tokenPrices.set(tokenPrice.id, tokenPrice);
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByWalletAddress(walletAddress: string): Promise<User | undefined> {
    // First check if the user exists in our cache
    const existingUser = Array.from(this.users.values()).find(
      (user) => user.walletAddress === walletAddress,
    );
    
    if (existingUser) {
      return existingUser;
    }
    
    // If the user doesn't exist, create a new one
    if (ethers.isAddress(walletAddress)) {
      return this.createUser({
        username: `user_${walletAddress.substring(0, 8)}`,
        walletAddress,
        email: null,
        passwordHash: null
      });
    }
    
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  // Token methods
  async getToken(id: number): Promise<Token | undefined> {
    return this.tokens.get(id);
  }
  
  async getTokenBySymbol(symbol: string): Promise<Token | undefined> {
    return Array.from(this.tokens.values()).find(
      (token) => token.symbol === symbol,
    );
  }
  
  async getAllTokens(): Promise<Token[]> {
    return Array.from(this.tokens.values());
  }
  
  async createToken(insertToken: InsertToken): Promise<Token> {
    const id = Array.from(this.tokens.values()).length + 1;
    const token: Token = { ...insertToken, id };
    this.tokens.set(id, token);
    return token;
  }
  
  // UserBalance methods - Read balances from the blockchain
  async getUserBalance(userId: number, tokenId: number): Promise<UserBalance | undefined> {
    const user = await this.getUser(userId);
    const token = await this.getToken(tokenId);
    
    if (!user || !token || !user.walletAddress) {
      return undefined;
    }
    
    try {
      const { balance, formattedBalance } = await this.getTokenBalanceForWallet(token.contractAddress, user.walletAddress);
      
      // Return a constructed UserBalance object
      return {
        id: userId * 100 + tokenId, // Create a unique ID
        userId,
        tokenId,
        balance: formattedBalance,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error(`Error fetching balance for token ${token.symbol}:`, error);
      return undefined;
    }
  }
  
  async getUserBalances(userId: number): Promise<UserBalance[]> {
    const user = await this.getUser(userId);
    if (!user || !user.walletAddress) {
      return [];
    }
    
    const tokens = await this.getAllTokens();
    const balances: UserBalance[] = [];
    
    for (const token of tokens) {
      try {
        const { balance, formattedBalance } = await this.getTokenBalanceForWallet(token.contractAddress, user.walletAddress);
        
        // Only add tokens with non-zero balance
        if (balance > 0n) {
          balances.push({
            id: userId * 100 + token.id, // Create a unique ID
            userId,
            tokenId: token.id,
            balance: formattedBalance,
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error(`Error fetching balance for token ${token.symbol}:`, error);
      }
    }
    
    return balances;
  }
  
  async createOrUpdateUserBalance(insertBalance: InsertUserBalance): Promise<UserBalance> {
    // This is a mock implementation since balances are read from the blockchain
    // In a real implementation, this would trigger a blockchain transaction to transfer tokens
    return {
      id: insertBalance.userId * 100 + insertBalance.tokenId,
      userId: insertBalance.userId,
      tokenId: insertBalance.tokenId,
      balance: insertBalance.balance,
      updatedAt: new Date()
    };
  }
  
  // Helper method to get a token balance from the blockchain
  private async getTokenBalanceForWallet(tokenAddress: string, walletAddress: string): Promise<{ balance: bigint, formattedBalance: string }> {
    try {
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await tokenContract.balanceOf(walletAddress);
      const decimals = await tokenContract.decimals();
      const formattedBalance = ethers.formatUnits(balance, decimals);
      
      return {
        balance,
        formattedBalance
      };
    } catch (error) {
      console.error(`Error fetching balance for ${tokenAddress} wallet ${walletAddress}:`, error);
      return {
        balance: 0n,
        formattedBalance: "0"
      };
    }
  }
  
  // Transaction methods
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async getUserTransactions(userId: number, limit: number = 10): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((tx) => tx.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
  
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const now = new Date();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.transactions.set(id, transaction);
    return transaction;
  }
  
  async updateTransactionStatus(id: number, status: string, txHash?: string): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = {
      ...transaction,
      status,
      txHash: txHash || transaction.txHash,
      updatedAt: new Date(),
    };
    
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
  
  // Token Price methods
  async getTokenPrice(tokenId: number): Promise<TokenPrice | undefined> {
    return this.tokenPrices.get(tokenId);
  }
  
  async getAllTokenPrices(): Promise<TokenPrice[]> {
    return Array.from(this.tokenPrices.values());
  }
  
  async createOrUpdateTokenPrice(insertTokenPrice: InsertTokenPrice): Promise<TokenPrice> {
    const existingPrice = this.tokenPrices.get(insertTokenPrice.tokenId);
    
    if (existingPrice) {
      const updatedPrice = {
        ...existingPrice,
        price: insertTokenPrice.price,
        priceChange24h: insertTokenPrice.priceChange24h,
        volume24h: insertTokenPrice.volume24h,
        marketCap: insertTokenPrice.marketCap,
        updatedAt: new Date(),
      };
      this.tokenPrices.set(insertTokenPrice.tokenId, updatedPrice);
      return updatedPrice;
    } else {
      const id = this.currentTokenPriceId++;
      const newPrice: TokenPrice = {
        ...insertTokenPrice,
        id,
        updatedAt: new Date(),
      };
      this.tokenPrices.set(insertTokenPrice.tokenId, newPrice);
      return newPrice;
    }
  }
  
  // Blockchain specific methods
  
  /**
   * Performs a token swap on the blockchain
   */
  async swapTokens(
    fromTokenId: number,
    toTokenId: number,
    amount: string,
    walletAddress: string
  ): Promise<{ success: boolean, txHash?: string, error?: string }> {
    try {
      const fromToken = await this.getToken(fromTokenId);
      const toToken = await this.getToken(toTokenId);
      
      if (!fromToken || !toToken) {
        return { success: false, error: "Invalid token ID" };
      }
      
      // Mock implementation - in a real app, this would use an actual signer
      // For demo purposes, we'll return a successful mock transaction
      const txHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      return {
        success: true,
        txHash
      };
    } catch (error) {
      console.error("Swap error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  
  /**
   * Executes a spot trade on the blockchain
   */
  async executeSpotTrade(
    baseTokenId: number,
    quoteTokenId: number,
    side: string,
    amount: string,
    price: string,
    walletAddress: string
  ): Promise<{ success: boolean, txHash?: string, error?: string }> {
    try {
      const baseToken = await this.getToken(baseTokenId);
      const quoteToken = await this.getToken(quoteTokenId);
      
      if (!baseToken || !quoteToken) {
        return { success: false, error: "Invalid token ID" };
      }
      
      // Mock implementation - in a real app, this would use an actual signer
      // For demo purposes, we'll return a successful mock transaction
      const txHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      
      return {
        success: true,
        txHash
      };
    } catch (error) {
      console.error("Spot trade error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  
  /**
   * Gets the current gas price from the blockchain
   */
  async getGasPrice(): Promise<{ gasPrice: string, gasLimit: {swap: number, approve: number, spotTrade: number} }> {
    try {
      // Get actual gas price from the provider
      const gasPrice = await provider.getFeeData();
      
      return {
        gasPrice: ethers.formatUnits(gasPrice.gasPrice || 20000000000n, 'gwei'), // Default to 20 gwei if null
        gasLimit: {
          swap: 150000,
          approve: 50000,
          spotTrade: 200000
        }
      };
    } catch (error) {
      console.error("Error getting gas price:", error);
      // Return default values if there's an error
      return {
        gasPrice: "20", // 20 gwei
        gasLimit: {
          swap: 150000,
          approve: 50000,
          spotTrade: 200000
        }
      };
    }
  }
}

// Export a singleton instance
export const blockchainStorage = new BlockchainStorage();