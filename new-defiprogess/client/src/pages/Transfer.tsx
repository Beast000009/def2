import { useState, useEffect } from "react";
import { useWeb3 } from "@/lib/web3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import TokenSelector from "@/components/TokenSelector";
import { useToast } from "@/hooks/use-toast";
import { ethers } from "ethers";
import { fetchTokens, formatTokenAmount } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import WalletConnectModal from "@/components/WalletConnectModal";

const Transfer = () => {
  const { address, isConnected, provider, signer } = useWeb3();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferStatus, setTransferStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const { toast } = useToast();

  const { data: tokens, isLoading: isLoadingTokens } = useQuery({
    queryKey: ["/api/tokens"],
    queryFn: fetchTokens
  });

  const getTokenById = (id: number | null) => {
    if (!id || !tokens) return undefined;
    return tokens.find((token) => token.id === id) || undefined;
  };

  const selectedToken = getTokenById(tokenId);

  // Update token balance when token or address changes
  useEffect(() => {
    if (!isConnected || !tokenId || !provider || !address) {
      setTokenBalance("0");
      return;
    }

    const fetchBalance = async () => {
      try {
        const token = getTokenById(tokenId);
        if (!token) return;

        // If the token is ETH
        if (token.symbol === "ETH") {
          const balance = await provider.getBalance(address);
          const formattedBalance = ethers.formatEther(balance);
          setTokenBalance(formattedBalance);
        } 
        // For ERC20 tokens
        else if (token.contractAddress && token.contractAddress !== '0x') {
          const tokenContract = new ethers.Contract(
            token.contractAddress,
            ["function balanceOf(address) view returns (uint256)"],
            provider
          );
          const balance = await tokenContract.balanceOf(address);
          const decimals = token.decimals || 18;
          const formattedBalance = ethers.formatUnits(balance, decimals);
          setTokenBalance(formattedBalance);
        }
      } catch (error) {
        console.error("Error fetching token balance:", error);
        setTokenBalance("0");
      }
    };

    fetchBalance();
  }, [tokenId, address, provider, isConnected]);

  const isValidForm = () => {
    if (!tokenId) return false;
    if (!amount || parseFloat(amount) <= 0) return false;
    if (!ethers.isAddress(recipientAddress)) return false;
    if (parseFloat(amount) > parseFloat(tokenBalance)) return false;
    return true;
  };

  const handleTransfer = async () => {
    if (!isValidForm() || !signer || !tokenId) return;

    setIsTransferring(true);
    setTransferStatus("idle");
    setStatusMessage("");

    try {
      const token = getTokenById(tokenId);
      if (!token) throw new Error("Token not found");

      let txResponse;

      // If transferring ETH
      if (token.symbol === "ETH") {
        txResponse = await signer.sendTransaction({
          to: recipientAddress,
          value: ethers.parseEther(amount)
        });
      } 
      // If transferring ERC20 token
      else if (token.contractAddress) {
        const tokenContract = new ethers.Contract(
          token.contractAddress,
          [
            "function transfer(address to, uint256 amount) returns (bool)",
            "function decimals() view returns (uint8)"
          ],
          signer
        );

        // Get decimals and parse amount
        const decimals = await tokenContract.decimals();
        const parsedAmount = ethers.parseUnits(amount, decimals);
        
        txResponse = await tokenContract.transfer(recipientAddress, parsedAmount);
      } else {
        throw new Error("Token contract address not available");
      }

      // Wait for transaction to be mined
      await txResponse.wait();

      // Create transaction record on backend
      await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          tokenId: tokenId,
          recipientAddress: recipientAddress,
          amount: amount,
          txHash: txResponse.hash
        })
      });

      setTransferStatus("success");
      setStatusMessage(`Successfully transferred ${amount} ${token.symbol} to ${recipientAddress.substring(0, 6)}...${recipientAddress.substring(recipientAddress.length - 4)}`);
      
      toast({
        title: "Transfer Successful",
        description: `${amount} ${token.symbol} has been sent to ${recipientAddress.substring(0, 6)}...${recipientAddress.substring(recipientAddress.length - 4)}`,
      });

      // Reset form after successful transfer
      setAmount("");
      setRecipientAddress("");
    } catch (error) {
      console.error("Transfer error:", error);
      setTransferStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Failed to transfer tokens");
      
      toast({
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "Failed to transfer tokens",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 mb-6">
          <i className="ri-wallet-3-line text-3xl"></i>
        </div>
        <h2 className="text-2xl font-semibold mb-3">Wallet Not Connected</h2>
        <p className="text-neutral-400 max-w-md text-center mb-6">
          Connect your wallet to transfer tokens to another address.
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

  if (isLoadingTokens) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-semibold mb-6">Transfer Tokens</h1>
        <Card className="bg-neutral-800 border-neutral-700">
          <CardHeader>
            <CardTitle>Loading tokens...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-semibold mb-6">Transfer Tokens</h1>
      
      <Card className="bg-neutral-800 border-neutral-700 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Send Tokens</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From Address */}
          <div className="space-y-2">
            <Label>From</Label>
            <div className="p-3 bg-neutral-700 rounded-md flex items-center justify-between">
              <span className="text-sm">{address}</span>
              <span className="text-xs bg-neutral-600 px-2 py-1 rounded">Your Wallet</span>
            </div>
          </div>
          
          {/* To Address */}
          <div className="space-y-2">
            <Label htmlFor="recipientAddress">Recipient Address</Label>
            <Input
              id="recipientAddress"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="bg-neutral-700 border-neutral-600"
            />
            {recipientAddress && !ethers.isAddress(recipientAddress) && (
              <p className="text-red-400 text-xs mt-1">Invalid Ethereum address</p>
            )}
          </div>
          
          {/* Token Selection */}
          <div className="space-y-2">
            <Label>Token</Label>
            <TokenSelector
              selectedTokenId={tokenId}
              onTokenSelect={(token) => setTokenId(token.id)}
            />
            {tokenId && (
              <p className="text-sm text-neutral-400">
                Available: {parseFloat(tokenBalance).toFixed(6)} {selectedToken?.symbol}
              </p>
            )}
          </div>
          
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.000001"
                min="0"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-neutral-700 border-neutral-600 pr-24"
              />
              {selectedToken && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="h-7 text-xs px-2"
                    onClick={() => setAmount(tokenBalance)}
                  >
                    MAX
                  </Button>
                  <span className="mx-1">|</span>
                  <span>{selectedToken.symbol}</span>
                </div>
              )}
            </div>
            {amount && tokenBalance && parseFloat(amount) > parseFloat(tokenBalance) && (
              <p className="text-red-400 text-xs mt-1">Insufficient balance</p>
            )}
          </div>
          
          {/* Transfer Status */}
          {transferStatus === "success" && (
            <Alert className="bg-green-900/20 border-green-800 text-green-100">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success!</AlertTitle>
              <AlertDescription>
                {statusMessage}
              </AlertDescription>
            </Alert>
          )}
          
          {transferStatus === "error" && (
            <Alert className="bg-red-900/20 border-red-800 text-red-100">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {statusMessage}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Submit Button */}
          <div className="pt-4">
            <Button 
              className="w-full bg-primary hover:bg-primary-dark flex items-center justify-center gap-2"
              disabled={!isValidForm() || isTransferring}
              onClick={handleTransfer}
            >
              {isTransferring ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Transfer <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          
          {/* Fee Disclaimer */}
          <p className="text-xs text-neutral-400 text-center">
            Network fees apply to all transfers. Please ensure you have enough ETH to cover gas fees.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transfer;