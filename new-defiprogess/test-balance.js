// Test the blockchain balance fetching
import { ethers } from 'ethers';

async function main() {
  try {
    // Connect to the Hardhat node
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // TEST token address
    const tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    // Test wallet address - account #1 from Hardhat
    const walletAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    
    // ERC20 ABI (minimal)
    const abi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
    
    console.log(`Getting balance for ${walletAddress} on token ${tokenAddress}...`);
    
    const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
    
    // Get balance first
    const balance = await tokenContract.balanceOf(walletAddress);
    console.log(`Raw balance: ${balance.toString()}`);
    
    // Get decimals
    try {
      const decimals = await tokenContract.decimals();
      console.log(`Token decimals: ${decimals}`);
      
      // Format balance with decimals
      const formattedBalance = ethers.formatUnits(balance, decimals);
      console.log(`Formatted balance: ${formattedBalance}`);
    } catch (error) {
      console.error("Error fetching decimals:", error);
      // Fallback to 18 decimals (standard for ERC20)
      const formattedBalance = ethers.formatUnits(balance, 18);
      console.log(`Formatted balance (assuming 18 decimals): ${formattedBalance}`);
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main();