// This script transfers test tokens to specified accounts
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Transferring test tokens...");
  
  // Read the contract address from the JSON file
  let contractData;
  try {
    contractData = JSON.parse(fs.readFileSync('contracts/test-token-address.json', 'utf8'));
  } catch (error) {
    console.error("Error reading contract address file:", error);
    console.log("Please run deploy-test-token.js first to deploy the contract");
    return;
  }
  
  const testTokenAddress = contractData.TestToken;
  console.log(`Using TestToken at address: ${testTokenAddress}`);
  
  // Get signers
  const [deployer, ...accounts] = await hre.ethers.getSigners();
  console.log(`Token owner: ${deployer.address}`);
  
  // Get contract instance
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const testToken = TestToken.attach(testTokenAddress);
  
  // Transfer tokens to all available accounts
  const transferAmount = hre.ethers.parseEther("10000"); // 10,000 tokens
  
  for (let i = 0; i < Math.min(accounts.length, 5); i++) {
    const account = accounts[i];
    console.log(`Transferring 10,000 TEST tokens to ${account.address}`);
    
    const tx = await testToken.transfer(account.address, transferAmount);
    await tx.wait();
    
    const balance = await testToken.balanceOf(account.address);
    console.log(`New balance: ${hre.ethers.formatEther(balance)} TEST`);
  }
  
  console.log("Transfers complete!");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });