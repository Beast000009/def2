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

// Define a provider type that can be either BrowserProvider or JsonRpcProvider
type EthProvider = ethers.BrowserProvider | ethers.JsonRpcProvider;

// Context type definition
interface Web3ContextType {
  provider: EthProvider | null;
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
  const [provider, setProvider] = useState<EthProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [swapService, setSwapService] = useState<TokenSwapService | null>(null);
  const { toast } = useToast();

  const connectWallet = async (providerType = 'metamask') => {
    try {
      setIsConnecting(true);
      let browserProvider;
      let ethSigner;

      if (providerType === 'local') {
        // Connect directly to local Ganache
        const localRpcUrl = "HTTP://127.0.0.1:7545";
        console.log("Connecting to local Ganache at:", localRpcUrl);
        
        const jsonRpcProvider = new ethers.JsonRpcProvider(localRpcUrl);
        // Get the first account from Ganache
        const accounts = await jsonRpcProvider.listAccounts();
        if (accounts.length === 0) {
          throw new Error("No accounts available on the local Ganache instance");
        }
        
        browserProvider = jsonRpcProvider;
        // Use the first account (index 0) as our signer
        ethSigner = await jsonRpcProvider.getSigner(0);
        
      } else if (window.ethereum) {
        // Connect using MetaMask or another injected provider
        browserProvider = new ethers.BrowserProvider(window.ethereum);
        await browserProvider.send("eth_requestAccounts", []);
        ethSigner = await browserProvider.getSigner();
      } else {
        toast({
          title: "Wallet Error",
          description: "No Ethereum wallet found. Please install MetaMask or another wallet.",
          variant: "destructive",
        });
        return;
      }

      // Get signer and address
      const signerAddress = await ethSigner.getAddress();
      const network = await browserProvider.getNetwork();
      const networkChainId = Number(network.chainId);

      console.log("Connected to network with chain ID:", networkChainId);

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
      localStorage.setItem('providerType', providerType);

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

  // Check for saved wallet address and provider type on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    const savedProviderType = localStorage.getItem('providerType');
    
    if (savedAddress) {
      if (savedProviderType === 'local') {
        // Reconnect to local Ganache
        connectWallet('local');
      } else if (window.ethereum) {
        // Reconnect to browser wallet
        connectWallet('metamask');
      }
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
        // Reinitialize swap service with new chain ID if MetaMask is being used
        if (provider && signer && 'provider' in provider && provider.provider === window.ethereum) {
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