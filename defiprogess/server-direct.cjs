// server-direct.cjs
// This file provides a direct interface to the blockchain contracts

const ethers = require('ethers');

// Contract ABIs
const TOKEN_SWAP_ABI = [
  "function addSupportedToken(address token) external",
  "function removeSupportedToken(address token) external",
  "function setExchangeRate(address fromToken, address toToken, uint256 rate) external",
  "function setFeePercentage(uint256 _feePercentage) external",
  "function getSwapAmount(address fromToken, address toToken, uint256 fromAmount) view returns (uint256)",
  "function swap(address fromToken, address toToken, uint256 fromAmount, uint256 minToAmount, uint256 deadline) returns (uint256)",
  "function supportedTokens(address token) view returns (bool)",
  "function exchangeRates(address fromToken, address toToken) view returns (uint256)",
  "function feePercentage() view returns (uint256)",
];

const SPOT_TRADING_ABI = [
  "function addSupportedToken(address token) external",
  "function removeSupportedToken(address token) external",
  "function setFeePercentage(uint256 _feePercentage) external",
  "function createBuyOrder(address tokenAddress, address baseTokenAddress, uint256 amount, uint256 price) returns (uint256)",
  "function createSellOrder(address tokenAddress, address baseTokenAddress, uint256 amount, uint256 price) returns (uint256)",
  "function cancelOrder(uint256 orderId)",
  "function fillBuyOrder(uint256 orderId, uint256 amount)",
  "function fillSellOrder(uint256 orderId, uint256 amount)",
  "function getOrder(uint256 orderId) view returns (tuple(uint256 id, address trader, address tokenAddress, address baseTokenAddress, uint256 amount, uint256 price, uint256 filled, uint256 timestamp, bool isBuyOrder, bool isActive))",
  "function getActiveBuyOrders(address tokenAddress) view returns (uint256[])",
  "function getActiveSellOrders(address tokenAddress) view returns (uint256[])",
  "function get24HourVolume(address tokenAddress, address baseTokenAddress) view returns (uint256)",
  "function supportedTokens(address token) view returns (bool)",
  "function feePercentage() view returns (uint256)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function totalSupply() external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function mint(address to, uint256 amount) external",
];

// Connect to local Hardhat node
console.log('Connecting to local Ethereum node...');
const provider = new ethers.JsonRpcProvider('http://0.0.0.0:8545/');

// Use first account as admin
const ADMIN_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const adminWallet = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);

// Contract addresses
const CONTRACT_ADDRESSES = {
  TOKEN_SWAP: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  SPOT_TRADING: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  ETH: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  USDT: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  BTC: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  LINK: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
};

// Create contract instances
console.log('Creating contract instances...');
const tokenSwap = new ethers.Contract(CONTRACT_ADDRESSES.TOKEN_SWAP, TOKEN_SWAP_ABI, adminWallet);
const spotTrading = new ethers.Contract(CONTRACT_ADDRESSES.SPOT_TRADING, SPOT_TRADING_ABI, adminWallet);
const ethToken = new ethers.Contract(CONTRACT_ADDRESSES.ETH, ERC20_ABI, adminWallet);
const usdtToken = new ethers.Contract(CONTRACT_ADDRESSES.USDT, ERC20_ABI, adminWallet);
const btcToken = new ethers.Contract(CONTRACT_ADDRESSES.BTC, ERC20_ABI, adminWallet);
const linkToken = new ethers.Contract(CONTRACT_ADDRESSES.LINK, ERC20_ABI, adminWallet);

// Export contracts and utilities
module.exports = {
  provider,
  adminWallet,
  CONTRACT_ADDRESSES,
  tokenSwap,
  spotTrading,
  ethToken,
  usdtToken,
  btcToken,
  linkToken,
  
  // Helper to create a contract instance with a specific wallet
  createContractWithSigner: function(address, abi, wallet) {
    return new ethers.Contract(address, abi, wallet);
  },
  
  // Utility to parse amounts with correct decimals
  parseAmount: function(amount, token) {
    let decimals = 18; // Default for most tokens
    
    if (token === CONTRACT_ADDRESSES.USDT) {
      decimals = 6;
    } else if (token === CONTRACT_ADDRESSES.BTC) {
      decimals = 8;
    }
    
    return ethers.parseUnits(amount.toString(), decimals);
  },
  
  // Utility to format amounts with correct decimals
  formatAmount: function(amount, token) {
    let decimals = 18; // Default for most tokens
    
    if (token === CONTRACT_ADDRESSES.USDT) {
      decimals = 6;
    } else if (token === CONTRACT_ADDRESSES.BTC) {
      decimals = 8;
    }
    
    return ethers.formatUnits(amount, decimals);
  },
  
  // ABI exports
  TOKEN_SWAP_ABI,
  SPOT_TRADING_ABI,
  ERC20_ABI,
};

console.log('Blockchain interface ready!');
console.log('Contract Addresses:', JSON.stringify(CONTRACT_ADDRESSES, null, 2));