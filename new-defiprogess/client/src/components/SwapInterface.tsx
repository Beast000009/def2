import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TokenSelector from './TokenSelector';
import { ethers } from 'ethers';
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
import { ArrowDownUp, Loader2, AlertCircle } from 'lucide-react';

const SwapInterface = () => {
  const [fromTokenId, setFromTokenId] = useState<number | undefined>();
  const [toTokenId, setToTokenId] = useState<number | undefined>();
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const { address, isConnected, provider, signer, executeSwap, getSwapEstimate } = useWeb3();
  const { toast } = useToast();
  const [isSwapping, setIsSwapping] = useState(false);

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
  
  // Direct blockchain swap function
  const executeBlockchainSwap = async () => {
    if (!fromToken || !toToken || !fromAmount || !signer) return;
    
    try {
      setIsSwapping(true);
      
      // Set a minimum output amount (slippage of 1%)
      const minOutputAmount = (parseFloat(toAmount) * 0.99).toString();
      
      // Get contract addresses from token data
      const fromTokenAddress = fromToken.contractAddress || ethers.ZeroAddress;
      const toTokenAddress = toToken.contractAddress || ethers.ZeroAddress;
      
      // Execute the swap directly using web3Context
      const tx = await executeSwap({
        amountIn: fromAmount,
        amountOutMin: minOutputAmount,
        tokenIn: fromTokenAddress,
        tokenOut: toTokenAddress
      });
      
      toast({
        title: 'Swap Executed',
        description: `Transaction sent: ${tx.hash.substring(0, 10)}...`,
      });
      
      // Wait for transaction receipt
      const receipt = await tx.wait();
      
      toast({
        title: 'Swap Completed',
        description: `Successfully swapped ${fromAmount} ${fromToken.symbol} to ${toToken.symbol}`,
      });
      
      // Refresh the balances
      queryClient.invalidateQueries({ queryKey: ['/api/portfolio'] });
      
      // Reset form
      setFromAmount('');
      setToAmount('');
    } catch (error) {
      console.error('Swap error:', error);
      toast({
        title: 'Swap Failed',
        description: error instanceof Error ? error.message : 'Transaction reverted',
        variant: 'destructive'
      });
    } finally {
      setIsSwapping(false);
    }
  };

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

    // Exchange rate should be fromPrice/toPrice for correct calculation
    // This means: how many toTokens you get for 1 fromToken
    const exchangeRate = fromPrice / toPrice;
    const fromAmountValue = parseFloat(fromAmount);
    
    if (isNaN(fromAmountValue)) {
      setToAmount('');
      return;
    }
    
    const calculatedAmount = fromAmountValue * exchangeRate;
    
    // Format the result to a reasonable number of decimal places
    const decimals = toTokenId === 13 ? 10 : 8; // Higher precision for very small values like SHIB
    setToAmount(calculatedAmount.toFixed(decimals));
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
    
    // Check if user has sufficient balance
    const fromTokenBalanceNum = parseFloat(fromTokenBalance);
    const fromAmountNum = parseFloat(fromAmount);
    
    if (isNaN(fromTokenBalanceNum) || isNaN(fromAmountNum)) {
      toast({
        title: 'Error',
        description: 'Invalid amount format',
        variant: 'destructive'
      });
      return;
    }
    
    if (fromAmountNum > fromTokenBalanceNum) {
      toast({
        title: 'Insufficient Balance',
        description: `You only have ${fromTokenBalance} ${fromToken?.symbol} available`,
        variant: 'destructive'
      });
      return;
    }

    // If connected to Ganache or real network, use direct blockchain swap
    if (signer && provider) {
      executeBlockchainSwap();
    } else {
      // Fall back to API-based swap (for demonstration or testing)
      swapMutation.mutate({
        fromTokenId,
        toTokenId,
        fromAmount,
        walletAddress: address || undefined
      });
    }
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
  
  // Enhanced balance calculation that uses both API and direct blockchain queries
  const [fromTokenBalance, setFromTokenBalance] = useState('0');
  const [toTokenBalance, setToTokenBalance] = useState('0');
  
  // Effect to update balances from both API and direct blockchain when needed
  useEffect(() => {
    async function updateBalances() {
      if (!isConnected || !fromTokenId) {
        setFromTokenBalance('0');
        return;
      }
      
      // First try to get balance from portfolio API
      if (portfolio?.assets) {
        const asset = portfolio.assets.find((a: PortfolioAsset) => a.token.id === fromTokenId);
        if (asset && asset.balance !== '0') {
          setFromTokenBalance(asset.balance);
        }
      }
      
      // If connected via direct RPC, also query blockchain
      if (provider && address && fromToken) {
        try {
          // For ETH, get native balance
          if (fromToken.symbol === 'ETH') {
            const balance = await provider.getBalance(address);
            const formattedBalance = ethers.formatEther(balance);
            setFromTokenBalance(formattedBalance);
            console.log(`Direct ETH balance: ${formattedBalance}`);
          } 
          // For tokens, get ERC20 balance if contract address is available
          else if (fromToken.contractAddress && fromToken.contractAddress !== '0x') {
            const tokenContract = new ethers.Contract(
              fromToken.contractAddress,
              ["function balanceOf(address) view returns (uint256)"],
              provider
            );
            const balance = await tokenContract.balanceOf(address);
            const decimals = fromToken.decimals || 18;
            const formattedBalance = ethers.formatUnits(balance, decimals);
            setFromTokenBalance(formattedBalance);
            console.log(`Direct token balance for ${fromToken.symbol}: ${formattedBalance}`);
          }
        } catch (error) {
          console.error("Error fetching blockchain balance:", error);
        }
      }
    }
    
    updateBalances();
  }, [isConnected, fromTokenId, address, provider, portfolio]);
  
  // Same for toToken
  useEffect(() => {
    async function updateToTokenBalance() {
      if (!isConnected || !toTokenId) {
        setToTokenBalance('0');
        return;
      }
      
      // Try portfolio API first
      if (portfolio?.assets) {
        const asset = portfolio.assets.find((a: PortfolioAsset) => a.token.id === toTokenId);
        if (asset && asset.balance !== '0') {
          setToTokenBalance(asset.balance);
        }
      }
      
      // Query blockchain if needed
      if (provider && address && toToken) {
        try {
          if (toToken.symbol === 'ETH') {
            const balance = await provider.getBalance(address);
            setToTokenBalance(ethers.formatEther(balance));
          } else if (toToken.contractAddress && toToken.contractAddress !== '0x') {
            const tokenContract = new ethers.Contract(
              toToken.contractAddress,
              ["function balanceOf(address) view returns (uint256)"],
              provider
            );
            const balance = await tokenContract.balanceOf(address);
            const decimals = toToken.decimals || 18;
            setToTokenBalance(ethers.formatUnits(balance, decimals));
          }
        } catch (error) {
          console.error("Error fetching to-token blockchain balance:", error);
        }
      }
    }
    
    updateToTokenBalance();
  }, [isConnected, toTokenId, address, provider, portfolio]);
  
  // Calculate rate in proper direction (fromToken to toToken)
  const calculateRate = () => {
    if (!fromTokenId || !toTokenId || !tokenPrices) return "0";
    
    const fromTokenPrice = getTokenPrice(fromTokenId);
    const toTokenPrice = getTokenPrice(toTokenId);
    
    if (!fromTokenPrice || !toTokenPrice) return "0";
    
    // Rate is toTokenPrice / fromTokenPrice (how many toTokens you get for 1 fromToken)
    const calculatedRate = fromTokenPrice / toTokenPrice;
    return calculatedRate.toFixed(10);
  };
  
  // This is the correct displayed rate
  const displayRate = calculateRate();
  
  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="mb-6 bg-neutral-800 border border-neutral-700 rounded-xl p-5 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-center">Swap Tokens</h2>
        
        {/* From Token Section */}
        <div className="bg-neutral-700 rounded-xl p-4 mb-3">
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
              className="text-blue-400 hover:text-blue-300 hover:underline"
              onClick={handleMaxClick}
            >
              Max
            </button>
          </div>
        </div>
        
        {/* Swap Button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button 
            className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 border border-blue-500 flex items-center justify-center transition-colors shadow-md"
            onClick={handleSwapTokens}
          >
            <ArrowDownUp className="h-4 w-4 text-white" />
          </button>
        </div>
        
        {/* To Token Section */}
        <div className="bg-neutral-700 rounded-xl p-4 mt-2 mb-4">
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
        
        {/* Swap Details */}
        {fromTokenId && toTokenId && fromAmount && parseFloat(fromAmount) > 0 && (
          <div className="bg-neutral-900 rounded-lg p-4 mb-5 border border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400">Rate</span>
              <span className="text-sm">
                1 {fromToken?.symbol} = {displayRate} {toToken?.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-400">Price Impact</span>
              <span className="text-sm text-green-400">0.05%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Network Fee</span>
              <span className="text-sm">{isConnected ? '$12.34' : '—'}</span>
            </div>
          </div>
        )}
        
        {/* Insufficient Balance Warning */}
        {isConnected && fromTokenId && fromAmount && parseFloat(fromAmount) > parseFloat(fromTokenBalance) && (
          <div className="bg-red-900 bg-opacity-30 border border-red-800 rounded-lg p-3 mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="text-sm text-red-300">
              Insufficient balance. You only have {fromTokenBalance} {fromToken?.symbol} available.
            </div>
          </div>
        )}
        
        {/* Swap Button */}
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-4 px-6 rounded-lg transition-colors shadow-md"
          onClick={handleSwap}
          disabled={swapMutation.isPending || !fromAmount || !fromTokenId || !toTokenId || parseFloat(fromAmount) <= 0 || (isConnected && parseFloat(fromAmount) > parseFloat(fromTokenBalance))}
        >
          {swapMutation.isPending ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
              Swapping...
            </div>
          ) : isConnected ? 
            parseFloat(fromAmount) > parseFloat(fromTokenBalance) ? 
              'Insufficient Balance' : 
              'Swap Tokens' 
            : 'Connect Wallet to Swap'}
        </Button>
      </div>
    </div>
  );
};

export default SwapInterface;