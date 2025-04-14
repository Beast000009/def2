import { 
  User, InsertUser, Token, InsertToken, 
  UserBalance, InsertUserBalance, Transaction, InsertTransaction,
  TokenPrice, InsertTokenPrice
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByWalletAddress(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Token methods
  getToken(id: number): Promise<Token | undefined>;
  getTokenBySymbol(symbol: string): Promise<Token | undefined>;
  getAllTokens(): Promise<Token[]>;
  createToken(token: InsertToken): Promise<Token>;
  
  // User Balance methods
  getUserBalance(userId: number, tokenId: number): Promise<UserBalance | undefined>;
  getUserBalances(userId: number): Promise<UserBalance[]>;
  createOrUpdateUserBalance(balance: InsertUserBalance): Promise<UserBalance>;
  
  // Transaction methods
  getTransaction(id: number): Promise<Transaction | undefined>;
  getUserTransactions(userId: number, limit?: number): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransactionStatus(id: number, status: string, txHash?: string): Promise<Transaction | undefined>;
  
  // Token Price methods
  getTokenPrice(tokenId: number): Promise<TokenPrice | undefined>;
  getAllTokenPrices(): Promise<TokenPrice[]>;
  createOrUpdateTokenPrice(tokenPrice: InsertTokenPrice): Promise<TokenPrice>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tokens: Map<number, Token>;
  private userBalances: Map<string, UserBalance>; // key: userId-tokenId
  private transactions: Map<number, Transaction>;
  private tokenPrices: Map<number, TokenPrice>; // key: tokenId
  
  private currentUserId: number;
  private currentTokenId: number;
  private currentBalanceId: number;
  private currentTransactionId: number;
  private currentTokenPriceId: number;

  constructor() {
    this.users = new Map();
    this.tokens = new Map();
    this.userBalances = new Map();
    this.transactions = new Map();
    this.tokenPrices = new Map();
    
    this.currentUserId = 1;
    this.currentTokenId = 1;
    this.currentBalanceId = 1;
    this.currentTransactionId = 1;
    this.currentTokenPriceId = 1;
    
    // Initialize with some default tokens for testing
    this.initializeDefaultTokens();
  }

  private initializeDefaultTokens() {
    const defaultTokens: InsertToken[] = [
      { symbol: "ETH", name: "Ethereum", logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.svg", decimals: 18, contractAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", network: "ethereum" },
      { symbol: "TEST", name: "Test Token", logoUrl: "https://cryptologos.cc/logos/chainlink-link-logo.svg", decimals: 18, contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3", network: "ethereum" },
      { symbol: "BTC", name: "Bitcoin", logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.svg", decimals: 8, contractAddress: "0x", network: "bitcoin" },
      { symbol: "USDT", name: "Tether", logoUrl: "https://cryptologos.cc/logos/tether-usdt-logo.svg", decimals: 6, contractAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", network: "ethereum" },
      { symbol: "SOL", name: "Solana", logoUrl: "https://cryptologos.cc/logos/solana-sol-logo.svg", decimals: 9, contractAddress: "0x", network: "solana" },
      { symbol: "ADA", name: "Cardano", logoUrl: "https://cryptologos.cc/logos/cardano-ada-logo.svg", decimals: 6, contractAddress: "0x", network: "cardano" },
      { symbol: "XRP", name: "Ripple", logoUrl: "https://cryptologos.cc/logos/xrp-xrp-logo.svg", decimals: 6, contractAddress: "0x", network: "ripple" },
      { symbol: "DOT", name: "Polkadot", logoUrl: "https://cryptologos.cc/logos/polkadot-new-dot-logo.svg", decimals: 10, contractAddress: "0x", network: "polkadot" },
      { symbol: "DOGE", name: "Dogecoin", logoUrl: "https://cryptologos.cc/logos/dogecoin-doge-logo.svg", decimals: 8, contractAddress: "0x", network: "dogecoin" },
      { symbol: "AVAX", name: "Avalanche", logoUrl: "https://cryptologos.cc/logos/avalanche-avax-logo.svg", decimals: 18, contractAddress: "0x", network: "avalanche" },
      { symbol: "UNI", name: "Uniswap", logoUrl: "https://cryptologos.cc/logos/uniswap-uni-logo.svg", decimals: 18, contractAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", network: "ethereum" },
      { symbol: "MATIC", name: "Polygon", logoUrl: "https://cryptologos.cc/logos/polygon-matic-logo.svg", decimals: 18, contractAddress: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", network: "ethereum" },
      { symbol: "LINK", name: "Chainlink", logoUrl: "https://cryptologos.cc/logos/chainlink-link-logo.svg", decimals: 18, contractAddress: "0x514910771AF9Ca656af840dff83E8264EcF986CA", network: "ethereum" },
      { symbol: "SHIB", name: "Shiba Inu", logoUrl: "https://cryptologos.cc/logos/shiba-inu-shib-logo.svg", decimals: 18, contractAddress: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", network: "ethereum" },
      { symbol: "LTC", name: "Litecoin", logoUrl: "https://cryptologos.cc/logos/litecoin-ltc-logo.svg", decimals: 8, contractAddress: "0x", network: "litecoin" },
      { symbol: "ATOM", name: "Cosmos", logoUrl: "https://cryptologos.cc/logos/cosmos-atom-logo.svg", decimals: 6, contractAddress: "0x", network: "cosmos" },
      { symbol: "XLM", name: "Stellar", logoUrl: "https://cryptologos.cc/logos/stellar-xlm-logo.svg", decimals: 7, contractAddress: "0x", network: "stellar" },
      { symbol: "FIL", name: "Filecoin", logoUrl: "https://cryptologos.cc/logos/filecoin-fil-logo.svg", decimals: 18, contractAddress: "0x", network: "filecoin" },
      { symbol: "AAVE", name: "Aave", logoUrl: "https://cryptologos.cc/logos/aave-aave-logo.svg", decimals: 18, contractAddress: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", network: "ethereum" },
      { symbol: "ALGO", name: "Algorand", logoUrl: "https://cryptologos.cc/logos/algorand-algo-logo.svg", decimals: 6, contractAddress: "0x", network: "algorand" },
      { symbol: "CAKE", name: "PancakeSwap", logoUrl: "https://cryptologos.cc/logos/pancakeswap-cake-logo.svg", decimals: 18, contractAddress: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", network: "binance" },
    ];
    
    defaultTokens.forEach(token => this.createToken(token));
    
    // Add default token prices
    const defaultPrices: InsertTokenPrice[] = [
      { tokenId: 1, price: "3245.67", priceChange24h: "2.45", volume24h: "1000000000", marketCap: "389452000000" },
      { tokenId: 2, price: "5.25", priceChange24h: "3.75", volume24h: "15000000", marketCap: "5250000" },
      { tokenId: 3, price: "44782.09", priceChange24h: "1.87", volume24h: "2500000000", marketCap: "875300000000" },
      { tokenId: 4, price: "1.00", priceChange24h: "0.01", volume24h: "5000000000", marketCap: "96500000000" },
      { tokenId: 5, price: "98.34", priceChange24h: "-0.65", volume24h: "750000000", marketCap: "41232400000" },
      { tokenId: 6, price: "0.4523", priceChange24h: "3.12", volume24h: "300000000", marketCap: "15987300000" },
      { tokenId: 7, price: "0.5643", priceChange24h: "1.23", volume24h: "430000000", marketCap: "30254800000" },
      { tokenId: 8, price: "6.85", priceChange24h: "-2.11", volume24h: "140000000", marketCap: "8453900000" },
      { tokenId: 9, price: "0.1234", priceChange24h: "5.67", volume24h: "560000000", marketCap: "17432500000" },
      { tokenId: 10, price: "34.56", priceChange24h: "-0.98", volume24h: "190000000", marketCap: "11987600000" },
      { tokenId: 11, price: "5.43", priceChange24h: "1.45", volume24h: "210000000", marketCap: "3987200000" },
      { tokenId: 12, price: "1.25", priceChange24h: "3.56", volume24h: "320000000", marketCap: "11145800000" },
      { tokenId: 13, price: "14.76", priceChange24h: "-1.54", volume24h: "180000000", marketCap: "7643500000" },
      { tokenId: 14, price: "0.00002145", priceChange24h: "7.89", volume24h: "450000000", marketCap: "12543900000" },
      { tokenId: 15, price: "76.34", priceChange24h: "0.75", volume24h: "110000000", marketCap: "5632100000" },
      { tokenId: 16, price: "9.87", priceChange24h: "2.34", volume24h: "130000000", marketCap: "2876500000" },
      { tokenId: 17, price: "0.13", priceChange24h: "-0.43", volume24h: "45000000", marketCap: "3457800000" },
      { tokenId: 18, price: "5.67", priceChange24h: "1.08", volume24h: "75000000", marketCap: "1143500000" },
      { tokenId: 19, price: "89.32", priceChange24h: "-3.21", volume24h: "35000000", marketCap: "1435600000" },
      { tokenId: 20, price: "0.15", priceChange24h: "2.76", volume24h: "60000000", marketCap: "1067400000" }
    ];
    
    defaultPrices.forEach(price => this.createOrUpdateTokenPrice(price));
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
    return Array.from(this.users.values()).find(
      (user) => user.walletAddress === walletAddress,
    );
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
    const id = this.currentTokenId++;
    const token: Token = { ...insertToken, id };
    this.tokens.set(id, token);
    return token;
  }
  
  // User Balance methods
  async getUserBalance(userId: number, tokenId: number): Promise<UserBalance | undefined> {
    return this.userBalances.get(`${userId}-${tokenId}`);
  }
  
  async getUserBalances(userId: number): Promise<UserBalance[]> {
    return Array.from(this.userBalances.values()).filter(
      (balance) => balance.userId === userId,
    );
  }
  
  async createOrUpdateUserBalance(insertBalance: InsertUserBalance): Promise<UserBalance> {
    const key = `${insertBalance.userId}-${insertBalance.tokenId}`;
    const existingBalance = this.userBalances.get(key);
    
    if (existingBalance) {
      const updatedBalance = {
        ...existingBalance,
        balance: insertBalance.balance,
        updatedAt: new Date(),
      };
      this.userBalances.set(key, updatedBalance);
      return updatedBalance;
    } else {
      const id = this.currentBalanceId++;
      const newBalance: UserBalance = {
        ...insertBalance,
        id,
        updatedAt: new Date(),
      };
      this.userBalances.set(key, newBalance);
      return newBalance;
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
}

export const storage = new MemStorage();
