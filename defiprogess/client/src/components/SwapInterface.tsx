import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TokenSelector from './TokenSelector';
import { 
  fetchTokens, 
  fetchTokenPrices, 
  swapTokens, 
  formatTokenAmount, 
  formatUsdValue, 
  Portfolio, 
  PortfolioAsset, 
  Token
} from '@/lib/api';
import { useWeb3 } from '@/lib/web3';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { ArrowDownUp, Loader2 } from 'lucide-react';

const SwapInterface = () => {
  const [fromTokenId, setFromTokenId] = useState<number | undefined>();
  const [toTokenId, setToTokenId] = useState<number | undefined>();
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();

  // Data queries
  const { data: tokens } = useQuery<Token[]>({
    queryKey: ['/api/tokens']
  });

  const { data: tokenPrices } = useQuery<{
    id: number;
    symbol: string;
    name: string;
    logoUrl: string;
    price: string;
    priceChange24h: string;
    volume24h?: string;
    marketCap?: string;
  }[]>({
    queryKey: ['/api/prices'],
    refetchInterval: 30000
  });

  // Get portfolio data for balances
  const { data: portfolio } = useQuery<Portfolio>({
    queryKey: ['/api/portfolio', address],
    enabled: !!address && isConnected
  });

  // Swap mutation
  const swapMutation = useMutation({
    mutationFn: swapTokens,
    onSuccess: (data) => {
      toast({
        title: 'Swap Initiated',
        description: `Swapping ${data.fromAmount} ${data.fromToken.symbol} to ${data.toAmount} ${data.toToken.symbol}`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Reset form
      setFromAmount('');
      setToAmount('');
    },
    onError: (error) => {
      toast({
        title: 'Swap Failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive'
      });
    }
  });

  // Helper functions
  const getTokenById = (id?: number) => {
    if (!id || !tokens) return null;
    return tokens.find((t: any) => t.id === id) || null;
  };

  const getTokenPrice = (id?: number) => {
    if (!id || !tokenPrices) return null;
    const price = tokenPrices.find((p: any) => p.id === id);
    return price ? parseFloat(price.price) : null;
  };

  const calculateToAmount = () => {
    if (!fromAmount || !fromTokenId || !toTokenId) {
      setToAmount('');
      return;
    }

    const fromPrice = getTokenPrice(fromTokenId);
    const toPrice = getTokenPrice(toTokenId);

    if (!fromPrice || !toPrice) {
      setToAmount('');
      return;
    }

    const exchangeRate = toPrice / fromPrice;
    const calculatedAmount = parseFloat(fromAmount) * exchangeRate;
    setToAmount(isNaN(calculatedAmount) ? '' : calculatedAmount.toString());
  };

  // Event handlers
  const handleSwapTokens = () => {
    const temp = fromTokenId;
    setFromTokenId(toTokenId);
    setToTokenId(temp);
    setFromAmount(toAmount);
  };

  const handleMaxClick = () => {
    // Use the portfolio data that's already available from the query
    const fromToken = getTokenById(fromTokenId);
    
    // Set amount to the current balance, or use sensible defaults
    if (fromToken) {
      if (portfolio?.assets) {
        const asset = portfolio.assets.find((a: PortfolioAsset) => a.token.id === fromTokenId);
        if (asset) {
          setFromAmount(asset.balance);
          return;
        }
      }
      
      // Use sensible defaults for tokens not in portfolio or when portfolio not available
      if (fromToken.symbol === 'ETH') {
        setFromAmount('0.01');
      } else if (fromToken.symbol === 'USDT') {
        setFromAmount('10');
      } else {
        setFromAmount('1');
      }
    }
  };

  const handleSwap = () => {
    if (!isConnected) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet to swap tokens',
        variant: 'destructive'
      });
      return;
    }

    if (!fromTokenId || !toTokenId || !fromAmount || parseFloat(fromAmount) <= 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid amount and select tokens',
        variant: 'destructive'
      });
      return;
    }

    swapMutation.mutate({
      fromTokenId,
      toTokenId,
      fromAmount,
      walletAddress: address || undefined
    });
  };
  
  // Side effects
  useEffect(() => {
    calculateToAmount();
  }, [fromAmount, fromTokenId, toTokenId, tokenPrices]);

  // Computed values
  const fromTokenUsdValue = fromAmount && fromTokenId ? 
    parseFloat(fromAmount) * (getTokenPrice(fromTokenId) || 0) : 0;
  
  const toTokenUsdValue = toAmount && toTokenId ? 
    parseFloat(toAmount) * (getTokenPrice(toTokenId) || 0) : 0;
  
  const fromToken = getTokenById(fromTokenId);
  const toToken = getTokenById(toTokenId);
  
  const rate = fromTokenId && toTokenId ? 
    getTokenPrice(toTokenId)! / getTokenPrice(fromTokenId)! : 0;
  
  const fromTokenBalance = (() => {
    if (!isConnected || !portfolio?.assets || !fromTokenId) return '0';
    const asset = portfolio.assets.find((a: PortfolioAsset) => a.token.id === fromTokenId);
    return asset ? asset.balance : '0';
  })();
  
  const toTokenBalance = (() => {
    if (!isConnected || !portfolio?.assets || !toTokenId) return '0';
    const asset = portfolio.assets.find((a: PortfolioAsset) => a.token.id === toTokenId);
    return asset ? asset.balance : '0';
  })();
  
  return (
    <div className="p-4">
      <div className="mb-4">
        {/* From Token Section */}
        <div className="bg-neutral-700 rounded-xl p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-neutral-400">You Pay</label>
            <div className="text-sm text-neutral-400">
              Balance: <span>{fromTokenBalance} {fromToken?.symbol || ''}</span>
            </div>
          </div>
          
          <div className="flex items-center">
            <Input
              type="number"
              placeholder="0.0"
              className="w-full text-xl bg-transparent border-none outline-none font-mono p-0 focus:ring-0"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
            />
            <TokenSelector
              selectedTokenId={fromTokenId}
              onTokenSelect={(token) => setFromTokenId(token.id)}
              excludeTokenIds={toTokenId ? [toTokenId] : []}
            />
          </div>
          
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-neutral-400">
              {fromAmount && fromTokenId ? formatUsdValue(fromTokenUsdValue) : '$0.00'}
            </span>
            <button 
              className="text-primary-light hover:underline"
              onClick={handleMaxClick}
            >
              Max
            </button>
          </div>
        </div>
        
        {/* Swap Button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button 
            className="w-10 h-10 rounded-full bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 flex items-center justify-center transition-colors"
            onClick={handleSwapTokens}
          >
            <ArrowDownUp className="h-4 w-4 text-neutral-300" />
          </button>
        </div>
        
        {/* To Token Section */}
        <div className="bg-neutral-700 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-neutral-400">You Receive</label>
            <div className="text-sm text-neutral-400">
              Balance: <span>{toTokenBalance} {toToken?.symbol || ''}</span>
            </div>
          </div>
          
          <div className="flex items-center">
            <Input
              type="number"
              placeholder="0.0"
              className="w-full text-xl bg-transparent border-none outline-none font-mono p-0 focus:ring-0"
              value={toAmount}
              readOnly
            />
            <TokenSelector
              selectedTokenId={toTokenId}
              onTokenSelect={(token) => setToTokenId(token.id)}
              excludeTokenIds={fromTokenId ? [fromTokenId] : []}
            />
          </div>
          
          <div className="text-sm text-neutral-400 mt-2">
            {toAmount && toTokenId ? formatUsdValue(toTokenUsdValue) : '$0.00'}
          </div>
        </div>
      </div>
      
      {/* Swap Details */}
      {fromTokenId && toTokenId && fromAmount && parseFloat(fromAmount) > 0 && (
        <div className="bg-neutral-700 bg-opacity-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-neutral-400">Rate</span>
            <span className="text-sm">
              1 {fromToken?.symbol} = {formatTokenAmount(rate)} {toToken?.symbol}
            </span>
          </div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-neutral-400">Price Impact</span>
            <span className="text-sm text-success">0.05%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Network Fee</span>
            <span className="text-sm">$12.34</span>
          </div>
        </div>
      )}
      
      {/* Swap Button */}
      <Button 
        className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-colors"
        onClick={handleSwap}
        disabled={swapMutation.isPending || !fromAmount || !fromTokenId || !toTokenId || parseFloat(fromAmount) <= 0}
      >
        {swapMutation.isPending ? (
          <div className="flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
            Swapping...
          </div>
        ) : isConnected ? 'Swap Tokens' : 'Connect Wallet to Swap'}
      </Button>
    </div>
  );
};

export default SwapInterface;