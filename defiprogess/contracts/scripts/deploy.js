const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Get the default signer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  // Deploy TokenSwap
  const TokenSwap = await hre.ethers.getContractFactory("TokenSwap");
  const tokenSwap = await TokenSwap.deploy();
  await tokenSwap.waitForDeployment();
  const tokenSwapAddress = await tokenSwap.getAddress();
  console.log("TokenSwap deployed to:", tokenSwapAddress);

  // Deploy SpotTrading
  const SpotTrading = await hre.ethers.getContractFactory("SpotTrading");
  const spotTrading = await SpotTrading.deploy();
  await spotTrading.waitForDeployment();
  const spotTradingAddress = await spotTrading.getAddress();
  console.log("SpotTrading deployed to:", spotTradingAddress);

  // Deploy ETH token
  const ETHToken = await hre.ethers.getContractFactory("ERC20Mock");
  const ethToken = await ETHToken.deploy("Wrapped Ether", "ETH", 18);
  await ethToken.waitForDeployment();
  const ethTokenAddress = await ethToken.getAddress();
  console.log("ETH Token deployed to:", ethTokenAddress);

  // Deploy USDT token
  const USDTToken = await hre.ethers.getContractFactory("ERC20Mock");
  const usdtToken = await USDTToken.deploy("Tether USD", "USDT", 6);
  await usdtToken.waitForDeployment();
  const usdtTokenAddress = await usdtToken.getAddress();
  console.log("USDT Token deployed to:", usdtTokenAddress);

  // Deploy BTC token
  const BTCToken = await hre.ethers.getContractFactory("ERC20Mock");
  const btcToken = await BTCToken.deploy("Wrapped Bitcoin", "BTC", 8);
  await btcToken.waitForDeployment();
  const btcTokenAddress = await btcToken.getAddress();
  console.log("BTC Token deployed to:", btcTokenAddress);

  // Deploy LINK token
  const LINKToken = await hre.ethers.getContractFactory("ERC20Mock");
  const linkToken = await LINKToken.deploy("Chainlink Token", "LINK", 18);
  await linkToken.waitForDeployment();
  const linkTokenAddress = await linkToken.getAddress();
  console.log("LINK Token deployed to:", linkTokenAddress);

  console.log("\nAll contracts deployed successfully!");
  console.log("\nContract Addresses:");
  console.log("TOKEN_SWAP:", tokenSwapAddress);
  console.log("SPOT_TRADING:", spotTradingAddress);
  console.log("ETH:", ethTokenAddress);
  console.log("USDT:", usdtTokenAddress);
  console.log("BTC:", btcTokenAddress);
  console.log("LINK:", linkTokenAddress);

  // Add supported tokens to TokenSwap
  console.log("\nAdding tokens to TokenSwap...");
  await tokenSwap.addSupportedToken(ethTokenAddress);
  await tokenSwap.addSupportedToken(usdtTokenAddress);
  await tokenSwap.addSupportedToken(btcTokenAddress);
  await tokenSwap.addSupportedToken(linkTokenAddress);
  console.log("Tokens added to TokenSwap");

  // Add supported tokens to SpotTrading
  console.log("\nAdding tokens to SpotTrading...");
  await spotTrading.addSupportedToken(ethTokenAddress);
  await spotTrading.addSupportedToken(usdtTokenAddress);
  await spotTrading.addSupportedToken(btcTokenAddress);
  await spotTrading.addSupportedToken(linkTokenAddress);
  console.log("Tokens added to SpotTrading");

  // Set exchange rates in TokenSwap
  console.log("\nSetting exchange rates...");
  // ETH to USDT: 1 ETH = 3000 USDT
  await tokenSwap.setExchangeRate(
    ethTokenAddress, 
    usdtTokenAddress, 
    hre.ethers.parseEther("3000")
  );
  
  // USDT to ETH: 1 USDT = 0.000333... ETH
  await tokenSwap.setExchangeRate(
    usdtTokenAddress, 
    ethTokenAddress, 
    hre.ethers.parseEther("0.000333")
  );
  
  // BTC to USDT: 1 BTC = 60000 USDT
  await tokenSwap.setExchangeRate(
    btcTokenAddress, 
    usdtTokenAddress, 
    hre.ethers.parseEther("60000")
  );
  
  // USDT to BTC: 1 USDT = 0.0000166... BTC
  await tokenSwap.setExchangeRate(
    usdtTokenAddress, 
    btcTokenAddress, 
    hre.ethers.parseEther("0.0000166")
  );
  
  // LINK to USDT: 1 LINK = 15 USDT
  await tokenSwap.setExchangeRate(
    linkTokenAddress, 
    usdtTokenAddress, 
    hre.ethers.parseEther("15")
  );
  
  // USDT to LINK: 1 USDT = 0.0666... LINK
  await tokenSwap.setExchangeRate(
    usdtTokenAddress, 
    linkTokenAddress, 
    hre.ethers.parseEther("0.0666")
  );
  console.log("Exchange rates set");

  // Mint tokens to a demo wallet
  console.log("\nMinting tokens to demo wallet...");
  
  // Mint 10 ETH tokens
  await ethToken.mint(deployer.address, hre.ethers.parseEther("10"));
  
  // Mint 0.5 BTC tokens
  await btcToken.mint(deployer.address, hre.ethers.parseUnits("0.5", 8));
  
  // Mint 30000 USDT tokens
  await usdtToken.mint(deployer.address, hre.ethers.parseUnits("30000", 6));
  
  // Mint 1000 LINK tokens
  await linkToken.mint(deployer.address, hre.ethers.parseEther("1000"));
  
  console.log("Tokens minted to:", deployer.address);
  console.log("Deployment and initialization complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });