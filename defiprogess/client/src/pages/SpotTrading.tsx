import { useState } from "react";
import PriceChart from "@/components/PriceChart";
import SpotTradingInterface from "@/components/SpotTradingInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarketTrends from "@/components/MarketTrends";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { fetchTokenPrices, formatTokenAmount, formatPriceChange } from "@/lib/api";

const SpotTrading = () => {
  const [selectedPair, setSelectedPair] = useState<string>("ETH/USDT");
  const [activeTab, setActiveTab] = useState<string>("buy-sell");
  
  const { data: tokenPrices } = useQuery({
    queryKey: ['/api/prices'],
    refetchInterval: 30000
  });
  
  // Extract token symbols for chart
  const [baseToken, quoteToken] = selectedPair.split('/');
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Spot Trading</h1>
        <div className="flex items-center text-sm text-neutral-400">
          <i className="ri-information-line mr-1"></i>
          <span>Trade tokens at market or limit prices</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Price Chart */}
          <PriceChart tokenSymbol={baseToken} baseTokenSymbol={quoteToken} />
          
          {/* Trading Interface */}
          <Card className="bg-neutral-800 border-neutral-700">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{selectedPair} Trading</CardTitle>
                  <TabsList className="bg-neutral-700">
                    <TabsTrigger value="buy-sell">Buy/Sell</TabsTrigger>
                    <TabsTrigger value="order-book">Order Book</TabsTrigger>
                    <TabsTrigger value="market-trades">Market Trades</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              <CardContent>
                <TabsContent value="buy-sell" className="pt-4">
                  <SpotTradingInterface />
                </TabsContent>
                
                <TabsContent value="order-book">
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    {/* Asks */}
                    <div>
                      <h3 className="text-sm font-medium text-neutral-400 mb-2">Asks</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-neutral-400">Price</TableHead>
                            <TableHead className="text-neutral-400 text-right">Amount</TableHead>
                            <TableHead className="text-neutral-400 text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            { price: 3248.75, amount: 0.42, total: 1364.48 },
                            { price: 3248.50, amount: 1.25, total: 4060.63 },
                            { price: 3248.25, amount: 0.88, total: 2858.46 },
                            { price: 3248.00, amount: 2.54, total: 8249.92 },
                            { price: 3247.75, amount: 0.63, total: 2046.08 }
                          ].map((order, i) => (
                            <TableRow key={i} className="hover:bg-neutral-700 bg-transparent border-b border-neutral-700">
                              <TableCell className="text-error">{order.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{order.amount.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{order.total.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Bids */}
                    <div>
                      <h3 className="text-sm font-medium text-neutral-400 mb-2">Bids</h3>
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-neutral-400">Price</TableHead>
                            <TableHead className="text-neutral-400 text-right">Amount</TableHead>
                            <TableHead className="text-neutral-400 text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            { price: 3247.50, amount: 1.52, total: 4936.20 },
                            { price: 3247.25, amount: 0.75, total: 2435.44 },
                            { price: 3247.00, amount: 3.24, total: 10520.28 },
                            { price: 3246.75, amount: 0.98, total: 3181.82 },
                            { price: 3246.50, amount: 1.35, total: 4382.78 }
                          ].map((order, i) => (
                            <TableRow key={i} className="hover:bg-neutral-700 bg-transparent border-b border-neutral-700">
                              <TableCell className="text-success">{order.price.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{order.amount.toFixed(2)}</TableCell>
                              <TableCell className="text-right">{order.total.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="market-trades">
                  <div className="pt-4">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-neutral-400">Price</TableHead>
                          <TableHead className="text-neutral-400 text-right">Amount</TableHead>
                          <TableHead className="text-neutral-400 text-right">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          { price: 3247.80, amount: 0.42, type: 'buy', time: '12:45:32' },
                          { price: 3248.25, amount: 1.05, type: 'sell', time: '12:45:28' },
                          { price: 3247.50, amount: 0.78, type: 'buy', time: '12:45:15' },
                          { price: 3247.75, amount: 2.34, type: 'buy', time: '12:44:58' },
                          { price: 3248.00, amount: 0.53, type: 'sell', time: '12:44:45' },
                          { price: 3248.50, amount: 1.22, type: 'sell', time: '12:44:32' },
                          { price: 3247.25, amount: 0.87, type: 'buy', time: '12:44:18' },
                          { price: 3247.00, amount: 1.45, type: 'buy', time: '12:44:05' }
                        ].map((trade, i) => (
                          <TableRow key={i} className="hover:bg-neutral-700 bg-transparent border-b border-neutral-700">
                            <TableCell className={trade.type === 'buy' ? 'text-success' : 'text-error'}>
                              {trade.price.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">{trade.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{trade.time}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
        
        <div className="space-y-6">
          {/* Trading Pairs */}
          <Card className="bg-neutral-800 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-lg">Trading Pairs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Tabs defaultValue="favorites">
                <TabsList className="w-full bg-neutral-700 mb-3">
                  <TabsTrigger value="favorites" className="flex-1">Favorites</TabsTrigger>
                  <TabsTrigger value="usdt" className="flex-1">USDT</TabsTrigger>
                  <TabsTrigger value="btc" className="flex-1">BTC</TabsTrigger>
                </TabsList>
                
                <div className="space-y-2">
                  {tokenPrices?.slice(0, 5).map((token: any) => (
                    <button 
                      key={token.id}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        selectedPair === `${token.symbol}/USDT` ? 'bg-primary bg-opacity-20' : 'bg-neutral-700 hover:bg-neutral-600'
                      }`}
                      onClick={() => setSelectedPair(`${token.symbol}/USDT`)}
                    >
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-neutral-600 flex items-center justify-center overflow-hidden mr-2">
                          <img src={token.logoUrl} alt={token.symbol} className="w-4 h-4" />
                        </div>
                        <span className={selectedPair === `${token.symbol}/USDT` ? 'text-primary-light font-medium' : 'text-white'}>
                          {token.symbol}/USDT
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">{formatTokenAmount(token.price)}</div>
                        <div className={parseFloat(token.priceChange24h) >= 0 ? 'text-success text-xs' : 'text-error text-xs'}>
                          {formatPriceChange(token.priceChange24h)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Market Trends */}
          <MarketTrends />
        </div>
      </div>
    </div>
  );
};

export default SpotTrading;
