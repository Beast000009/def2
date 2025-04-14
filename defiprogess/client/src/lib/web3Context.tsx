import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { useToast } from '@/hooks/use-toast';
import { TokenSwapService } from '@/contracts/TokenSwap';

// Define window ethereum type
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Context type definition
interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  swapService: TokenSwapService | null;
  connectWallet: (providerType?: string) => Promise<void>;
  disconnectWallet: () => void;
  executeSwap: (params: {
    amountIn: string;
    amountOutMin: string;
    tokenIn: string;
    tokenOut: string;
  }) => Promise<ethers.TransactionResponse>;
  getSwapEstimate: (amountIn: string, tokenIn: string, tokenOut: string) => Promise<string>;
}

// Create context with default values
const Web3Context = createContext<Web3ContextType>({
  provider: null,
  signer: null,
  address: null,
  chainId: null,
  isConnected: false,
  isConnecting: false,
  swapService: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  executeSwap: async () => { throw new Error('Not implemented'); },
  getSwapEstimate: async () => { throw new Error('Not implemented'); },
});

// Provider props interface
interface Web3ProviderProps {
  children: ReactNode;
}

// Provider component
export function Web3Provider({ children }: Web3ProviderProps) {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [swapService, setSwapService] = useState<TokenSwapService | null>(null);
  const { toast } = useToast();

  const connectWallet = async (providerType = 'metamask') => {
    if (!window.ethereum) {
      toast({
        title: "Wallet Error",
        description: "No Ethereum wallet found. Please install MetaMask or another wallet.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConnecting(true);

      // Request account access
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);

      // Get signer and address
      const ethSigner = await browserProvider.getSigner();
      const signerAddress = await ethSigner.getAddress();
      const network = await browserProvider.getNetwork();
      const networkChainId = Number(network.chainId);

      // Initialize swap service
      const swapServiceInstance = new TokenSwapService(
        browserProvider,
        ethSigner,
        networkChainId
      );

      setProvider(browserProvider);
      setSigner(ethSigner);
      setAddress(signerAddress);
      setChainId(networkChainId);
      setIsConnected(true);
      setSwapService(swapServiceInstance);

      // Store the address in localStorage for persistence
      localStorage.setItem('walletAddress', signerAddress);

      toast({
        title: "Wallet Connected",
        description: `Connected to ${signerAddress.substring(0, 6)}...${signerAddress.substring(signerAddress.length - 4)}`,
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setIsConnected(false);
    setSwapService(null);
    localStorage.removeItem('walletAddress');

    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const executeSwap = async (params: {
    amountIn: string;
    amountOutMin: string;
    tokenIn: string;
    tokenOut: string;
  }) => {
    if (!swapService) {
      throw new Error('Swap service not initialized');
    }

    const deadline = Math.floor(Date.now() / 1000) + 20 * 60; // 20 minutes from now
    return swapService.executeSwap(
      params.amountIn,
      params.amountOutMin,
      params.tokenIn,
      params.tokenOut,
      deadline
    );
  };

  const getSwapEstimate = async (
    amountIn: string,
    tokenIn: string,
    tokenOut: string
  ) => {
    if (!swapService) {
      throw new Error('Swap service not initialized');
    }
    return swapService.getSwapAmount(amountIn, tokenIn, tokenOut);
  };

  // Check for saved wallet address on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress && window.ethereum) {
      connectWallet();
    }
  }, []);

  // Set up event listeners for wallet changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== address) {
          setAddress(accounts[0]);
          localStorage.setItem('walletAddress', accounts[0]);
        }
      };

      const handleChainChanged = (chainIdHex: string) => {
        const newChainId = parseInt(chainIdHex, 16);
        setChainId(newChainId);
        // Reinitialize swap service with new chain ID
        if (provider && signer) {
          setSwapService(new TokenSwapService(provider, signer, newChainId));
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [address, provider, signer]);

  return (
    <Web3Context.Provider 
      value={{
        provider,
        signer,
        address,
        chainId,
        isConnected,
        isConnecting,
        swapService,
        connectWallet,
        disconnectWallet,
        executeSwap,
        getSwapEstimate
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

// Custom hook to use the Web3 context
export const useWeb3 = () => useContext(Web3Context);