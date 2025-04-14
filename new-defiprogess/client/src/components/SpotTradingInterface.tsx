import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TokenSelector from "./TokenSelector";
import {
  fetchTokens,
  fetchTokenPrices,
  executeTrade,
  formatTokenAmount,
  formatUsdValue,
} from "@/lib/api";
import { useWeb3 } from "@/lib/web3";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const SpotTradingInterface = () => {
  const [tokenId, setTokenId] = useState<number | undefined>();
  const [baseTokenId, setBaseTokenId] = useState<number | undefined>();
  const [amount, setAmount] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const { address, isConnected } = useWeb3();
  const { toast } = useToast();

  const { data: tokens } = useQuery({
    queryKey: ["/api/tokens"],
  });

  const { data: tokenPrices } = useQuery({
    queryKey: ["/api/prices"],
    refetchInterval: 30000,
  });

  const tradeMutation = useMutation({
    mutationFn: executeTrade,
    onSuccess: (data) => {
      toast({
        title: "Trade Initiated",
        description: `${data.type === "buy" ? "Buying" : "Selling"} ${data.amount} ${data.token.symbol} at ${data.price} ${data.baseToken.symbol}`,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

      // Reset form
      setAmount("");
    },
    onError: (error) => {
      toast({
        title: "Trade Failed",
        description:
          error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const getTokenById = (id?: number) => {
    if (!id || !tokens) return null;
    return tokens.find((t: any) => t.id === id) || null;
  };

  const getTokenPrice = (id?: number) => {
    if (!id || !tokenPrices) return null;
    const price = tokenPrices.find((p: any) => p.id === id);
    return price ? parseFloat(price.price) : null;
  };

  // Set price when token changes
  useEffect(() => {
    if (tokenId && baseTokenId) {
      const tokenPrice = getTokenPrice(tokenId);
      const baseTokenPrice = getTokenPrice(baseTokenId);

      if (tokenPrice && baseTokenPrice) {
        // If base token is a stable coin like USDT, use token price directly
        if (getTokenById(baseTokenId)?.symbol === "USDT") {
          setPrice(tokenPrice.toString());
        } else {
          // Otherwise calculate the rate between the two tokens
          setPrice((tokenPrice / baseTokenPrice).toString());
        }
      }
    }
  }, [tokenId, baseTokenId, tokenPrices]);

  const handleMaxClick = () => {
    // In a real app, you would get the actual user balance here
    if (tradeType === "buy") {
      const baseToken = getTokenById(baseTokenId);
      if (baseToken) {
        if (baseToken.symbol === "USDT") {
          setAmount("1000");
        } else {
          setAmount("1");
        }
      }
    } else {
      const token = getTokenById(tokenId);
      if (token) {
        if (token.symbol === "ETH") {
          setAmount("1.24");
        } else {
          setAmount("10");
        }
      }
    }
  };

  const handleTrade = () => {
    if (!isConnected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to trade",
        variant: "destructive",
      });
      return;
    }

    if (
      !tokenId ||
      !baseTokenId ||
      !amount ||
      !price ||
      parseFloat(amount) <= 0 ||
      parseFloat(price) <= 0
    ) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid amount and price",
        variant: "destructive",
      });
      return;
    }

    tradeMutation.mutate({
      tokenId,
      baseTokenId,
      amount,
      price,
      type: tradeType,
      walletAddress: address || undefined,
    });
  };

  // Calculate total
  const total = amount && price ? parseFloat(amount) * parseFloat(price) : 0;

  const token = getTokenById(tokenId);
  const baseToken = getTokenById(baseTokenId);

  // Set USDT (id 3) as default base token if available
  useEffect(() => {
    if (tokens && !baseTokenId) {
      const usdtToken = tokens.find((t: any) => t.symbol === "USDT");
      if (usdtToken) {
        setBaseTokenId(usdtToken.id);
      }
    }
  }, [tokens, baseTokenId]);

  return (
    <div className="p-4">
      <Tabs
        defaultValue="buy"
        onValueChange={(value) => setTradeType(value as "buy" | "sell")}
      >
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger
            value="buy"
            className="data-[state=active]:bg-success data-[state=active]:text-white"
          >
            Buy
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="data-[state=active]:bg-error data-[state=active]:text-white"
          >
            Sell
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="mt-0">
          <div className="space-y-4">
            {/* Token Selection */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1">
                <label className="text-sm text-neutral-400 mb-1 block">
                  Token
                </label>
                <TokenSelector
                  selectedTokenId={tokenId}
                  onTokenSelect={(token) => setTokenId(token.id)}
                  excludeTokenIds={baseTokenId ? [baseTokenId] : []}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-neutral-400 mb-1 block">
                  Pay With
                </label>
                <TokenSelector
                  selectedTokenId={baseTokenId}
                  onTokenSelect={(token) => setBaseTokenId(token.id)}
                  excludeTokenIds={tokenId ? [tokenId] : []}
                />
              </div>
            </div>

            {/* Price Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-neutral-400">Price</label>
                <span className="text-xs text-neutral-400">
                  Market:{" "}
                  {price ? formatTokenAmount(parseFloat(price)) : "0.00"}{" "}
                  {baseToken?.symbol}
                </span>
              </div>
              <div className="flex items-center">
                <Input
                  type="number"
                  placeholder="0.0"
                  className="bg-neutral-700 border-neutral-600 text-white"
                  disabled
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <div className="ml-2 text-sm font-medium text-neutral-300">
                  {baseToken?.symbol || "USDT"}
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-neutral-400">Amount</label>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-primary-light hover:underline"
                    onClick={handleMaxClick}
                  >
                    Max
                  </button>
                </div>
              </div>
              <div className="flex items-center">
                <Input
                  type="number"
                  placeholder="0.0"
                  className="bg-neutral-700 border-neutral-600 text-white"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="ml-2 text-sm font-medium text-neutral-300">
                  {token?.symbol || "ETH"}
                </div>
              </div>
            </div>

            {/* Total */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-neutral-400">Total</label>
              </div>
              <div className="bg-neutral-800 rounded-lg p-3 flex items-center justify-between">
                <span>
                  {formatTokenAmount(total)} {baseToken?.symbol}
                </span>
                <span className="text-sm text-neutral-400">
                  ≈ {formatUsdValue(total * (getTokenPrice(baseTokenId) || 1))}
                </span>
              </div>
            </div>

            {/* Buy Button */}
            <Button
              className="w-full bg-success hover:bg-success-dark text-white font-medium py-3 rounded-lg"
              onClick={handleTrade}
              disabled={
                tradeMutation.isPending ||
                !amount ||
                !price ||
                !tokenId ||
                !baseTokenId
              }
            >
              {tradeMutation.isPending ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </div>
              ) : isConnected ? (
                `Buy ${token?.symbol || "Token"}`
              ) : (
                "Connect Wallet to Buy"
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="sell" className="mt-0">
          <div className="space-y-4">
            {/* Token Selection */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1">
                <label className="text-sm text-neutral-400 mb-1 block">
                  Token
                </label>
                <TokenSelector
                  selectedTokenId={tokenId}
                  onTokenSelect={(token) => setTokenId(token.id)}
                  excludeTokenIds={baseTokenId ? [baseTokenId] : []}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-neutral-400 mb-1 block">
                  Receive
                </label>
                <TokenSelector
                  selectedTokenId={baseTokenId}
                  onTokenSelect={(token) => setBaseTokenId(token.id)}
                  excludeTokenIds={tokenId ? [tokenId] : []}
                />
              </div>
            </div>

            {/* Price Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-neutral-400">Price</label>
                <span className="text-xs text-neutral-400">
                  Market:{" "}
                  {price ? formatTokenAmount(parseFloat(price)) : "0.00"}{" "}
                  {baseToken?.symbol}
                </span>
              </div>
              <div className="flex items-center">
                <Input
                  type="number"
                  placeholder="0.0"
                  className="bg-neutral-700 border-neutral-600 text-white"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                <div className="ml-2 text-sm font-medium text-neutral-300">
                  {baseToken?.symbol || "USDT"}
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-neutral-400">Amount</label>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-primary-light hover:underline"
                    onClick={handleMaxClick}
                  >
                    Max
                  </button>
                </div>
              </div>
              <div className="flex items-center">
                <Input
                  type="number"
                  placeholder="0.0"
                  className="bg-neutral-700 border-neutral-600 text-white"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="ml-2 text-sm font-medium text-neutral-300">
                  {token?.symbol || "ETH"}
                </div>
              </div>
            </div>

            {/* Total */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-neutral-400">Total</label>
              </div>
              <div className="bg-neutral-800 rounded-lg p-3 flex items-center justify-between">
                <span>
                  {formatTokenAmount(total)} {baseToken?.symbol}
                </span>
                <span className="text-sm text-neutral-400">
                  ≈ {formatUsdValue(total * (getTokenPrice(baseTokenId) || 1))}
                </span>
              </div>
            </div>

            {/* Sell Button */}
            <Button
              className="w-full bg-error hover:bg-error-dark text-white font-medium py-3 rounded-lg"
              onClick={handleTrade}
              disabled={
                tradeMutation.isPending ||
                !amount ||
                !price ||
                !tokenId ||
                !baseTokenId
              }
            >
              {tradeMutation.isPending ? (
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </div>
              ) : isConnected ? (
                `Sell ${token?.symbol || "Token"}`
              ) : (
                "Connect Wallet to Sell"
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SpotTradingInterface;
