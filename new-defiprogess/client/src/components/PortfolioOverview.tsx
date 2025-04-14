import { useQuery } from '@tanstack/react-query';
import { useWeb3 } from '@/lib/web3';
import { fetchPortfolio, formatTokenAmount, formatUsdValue } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

const PortfolioOverview = () => {
  const { address, isConnected } = useWeb3();
  
  const { data: portfolio, isLoading, error } = useQuery({
    queryKey: address ? [`/api/portfolio/${address}`] : null,
    refetchInterval: 60000, // Refresh every minute
    enabled: !!address && isConnected
  });

  if (!isConnected || !address) {
    return (
      <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-400 mx-auto mb-4">
            <i className="ri-wallet-3-line text-2xl"></i>
          </div>
          <h3 className="font-medium text-lg mb-2">Wallet Not Connected</h3>
          <p className="text-neutral-400 text-sm">
            Connect your wallet to view your portfolio
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-20" />
        </div>
        
        <div className="mb-4">
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        
        <div className="space-y-3">
          {Array(4).fill(0).map((_, index) => (
            <div key={index} className="flex items-center p-3 bg-neutral-700 rounded-lg">
              <Skeleton className="w-8 h-8 rounded-full mr-3" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neutral-800 rounded-xl border border-red-800 p-4 text-red-400">
        <p>Error loading portfolio data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 rounded-xl border border-neutral-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Your Portfolio</h3>
        <div className="flex items-center">
          <button className="text-sm text-neutral-400 hover:text-white">
            <i className="ri-eye-off-line mr-1"></i>
            Hide
          </button>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="text-neutral-400 text-sm">Total Balance</div>
          {/* Only show change percentage if it's from real data */}
          {portfolio?.todayChange && (
            <div className={`text-xs font-medium ${parseFloat(portfolio.todayChange) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {parseFloat(portfolio.todayChange) >= 0 ? '+' : ''}{portfolio.todayChange}% today
            </div>
          )}
        </div>
        <div className="text-2xl font-medium mb-1">
          {formatUsdValue(portfolio?.totalValue || 0)}
        </div>
        <div className="w-full h-2 bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary-light" 
            style={{ width: portfolio?.totalValue && parseFloat(portfolio.totalValue) > 0 ? 
              Math.min(parseFloat(portfolio.totalValue) / 100, 100) + '%' : '0%' }}>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {portfolio?.assets.map((asset) => (
          <div key={asset.id} className="flex items-center p-3 bg-neutral-700 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-neutral-600 flex items-center justify-center overflow-hidden mr-3">
              <img src={asset.token.logoUrl} alt={asset.token.symbol} className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{asset.token.name}</h4>
                  <div className="text-sm text-neutral-400">{asset.token.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium font-mono">{formatTokenAmount(asset.balance)} {asset.token.symbol}</div>
                  <div className="text-sm text-neutral-400">{formatUsdValue(asset.value)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {portfolio?.assets.length === 0 && (
          <div className="text-center py-4 text-neutral-400">
            No assets found in your portfolio
          </div>
        )}
      </div>
    </div>
  );
};

export default PortfolioOverview;
