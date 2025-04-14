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
  // Local Hardhat Network (chainId: 31337)
  31337: {
    ROUTER: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1", // TokenSwap Contract
    ETH: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
    USDT: "0x3Aa5ebB10DC797CAC828524e59A333d0A371443c",
    BTC: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
    LINK: "0x59b670e9fA9D0A427751Af201D676719a970857b",
    SPOT_TRADING: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE"
  },
  // Ethereum Mainnet (for fallback)
  1: {
    ROUTER: "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3", // Uniswap V2 Router
  }
};

export class TokenSwapService {
  private provider: ethers.BrowserProvider;
  private signer: ethers.JsonRpcSigner;
  private chainId: number;

  constructor(
    provider: ethers.BrowserProvider,
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
      throw new Error("Network not supported");
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
