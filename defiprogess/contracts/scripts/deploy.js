// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // Deploy TokenSwap contract
  console.log("Deploying TokenSwap contract...");
  const TokenSwap = await ethers.getContractFactory("TokenSwap");
  const tokenSwap = await TokenSwap.deploy();
  await tokenSwap.waitForDeployment();
  const tokenSwapAddress = await tokenSwap.getAddress();
  console.log(`TokenSwap deployed to: ${tokenSwapAddress}`);

  // Deploy SpotTrading contract
  console.log("Deploying SpotTrading contract...");
  const SpotTrading = await ethers.getContractFactory("SpotTrading");
  const spotTrading = await SpotTrading.deploy();
  await spotTrading.waitForDeployment();
  const spotTradingAddress = await spotTrading.getAddress();
  console.log(`SpotTrading deployed to: ${spotTradingAddress}`);

  // Deploy test tokens (for development environment)
  console.log("Deploying test tokens...");
  
  // Create a simple ERC20 token contract for testing
  const ERC20Token = await ethers.getContractFactory("ERC20Mock");
  
  // Deploy ETH token
  const ethToken = await ERC20Token.deploy("Wrapped Ether", "WETH", 18);
  await ethToken.waitForDeployment();
  const ethTokenAddress = await ethToken.getAddress();
  console.log(`ETH Token deployed to: ${ethTokenAddress}`);
  
  // Deploy USDT token
  const usdtToken = await ERC20Token.deploy("Tether USD", "USDT", 6);
  await usdtToken.waitForDeployment();
  const usdtTokenAddress = await usdtToken.getAddress();
  console.log(`USDT Token deployed to: ${usdtTokenAddress}`);
  
  // Deploy BTC token
  const btcToken = await ERC20Token.deploy("Wrapped Bitcoin", "WBTC", 8);
  await btcToken.waitForDeployment();
  const btcTokenAddress = await btcToken.getAddress();
  console.log(`BTC Token deployed to: ${btcTokenAddress}`);
  
  // Deploy LINK token
  const linkToken = await ERC20Token.deploy("Chainlink Token", "LINK", 18);
  await linkToken.waitForDeployment();
  const linkTokenAddress = await linkToken.getAddress();
  console.log(`LINK Token deployed to: ${linkTokenAddress}`);
  
  // Add tokens to supported tokens list
  console.log("Adding tokens to supported tokens list...");
  await tokenSwap.addSupportedToken(ethTokenAddress);
  await tokenSwap.addSupportedToken(usdtTokenAddress);
  await tokenSwap.addSupportedToken(btcTokenAddress);
  await tokenSwap.addSupportedToken(linkTokenAddress);
  
  await spotTrading.addSupportedToken(ethTokenAddress);
  await spotTrading.addSupportedToken(usdtTokenAddress);
  await spotTrading.addSupportedToken(btcTokenAddress);
  await spotTrading.addSupportedToken(linkTokenAddress);
  
  // Set exchange rates
  console.log("Setting exchange rates...");
  
  // ETH/USDT: 1 ETH = 3000 USDT
  await tokenSwap.setExchangeRate(
    ethTokenAddress, 
    usdtTokenAddress, 
    ethers.parseUnits("3000", 18)
  );
  
  // USDT/ETH: 1 USDT = 0.000333 ETH
  await tokenSwap.setExchangeRate(
    usdtTokenAddress, 
    ethTokenAddress, 
    ethers.parseUnits("0.000333", 18)
  );
  
  // BTC/USDT: 1 BTC = 60000 USDT
  await tokenSwap.setExchangeRate(
    btcTokenAddress, 
    usdtTokenAddress, 
    ethers.parseUnits("60000", 18)
  );
  
  // USDT/BTC: 1 USDT = 0.0000166 BTC
  await tokenSwap.setExchangeRate(
    usdtTokenAddress, 
    btcTokenAddress, 
    ethers.parseUnits("0.0000166", 18)
  );
  
  // LINK/USDT: 1 LINK = 15 USDT
  await tokenSwap.setExchangeRate(
    linkTokenAddress, 
    usdtTokenAddress, 
    ethers.parseUnits("15", 18)
  );
  
  // USDT/LINK: 1 USDT = 0.0666 LINK
  await tokenSwap.setExchangeRate(
    usdtTokenAddress, 
    linkTokenAddress, 
    ethers.parseUnits("0.0666", 18)
  );
  
  // Mint some tokens to the deployer for testing
  console.log("Minting tokens to deployer...");
  await ethToken.mint(deployer.address, ethers.parseUnits("100", 18));
  await usdtToken.mint(deployer.address, ethers.parseUnits("300000", 6));
  await btcToken.mint(deployer.address, ethers.parseUnits("5", 8));
  await linkToken.mint(deployer.address, ethers.parseUnits("10000", 18));
  
  console.log("Deployment complete!");
  console.log("\nContract addresses for frontend:");
  console.log(`TOKEN_SWAP: "${tokenSwapAddress}",`);
  console.log(`SPOT_TRADING: "${spotTradingAddress}",`);
  console.log(`ETH: "${ethTokenAddress}",`);
  console.log(`USDT: "${usdtTokenAddress}",`);
  console.log(`BTC: "${btcTokenAddress}",`);
  console.log(`LINK: "${linkTokenAddress}",`);
  
  // Create a deployment details file
  const deploymentDetails = {
    TOKEN_SWAP: tokenSwapAddress,
    SPOT_TRADING: spotTradingAddress,
    ETH: ethTokenAddress,
    USDT: usdtTokenAddress,
    BTC: btcTokenAddress,
    LINK: linkTokenAddress
  };
  
  // Write deployment details to file
  const deploymentDetailsPath = path.join(__dirname, '..', 'deployment-details.json');
  fs.writeFileSync(
    deploymentDetailsPath,
    JSON.stringify(deploymentDetails, null, 2)
  );
  
  console.log(`\nDeployment details saved to ${deploymentDetailsPath}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});