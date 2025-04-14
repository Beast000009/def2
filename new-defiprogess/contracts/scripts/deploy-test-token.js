// This script deploys a test token to your local Ganache network
const hre = require("hardhat");

async function main() {
  console.log("Deploying TestToken...");
  
  // Get the contract factory
  const TestToken = await hre.ethers.getContractFactory("TestToken");
  
  // Deploy TestToken with the name "Test Token" and symbol "TEST"
  const testToken = await TestToken.deploy("Test Token", "TEST");
  
  // Wait for the deployment to be confirmed
  await testToken.waitForDeployment();
  
  // Get the deployed contract address
  const testTokenAddress = await testToken.getAddress();
  
  console.log(`TestToken deployed to: ${testTokenAddress}`);
  
  // Get the deployer's address
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`1,000,000 TEST tokens minted to ${deployer.address}`);
  
  // Save the contract address to a file for later use
  const fs = require("fs");
  const contractData = {
    TestToken: testTokenAddress
  };
  
  fs.writeFileSync(
    "contracts/test-token-address.json",
    JSON.stringify(contractData, null, 2)
  );
  console.log("Contract address saved to contracts/test-token-address.json");
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });