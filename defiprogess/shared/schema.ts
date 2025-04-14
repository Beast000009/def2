import { pgTable, text, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  walletAddress: text("wallet_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  decimals: integer("decimals").notNull().default(18),
  contractAddress: text("contract_address"),
  network: text("network").notNull().default("ethereum"),
});

export const userBalances = pgTable("user_balances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  tokenId: integer("token_id").references(() => tokens.id),
  balance: decimal("balance", { precision: 38, scale: 18 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(), // swap, buy, sell
  status: text("status").notNull(), // pending, completed, failed
  fromTokenId: integer("from_token_id").references(() => tokens.id),
  toTokenId: integer("to_token_id").references(() => tokens.id),
  fromAmount: decimal("from_amount", { precision: 38, scale: 18 }),
  toAmount: decimal("to_amount", { precision: 38, scale: 18 }),
  price: decimal("price", { precision: 38, scale: 18 }),
  txHash: text("tx_hash"),
  networkFee: decimal("network_fee", { precision: 38, scale: 18 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: json("metadata"),
});

export const tokenPrices = pgTable("token_prices", {
  id: serial("id").primaryKey(),
  tokenId: integer("token_id").references(() => tokens.id),
  price: decimal("price", { precision: 38, scale: 18 }).notNull(),
  priceChange24h: decimal("price_change_24h", { precision: 10, scale: 2 }),
  volume24h: decimal("volume_24h", { precision: 38, scale: 18 }),
  marketCap: decimal("market_cap", { precision: 38, scale: 18 }),
  rank: integer("rank"),
  supply: decimal("supply", { precision: 38, scale: 18 }),
  ath: decimal("ath", { precision: 38, scale: 18 }),
  athChangePercentage: decimal("ath_change_percentage", { precision: 10, scale: 2 }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  walletAddress: true,
});

export const insertTokenSchema = createInsertSchema(tokens).pick({
  symbol: true,
  name: true,
  logoUrl: true,
  decimals: true,
  contractAddress: true,
  network: true,
});

export const insertUserBalanceSchema = createInsertSchema(userBalances).pick({
  userId: true,
  tokenId: true,
  balance: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  type: true,
  status: true,
  fromTokenId: true,
  toTokenId: true,
  fromAmount: true,
  toAmount: true,
  price: true,
  txHash: true,
  networkFee: true,
  metadata: true,
});

export const insertTokenPriceSchema = createInsertSchema(tokenPrices).pick({
  tokenId: true,
  price: true,
  priceChange24h: true,
  volume24h: true,
  marketCap: true,
  rank: true,
  supply: true,
  ath: true,
  athChangePercentage: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertToken = z.infer<typeof insertTokenSchema>;
export type Token = typeof tokens.$inferSelect;

export type InsertUserBalance = z.infer<typeof insertUserBalanceSchema>;
export type UserBalance = typeof userBalances.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertTokenPrice = z.infer<typeof insertTokenPriceSchema>;
export type TokenPrice = typeof tokenPrices.$inferSelect;

// Extended schemas for API requests
export const swapTokensSchema = z.object({
  fromTokenId: z.number(),
  toTokenId: z.number(),
  fromAmount: z.string(),
  walletAddress: z.string().optional(),
});

export const spotTradeSchema = z.object({
  tokenId: z.number(),
  baseTokenId: z.number(),
  amount: z.string(),
  price: z.string(),
  type: z.enum(["buy", "sell"]),
  walletAddress: z.string().optional(),
});
