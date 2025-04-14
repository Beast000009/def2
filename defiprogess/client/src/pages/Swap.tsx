import { useState } from "react";
import PriceChart from "@/components/PriceChart";
import SwapInterface from "@/components/SwapInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchTokens } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const Swap = () => {
  const [selectedPair, setSelectedPair] = useState<string>("ETH/USDT");
  
  const { data: tokens } = useQuery({
    queryKey: ['/api/tokens']
  });
  
  // Extract token symbols for chart
  const [baseToken, quoteToken] = selectedPair.split('/');
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Token Swap</h1>
        <div className="flex items-center text-sm text-neutral-400">
          <i className="ri-information-line mr-1"></i>
          <span>Swap tokens at the best rates</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Price Chart */}
          <PriceChart tokenSymbol={baseToken} baseTokenSymbol={quoteToken} />
          
          {/* Swap Types */}
          <Card className="bg-neutral-800 border-neutral-700">
            <CardHeader className="pb-0">
              <CardTitle className="text-lg">Swap Tokens</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="market">
                <div className="mb-4">
                  <TabsList className="bg-neutral-700">
                    <TabsTrigger value="market">Market Swap</TabsTrigger>
                    <TabsTrigger value="limit">Limit Swap</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="market">
                  <SwapInterface />
                </TabsContent>
                
                <TabsContent value="limit">
                  <div className="p-6 text-center text-neutral-400">
                    <i className="ri-timer-line text-4xl mb-2"></i>
                    <h3 className="text-lg font-medium mb-2">Limit Swaps Coming Soon</h3>
                    <p>Set target prices for automatic token swaps</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          {/* Popular Pairs */}
          <Card className="bg-neutral-800 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-lg">Popular Pairs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { pair: "ETH/USDT", change: "+2.45%" },
                { pair: "BTC/USDT", change: "+1.87%" },
                { pair: "SOL/USDT", change: "-0.65%" },
                { pair: "ETH/BTC", change: "+0.58%" }
              ].map((item) => (
                <button 
                  key={item.pair}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    selectedPair === item.pair ? 'bg-primary bg-opacity-20' : 'bg-neutral-700 hover:bg-neutral-600'
                  }`}
                  onClick={() => setSelectedPair(item.pair)}
                >
                  <span className={selectedPair === item.pair ? 'text-primary-light font-medium' : 'text-white'}>
                    {item.pair}
                  </span>
                  <span className={parseFloat(item.change) >= 0 ? 'text-success' : 'text-error'}>
                    {item.change}
                  </span>
                </button>
              ))}
            </CardContent>
          </Card>
          
          {/* Swap Features */}
          <Card className="bg-neutral-800 border-neutral-700">
            <CardHeader>
              <CardTitle className="text-lg">Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-primary bg-opacity-20 flex items-center justify-center text-primary-light mr-3 mt-0.5">
                  <i className="ri-exchange-dollar-line"></i>
                </div>
                <div>
                  <h3 className="font-medium">Best Rates</h3>
                  <p className="text-sm text-neutral-400">
                    Automated price routing to get you the best exchange rates
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-primary bg-opacity-20 flex items-center justify-center text-primary-light mr-3 mt-0.5">
                  <i className="ri-shield-check-line"></i>
                </div>
                <div>
                  <h3 className="font-medium">Secure Transactions</h3>
                  <p className="text-sm text-neutral-400">
                    All transactions are verified and secured on the blockchain
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-primary bg-opacity-20 flex items-center justify-center text-primary-light mr-3 mt-0.5">
                  <i className="ri-timer-flash-line"></i>
                </div>
                <div>
                  <h3 className="font-medium">Fast Settlement</h3>
                  <p className="text-sm text-neutral-400">
                    Quick transaction processing and immediate settlement
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Swap;
