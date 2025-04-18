import { ethers } from "ethers";

// ERC20 Token ABI - minimal version for our needs
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address recipient, uint256 amount) returns (bool)",
];

// Token Swap Contract ABI
export const TOKEN_SWAP_ABI = [
  "function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)",
  "function getAmountsOut(uint256 amountIn, address[] calldata path) view returns (uint256[] memory amounts)",
  "function WETH() view returns (address)",
  "event Swap(address indexed sender, uint256 amountIn, uint256 amountOut, address[] path)",
];

// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Ethereum Mainnet
  1: {
    ROUTER: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3", // Uniswap V2 Router
    FACTORY: "0xF62c03E08ada871A0bEb309762E260a7a6a880E6", // Uniswap V2 Factory
  },
  // Hardhat Local Network
  31337: {
    ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Default Hardhat address
    FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Default Hardhat address
  },
  // Ganache Local Network (default port 7545)
  5777: {
    ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Default Ganache address
    FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Default Ganache address
  },
  // Ganache Local Network (alternate port, typically 8545)
  1337: {
    ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Default Ganache address
    FACTORY: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Default Ganache address
  },
  // Add other networks as needed
};

// Define provider type for flexibility
type EthProvider = ethers.BrowserProvider | ethers.JsonRpcProvider;

export class TokenSwapService {
  private provider: EthProvider;
  private signer: ethers.JsonRpcSigner;
  private chainId: number;

  constructor(
    provider: EthProvider,
    signer: ethers.JsonRpcSigner,
    chainId: number,
  ) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;
  }

  private getRouterAddress(): string {
    const addresses =
      CONTRACT_ADDRESSES[this.chainId as keyof typeof CONTRACT_ADDRESSES];
    
    if (!addresses) {
      console.warn(`Network chainId ${this.chainId} not explicitly configured, using fallback addresses`);
      // For development/testing, use default addresses for local chains
      if (this.chainId < 1000000) { // Assuming local chain IDs are typically below this threshold
        return "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Default Uniswap V2 Router for dev networks
      }
      throw new Error(`Network chainId ${this.chainId} not supported`);
    }
    return addresses.ROUTER;
  }

  async getSwapAmount(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
  ): Promise<string> {
    const router = new ethers.Contract(
      this.getRouterAddress(),
      TOKEN_SWAP_ABI,
      this.provider,
    );

    try {
      const amounts = await router.getAmountsOut(
        ethers.parseUnits(amountIn, 18),
        [tokenIn, tokenOut],
      );
      return ethers.formatUnits(amounts[1], 18);
    } catch (error) {
      console.error("Error getting swap amount:", error);
      throw error;
    }
  }

  async approveToken(
    tokenAddress: string,
    amount: string,
  ): Promise<ethers.TransactionResponse> {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);

    try {
      const tx = await token.approve(
        this.getRouterAddress(),
        ethers.parseUnits(amount, 18),
      );
      return tx;
    } catch (error) {
      console.error("Error approving token:", error);
      throw error;
    }
  }

  async executeSwap(
    amountIn: string,
    amountOutMin: string,
    tokenIn: string,
    tokenOut: string,
    deadline: number,
  ): Promise<ethers.TransactionResponse> {
    const router = new ethers.Contract(
      this.getRouterAddress(),
      TOKEN_SWAP_ABI,
      this.signer,
    );

    try {
      const tx = await router.swapExactTokensForTokens(
        ethers.parseUnits(amountIn, 18),
        ethers.parseUnits(amountOutMin, 18),
        [tokenIn, tokenOut],
        await this.signer.getAddress(),
        deadline,
      );
      return tx;
    } catch (error) {
      console.error("Error executing swap:", error);
      throw error;
    }
  }
}
