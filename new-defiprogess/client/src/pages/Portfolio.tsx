import { useState, useEffect } from "react";
import { useWeb3 } from "@/lib/web3";
import { useQuery } from "@tanstack/react-query";
import { fetchPortfolio, formatTokenAmount, formatUsdValue, PortfolioAsset, Portfolio as PortfolioType } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import WalletConnectModal from "@/components/WalletConnectModal";
import { ethers } from "ethers";

const COLORS = ['#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE', '#EEF2FF'];

const Portfolio = () => {
  const { address, isConnected, chainId, provider } = useWeb3();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [localAssets, setLocalAssets] = useState<any[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  
  // Use API for mainnet, fetch directly for testnet (Hardhat/Ganache)
  const isTestnet = chainId === 1337 || chainId === 31337; // Ganache (1337) or Hardhat (31337) network chain ID
  
  const { data: portfolio, isLoading: isApiLoading } = useQuery({
    queryKey: address ? [`/api/portfolio/${address}`] : null,
    enabled: !!address && isConnected && !isTestnet
  });
  
  // For Hardhat/Ganache, fetch assets directly from the blockchain
  useEffect(() => {
    const fetchLocalAssets = async () => {
      if (!isConnected || !address || !provider || !isTestnet) {
        setLocalAssets([]);
        return;
      }
      
      setIsLocalLoading(true);
      
      try {
        // Fetch ETH balance
        const ethBalance = await provider.getBalance(address);
        const formattedEthBalance = ethers.formatEther(ethBalance);
        
        // Fetch all tokens from API
        const tokensResponse = await fetch('/api/tokens');
        const tokens = await tokensResponse.json();
        
        // Fetch token prices from API
        const pricesResponse = await fetch('/api/prices');
        const prices = await pricesResponse.json();
        
        const assets = [];
        
        // Add ETH
        const ethToken = tokens.find((t: any) => t.symbol === 'ETH');
        const ethPrice = prices.find((p: any) => p.symbol === 'ETH');
        
        if (ethToken && ethPrice) {
          assets.push({
            id: 1,
            token: ethToken,
            balance: formattedEthBalance,
            value: (parseFloat(formattedEthBalance) * parseFloat(ethPrice.price)).toString(),
            price: ethPrice.price
          });
        }
        
        // Add other tokens with contract addresses
        for (const token of tokens) {
          if (token.symbol !== 'ETH' && token.contractAddress && token.contractAddress !== '0x') {
            try {
              const tokenContract = new ethers.Contract(
                token.contractAddress,
                ["function balanceOf(address) view returns (uint256)"],
                provider
              );
              
              const balance = await tokenContract.balanceOf(address);
              const decimals = token.decimals || 18;
              const formattedBalance = ethers.formatUnits(balance, decimals);
              
              const tokenPrice = prices.find((p: any) => p.symbol === token.symbol);
              
              if (parseFloat(formattedBalance) > 0 && tokenPrice) {
                assets.push({
                  id: token.id,
                  token: token,
                  balance: formattedBalance,
                  value: (parseFloat(formattedBalance) * parseFloat(tokenPrice.price)).toString(),
                  price: tokenPrice.price
                });
              }
            } catch (error) {
              console.error(`Error fetching balance for ${token.symbol}:`, error);
            }
          }
        }
        
        setLocalAssets(assets);
      } catch (error) {
        console.error("Error fetching local assets:", error);
      } finally {
        setIsLocalLoading(false);
      }
    };
    
    fetchLocalAssets();
  }, [isConnected, address, provider, isTestnet]);
  
  // Combine loading states
  const isLoading = isTestnet ? isLocalLoading : isApiLoading;

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 mb-6">
          <i className="ri-wallet-3-line text-3xl"></i>
        </div>
        <h2 className="text-2xl font-semibold mb-3">Wallet Not Connected</h2>
        <p className="text-neutral-400 max-w-md text-center mb-6">
          Connect your wallet to view your portfolio, track your assets, and manage your DeFi investments.
        </p>
        <Button 
          className="bg-primary hover:bg-primary-dark"
          onClick={() => setIsWalletModalOpen(true)}
        >
          Connect Wallet
        </Button>
        
        <WalletConnectModal 
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-6 w-60" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array(4).fill(0).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Select assets based on network (testnet or mainnet)
  const assets = isTestnet ? localAssets : (portfolio?.assets || []);
  
  // Create portfolio data structure for testnet
  const portfolioData = isTestnet 
    ? { 
        walletAddress: address || '', 
        totalValue: localAssets.reduce((sum, asset) => sum + parseFloat(asset.value), 0).toString(),
        assets: localAssets 
      } 
    : portfolio;
  
  // Prepare data for pie chart
  const chartData = assets.map(asset => ({
    name: asset.token.symbol,
    value: parseFloat(asset.value)
  }));

  // Calculate stats
  const totalTokens = assets.length;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Your Portfolio</h1>
        <div className="text-sm text-neutral-400">
          <span className="mr-2">Connected: </span>
          <span className="bg-neutral-700 px-3 py-1 rounded-full">
            {address.substring(0, 6)}...{address.substring(address.length - 4)}
          </span>
        </div>
      </div>
      
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-neutral-800 border-neutral-700">
          <CardContent className="p-6">
            <div className="text-neutral-400 text-sm mb-1">Total Value</div>
            <div className="text-2xl font-medium">{formatUsdValue(portfolioData?.totalValue || 0)}</div>
            <div className="text-primary-light text-sm flex items-center mt-1">
              <i className="ri-arrow-right-up-line mr-1"></i> +5.2% today
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-neutral-800 border-neutral-700">
          <CardContent className="p-6">
            <div className="text-neutral-400 text-sm mb-1">Number of Assets</div>
            <div className="text-2xl font-medium">{totalTokens}</div>
            <div className="text-neutral-400 text-sm mt-1">
              Tokens in your portfolio
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-neutral-800 border-neutral-700">
          <CardContent className="p-6">
            <div className="text-neutral-400 text-sm mb-1">Best Performer</div>
            <div className="text-2xl font-medium">
              {assets.length ? assets[0].token.symbol : '--'}
            </div>
            <div className="text-success text-sm flex items-center mt-1">
              <i className="ri-arrow-right-up-line mr-1"></i> +12.8% 24h
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-neutral-800 border-neutral-700">
          <CardContent className="p-6">
            <div className="text-neutral-400 text-sm mb-1">Worst Performer</div>
            <div className="text-2xl font-medium">
              {assets.length > 1 ? assets[assets.length - 1].token.symbol : '--'}
            </div>
            <div className="text-error text-sm flex items-center mt-1">
              <i className="ri-arrow-right-down-line mr-1"></i> -3.5% 24h
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assets Table */}
        <Card className="lg:col-span-2 bg-neutral-800 border-neutral-700">
          <CardHeader>
            <CardTitle>Your Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="bg-neutral-700 mb-4">
                <TabsTrigger value="all">All Assets</TabsTrigger>
                <TabsTrigger value="tokens">Tokens</TabsTrigger>
                <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-3">
                {assets.map((asset) => (
                  <div key={asset.id} className="flex items-center p-3 bg-neutral-700 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center overflow-hidden mr-4">
                      <img 
                        src={asset.token.logoUrl} 
                        alt={asset.token.symbol} 
                        className="w-6 h-6"
                        onError={(e) => {
                          e.currentTarget.src = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png`;
                          e.currentTarget.onerror = null;
                        }} 
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-lg">{asset.token.name}</h4>
                          <div className="text-sm text-neutral-400">{asset.token.symbol}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium font-mono text-lg">{formatTokenAmount(asset.balance)} {asset.token.symbol}</div>
                          <div className="text-sm text-neutral-400">{formatUsdValue(asset.value)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {assets.length === 0 && (
                  <div className="text-center py-6 text-neutral-400">
                    <i className="ri-file-list-3-line text-3xl mb-2"></i>
                    <p>No assets found in your portfolio</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="tokens" className="text-center py-6 text-neutral-400">
                <i className="ri-coins-line text-3xl mb-2"></i>
                <p>Token breakdown coming soon</p>
              </TabsContent>
              
              <TabsContent value="liquidity" className="text-center py-6 text-neutral-400">
                <i className="ri-water-flash-line text-3xl mb-2"></i>
                <p>Liquidity positions coming soon</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Portfolio Allocation */}
        <Card className="bg-neutral-800 border-neutral-700 h-full">
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatUsdValue(value as number)}
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-6 text-neutral-400 h-64 flex flex-col items-center justify-center">
                <i className="ri-pie-chart-line text-3xl mb-2"></i>
                <p>Not enough data to display allocation</p>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex flex-col space-y-2 mt-6">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="bg-neutral-700 hover:bg-neutral-600 border-transparent text-white">
                    <i className="ri-download-line mr-2"></i> Export Portfolio Data
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-neutral-800 border-neutral-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Export Portfolio</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-neutral-400 mb-4">Export your portfolio data in the following formats:</p>
                    <div className="flex flex-col space-y-2">
                      <Button variant="outline" className="justify-start bg-neutral-700 hover:bg-neutral-600 border-transparent text-white">
                        <i className="ri-file-excel-line mr-2"></i> CSV Format
                      </Button>
                      <Button variant="outline" className="justify-start bg-neutral-700 hover:bg-neutral-600 border-transparent text-white">
                        <i className="ri-file-pdf-line mr-2"></i> PDF Report
                      </Button>
                      <Button variant="outline" className="justify-start bg-neutral-700 hover:bg-neutral-600 border-transparent text-white">
                        <i className="ri-file-text-line mr-2"></i> JSON Format
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" className="bg-neutral-700 hover:bg-neutral-600 border-transparent text-white">
                <i className="ri-share-line mr-2"></i> Share Portfolio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Portfolio;
