import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// TEST token contract address - will be updated after deployment
let TEST_TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Function to get the Hardhat provider
export const getProvider = () => {
  return new ethers.JsonRpcProvider("http://127.0.0.1:8545");
};

// Function to get TEST token contract
export const getTestTokenContract = async () => {
  const provider = getProvider();
  const abi = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function transfer(address to, uint amount) returns (bool)"
  ];
  
  return new ethers.Contract(TEST_TOKEN_ADDRESS, abi, provider);
};

// Check if TEST token is deployed
export const isTestTokenDeployed = async (): Promise<boolean> => {
  try {
    const provider = getProvider();
    console.log(`Checking if TEST token is deployed at address: ${TEST_TOKEN_ADDRESS}`);
    const code = await provider.getCode(TEST_TOKEN_ADDRESS);
    console.log(`Contract code length: ${code.length}, is deployed: ${code !== '0x'}`);
    
    // For debugging, try to call a function to verify it's the right contract
    if (code !== '0x') {
      try {
        const abi = ["function name() view returns (string)"];
        const tokenContract = new ethers.Contract(TEST_TOKEN_ADDRESS, abi, provider);
        const name = await tokenContract.name();
        console.log(`Contract name: ${name}`);
      } catch (nameError) {
        console.error("Error getting contract name:", nameError);
      }
    }
    
    return code !== '0x';
  } catch (error) {
    console.error("Error checking TEST token deployment:", error);
    return false;
  }
};

// Get token balance from blockchain
export const getTokenBalanceFromBlockchain = async (walletAddress: string, tokenAddress: string): Promise<string> => {
  try {
    // Check if the token contract is deployed
    const provider = getProvider();
    const code = await provider.getCode(tokenAddress);
    
    if (code === '0x') {
      console.log(`Token contract at ${tokenAddress} is not deployed.`);
      return "0";
    }
    
    // ERC20 ABI (minimal)
    const abi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
    
    const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
    
    // Get token decimals
    let decimals = 18; // Default to 18 decimals (standard for most ERC20 tokens)
    try {
      decimals = await tokenContract.decimals();
    } catch (error) {
      console.log("Error fetching decimals, using default value of 18:", error);
    }
    
    // Get balance
    const balance = await tokenContract.balanceOf(walletAddress);
    
    // Format balance with proper decimals
    const formattedBalance = ethers.formatUnits(balance, decimals);
    
    return formattedBalance;
  } catch (error) {
    console.error(`Error fetching token balance from blockchain:`, error);
    return "0"; // Return 0 balance if there's an error
  }
};

// Update TEST token address (after deployment)
export const updateTestTokenAddress = (address: string) => {
  TEST_TOKEN_ADDRESS = address;
};

// Get current TEST token address
export const getTestTokenAddress = () => {
  return TEST_TOKEN_ADDRESS;
};