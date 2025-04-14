// This script tests trading functionality with the TestToken
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Testing trading functionality...");
  
  // Load contract addresses
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
  
  // Get signers (accounts)
  const [owner, trader1, trader2] = await hre.ethers.getSigners();
  console.log(`Owner: ${owner.address}`);
  console.log(`Trader1: ${trader1.address}`);
  console.log(`Trader2: ${trader2.address}`);
  
  // Get TestToken instance
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  const testToken = TestToken.attach(testTokenAddress);
  
  // Check balances before operations
  const ownerBalance = await testToken.balanceOf(owner.address);
  const trader1Balance = await testToken.balanceOf(trader1.address);
  const trader2Balance = await testToken.balanceOf(trader2.address);
  
  console.log("\nInitial balances:");
  console.log(`Owner: ${hre.ethers.formatEther(ownerBalance)} TEST`);
  console.log(`Trader1: ${hre.ethers.formatEther(trader1Balance)} TEST`);
  console.log(`Trader2: ${hre.ethers.formatEther(trader2Balance)} TEST`);
  
  console.log("\n--- Testing Direct Token Transfer ---");
  // Transfer some tokens from owner to trader2 (simulating a direct transfer)
  const transferAmount = hre.ethers.parseEther("500");
  console.log(`Transferring ${hre.ethers.formatEther(transferAmount)} TEST from Owner to Trader2`);
  
  const transferTx = await testToken.connect(owner).transfer(trader2.address, transferAmount);
  await transferTx.wait();
  
  // Check balances after transfer
  const ownerBalanceAfterTransfer = await testToken.balanceOf(owner.address);
  const trader2BalanceAfterTransfer = await testToken.balanceOf(trader2.address);
  
  console.log("\nBalances after direct transfer:");
  console.log(`Owner: ${hre.ethers.formatEther(ownerBalanceAfterTransfer)} TEST`);
  console.log(`Trader2: ${hre.ethers.formatEther(trader2BalanceAfterTransfer)} TEST`);
  
  console.log("\n--- Testing Swap Functionality ---");
  // For a real swap, we would need a swap contract, but here we'll simulate it
  // by doing a token approval and then a transfer
  
  // First, trader1 approves a spending allowance for owner (simulating approval for swap contract)
  const approvalAmount = hre.ethers.parseEther("200");
  console.log(`Trader1 approving ${hre.ethers.formatEther(approvalAmount)} TEST for Owner to spend`);
  
  const approvalTx = await testToken.connect(trader1).approve(owner.address, approvalAmount);
  await approvalTx.wait();
  
  // Check allowance
  const allowance = await testToken.allowance(trader1.address, owner.address);
  console.log(`Allowance after approval: ${hre.ethers.formatEther(allowance)} TEST`);
  
  // Now owner can transfer the approved tokens from trader1 (simulating a swap)
  const swapAmount = hre.ethers.parseEther("150");
  console.log(`Swapping ${hre.ethers.formatEther(swapAmount)} TEST from Trader1 to Owner`);
  
  const swapTx = await testToken.connect(owner).transferFrom(trader1.address, owner.address, swapAmount);
  await swapTx.wait();
  
  // Check balances after swap
  const ownerBalanceAfterSwap = await testToken.balanceOf(owner.address);
  const trader1BalanceAfterSwap = await testToken.balanceOf(trader1.address);
  
  console.log("\nBalances after swap:");
  console.log(`Owner: ${hre.ethers.formatEther(ownerBalanceAfterSwap)} TEST`);
  console.log(`Trader1: ${hre.ethers.formatEther(trader1BalanceAfterSwap)} TEST`);
  
  console.log("\n--- Testing Spot Trading ---");
  // Spot trading would involve a more complex contract with order books,
  // but we'll simulate it with a direct token exchange
  
  // Trader1 and Trader2 exchange tokens directly (simulating spot trade)
  const spotAmount = hre.ethers.parseEther("100");
  console.log(`Trader2 approving ${hre.ethers.formatEther(spotAmount)} TEST for Trader1`);
  
  const spotApprovalTx = await testToken.connect(trader2).approve(trader1.address, spotAmount);
  await spotApprovalTx.wait();
  
  console.log(`Spot trading ${hre.ethers.formatEther(spotAmount)} TEST from Trader2 to Trader1`);
  const spotTradeTx = await testToken.connect(trader1).transferFrom(trader2.address, trader1.address, spotAmount);
  await spotTradeTx.wait();
  
  // Check final balances
  const trader1FinalBalance = await testToken.balanceOf(trader1.address);
  const trader2FinalBalance = await testToken.balanceOf(trader2.address);
  
  console.log("\nFinal balances after spot trade:");
  console.log(`Trader1: ${hre.ethers.formatEther(trader1FinalBalance)} TEST`);
  console.log(`Trader2: ${hre.ethers.formatEther(trader2FinalBalance)} TEST`);
  
  console.log("\nAll trading tests completed successfully!");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });