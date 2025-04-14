// This script transfers TEST tokens to a specific wallet
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  // Read the contract address from the file
  const contractData = JSON.parse(
    fs.readFileSync("contracts/test-token-address.json", "utf8")
  );
  
  const testTokenAddress = contractData.TestToken;
  console.log(`TestToken address: ${testTokenAddress}`);
  
  // Get the contract factory and connect to the deployed contract
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const testToken = TestToken.attach(testTokenAddress);
  
  // Get signers (accounts)
  const [deployer] = await hre.ethers.getSigners();
  
  // Define recipient address - this will match our frontend wallet
  // Using the second account from Hardhat as our test wallet
  const accounts = await hre.ethers.getSigners();
  const recipient = accounts[1]; // Second account in Hardhat
  console.log(`Recipient address: ${recipient.address}`);
  
  // Transfer 1000 TEST tokens to the recipient
  const transferAmount = hre.ethers.parseUnits("1000", 18); // 1000 tokens with 18 decimals
  console.log(`Transferring ${hre.ethers.formatUnits(transferAmount, 18)} TEST tokens to ${recipient.address}...`);
  
  const tx = await testToken.transfer(recipient.address, transferAmount);
  await tx.wait();
  
  // Check balances
  const deployerBalance = await testToken.balanceOf(deployer.address);
  const recipientBalance = await testToken.balanceOf(recipient.address);
  
  console.log(`Deployer balance: ${hre.ethers.formatUnits(deployerBalance, 18)} TEST`);
  console.log(`Recipient balance: ${hre.ethers.formatUnits(recipientBalance, 18)} TEST`);
  
  console.log("Transfer complete!");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });