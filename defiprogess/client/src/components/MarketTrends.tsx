import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpCircle, ArrowDownRight } from "lucide-react";
import { TokenPrice } from "@/lib/api";

const MarketTrends = () => {
  const [period, setPeriod] = useState("24h");

  const { data: tokenPrices, isLoading, error } = useQuery<TokenPrice[]>({
    queryKey: ['/api/prices'],
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Market Trends</h2>
        <Tabs defaultValue="gainers">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="gainers">Top Gainers</TabsTrigger>
              <TabsTrigger value="losers">Top Losers</TabsTrigger>
            </TabsList>
            <div className="flex">
              <Skeleton className="h-8 w-12 rounded-md" />
              <Skeleton className="h-8 w-12 rounded-md ml-2" />
              <Skeleton className="h-8 w-12 rounded-md ml-2" />
            </div>
          </div>
          <TabsContent value="gainers">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="ml-3 flex-1">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-3 w-12 ml-auto" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="losers">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="ml-3 flex-1">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-3 w-12 ml-auto" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (error || !tokenPrices || tokenPrices.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Market Trends</h2>
        <div className="p-4 bg-neutral-800 rounded-xl border border-red-800 text-red-400">
          <p>Unable to load market data. {error ? (error as Error).message : "Please try again later."}</p>
        </div>
      </div>
    );
  }

  // Sort by price change
  const sortedByChange = [...tokenPrices].sort((a, b) => 
    parseFloat(b.priceChange24h) - parseFloat(a.priceChange24h)
  );

  // Top gainers (positive change)
  const gainers = sortedByChange
    .filter(token => parseFloat(token.priceChange24h) > 0)
    .slice(0, 3);

  // Top losers (negative change)
  const losers = [...sortedByChange]
    .filter(token => parseFloat(token.priceChange24h) < 0)
    .slice(0, 3);

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "$0.00";

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatPercentage = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0.00%";

    return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">Market Trends</h2>
      <Tabs defaultValue="gainers">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="gainers">Top Gainers</TabsTrigger>
            <TabsTrigger value="losers">Top Losers</TabsTrigger>
          </TabsList>
          <div className="flex">
            <Button
              variant={period === "24h" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setPeriod("24h")}
              className="text-xs"
            >
              24H
            </Button>
            <Button
              variant={period === "7d" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setPeriod("7d")}
              className="text-xs ml-2"
              disabled={true}
            >
              7D
            </Button>
            <Button
              variant={period === "30d" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setPeriod("30d")}
              className="text-xs ml-2"
              disabled={true}
            >
              30D
            </Button>
          </div>
        </div>
        <TabsContent value="gainers">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {gainers.length > 0 ? (
              gainers.map((token) => (
                <Card key={token.id} className="p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center overflow-hidden">
                      {token.logoUrl ? (
                        <img src={token.logoUrl} alt={token.name} className="w-6 h-6" />
                      ) : (
                        <span className="text-xs font-bold">{token.symbol.substring(0, 2)}</span>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="font-medium">{token.symbol}</div>
                      <div className="text-xs text-neutral-400">{token.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{formatCurrency(token.price)}</div>
                      <div className="text-xs text-success flex items-center justify-end">
                        <ArrowUpCircle className="h-3 w-3 mr-1" />
                        {formatPercentage(token.priceChange24h)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-3 p-4 text-center text-neutral-400">
                No gainers found in the current period
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="losers">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {losers.length > 0 ? (
              losers.map((token) => (
                <Card key={token.id} className="p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center overflow-hidden">
                      {token.logoUrl ? (
                        <img src={token.logoUrl} alt={token.name} className="w-6 h-6" />
                      ) : (
                        <span className="text-xs font-bold">{token.symbol.substring(0, 2)}</span>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="font-medium">{token.symbol}</div>
                      <div className="text-xs text-neutral-400">{token.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">{formatCurrency(token.price)}</div>
                      <div className="text-xs text-error flex items-center justify-end">
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                        {formatPercentage(token.priceChange24h)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-3 p-4 text-center text-neutral-400">
                No losers found in the current period
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketTrends;