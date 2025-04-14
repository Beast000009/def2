import PriceChart from "@/components/PriceChart";
import PortfolioOverview from "@/components/PortfolioOverview";
import TransactionHistoryItem from "@/components/TransactionHistoryItem";
import SwapInterface from "@/components/SwapInterface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import SpotTradingInterface from "@/components/SpotTradingInterface";
import { useWeb3 } from "@/lib/web3";
import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, fetchTokenPrices, TokenPrice, formatPriceChange } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { address } = useWeb3();
  const [selectedToken, setSelectedToken] = useState<string>("ETH");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: transactions } = useQuery({
    queryKey: address ? [`/api/transactions/${address}`] : null,
    enabled: !!address
  });

  const { data: tokenPrices, isLoading } = useQuery<TokenPrice[]>({
    queryKey: ['/api/prices'],
    // Remove refetchInterval to prevent automatic updates
    refetchOnWindowFocus: false,
    staleTime: Infinity, // Keep the data fresh indefinitely
    cacheTime: Infinity // Never remove from cache
  });

  // Get the selected token data
  const selectedTokenData = useMemo(() => {
    return tokenPrices?.find(t => t.symbol === selectedToken);
  }, [tokenPrices, selectedToken]);

  // Filter and sort tokens - only for the list, not affecting the graph
  const filteredAndSortedTokens = useMemo(() => {
    if (!tokenPrices) return [];

    let filtered = tokenPrices;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = tokenPrices.filter(token => 
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((a, b) => {
      const changeA = parseFloat(a.priceChange24h);
      const changeB = parseFloat(b.priceChange24h);
      return sortOrder === "asc" ? changeA - changeB : changeB - changeA;
    });
  }, [tokenPrices, searchQuery, sortOrder]);

  return (
    <div>
      <div className="space-y-6">
        {/* Chart and Token List Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          {/* Price Chart */}
          <div className="lg:col-span-4 bg-neutral-800 rounded-xl border border-neutral-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold">{selectedToken}/USD</h2>
                {selectedTokenData && (
                  <div className="flex items-center mt-1 text-sm text-neutral-400">
                    <span className="font-mono mr-3">
                      ${parseFloat(selectedTokenData.price).toFixed(2)}
                    </span>
                    <span className={`flex items-center ${
                      parseFloat(selectedTokenData.priceChange24h) >= 0 
                        ? 'text-success' 
                        : 'text-error'
                    }`}>
                      {formatPriceChange(selectedTokenData.priceChange24h)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="h-[400px] relative">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-800/50">
                  <Skeleton className="w-full h-full" />
                </div>
              ) : (
                <PriceChart tokenSymbol={selectedToken} />
              )}
            </div>
          </div>

          {/* Cryptocurrency List */}
          <div className="lg:col-span-3 bg-neutral-800 rounded-xl border border-neutral-700 p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Cryptocurrencies</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="text-neutral-400 hover:text-white"
                >
                  {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-neutral-700 border-neutral-600"
                />
              </div>
            </div>

            <ScrollArea className="h-[360px] pr-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[100px]" />
                        <Skeleton className="h-4 w-[70px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAndSortedTokens.map((token) => (
                    <button
                      key={token.id}
                      onClick={() => setSelectedToken(token.symbol)}
                      className={`w-full flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${
                        selectedToken === token.symbol 
                          ? 'bg-primary bg-opacity-20 border border-primary/30' 
                          : 'bg-neutral-700 hover:bg-neutral-600 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center overflow-hidden mr-3">
                          <img src={token.logoUrl} alt={token.symbol} className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <div className={`font-medium ${selectedToken === token.symbol ? 'text-primary-light' : ''}`}>
                            {token.symbol}
                          </div>
                          <div className="text-sm text-neutral-400">{token.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono mb-1">${parseFloat(token.price).toFixed(2)}</div>
                        <div className={`text-sm flex items-center justify-end ${
                          parseFloat(token.priceChange24h) >= 0 ? 'text-success' : 'text-error'
                        }`}>
                          {parseFloat(token.priceChange24h) >= 0 ? 
                            <ChevronUp className="w-4 h-4 mr-1" /> : 
                            <ChevronDown className="w-4 h-4 mr-1" />
                          }
                          {formatPriceChange(token.priceChange24h)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Trading Interface */}
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-6">
          <Tabs defaultValue="swap" className="space-y-6">
            <div className="border-b border-neutral-700">
              <TabsList className="border-b-0 bg-transparent">
                <TabsTrigger 
                  value="swap" 
                  className="px-8 py-4 font-medium text-neutral-400 data-[state=active]:text-primary-light data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  Token Swap
                </TabsTrigger>
                <TabsTrigger 
                  value="trade" 
                  className="px-8 py-4 font-medium text-neutral-400 data-[state=active]:text-primary-light data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  Spot Trading
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="swap">
              <SwapInterface />
            </TabsContent>

            <TabsContent value="trade">
              <SpotTradingInterface />
            </TabsContent>
          </Tabs>
        </div>

        {/* Recent Transactions */}
        <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Recent Transactions</h3>
            <Link href="/history">
              <Button variant="ghost" className="text-neutral-400 hover:text-white" size="sm">
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {transactions && transactions.length > 0 ? (
              transactions.slice(0, 3).map((transaction: any) => (
                <TransactionHistoryItem key={transaction.id} transaction={transaction} />
              ))
            ) : address ? (
              <div className="text-center py-8 text-neutral-400">
                No transactions found
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400">
                Connect your wallet to view transactions
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;