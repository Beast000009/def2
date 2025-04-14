const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts and initializing tokens...");

  // Get several test accounts
  const [deployer, user1, user2, user3] = await hre.ethers.getSigners();
  
  console.log("Deployer address:", deployer.address);
  console.log("Test accounts:");
  console.log("User1:", user1.address);
  console.log("User2:", user2.address);
  console.log("User3:", user3.address);
  
  // Deploy TokenSwap
  console.log("\nDeploying TokenSwap...");
  const TokenSwap = await hre.ethers.getContractFactory("TokenSwap");
  const tokenSwap = await TokenSwap.deploy();
  await tokenSwap.waitForDeployment();
  const tokenSwapAddress = await tokenSwap.getAddress();
  console.log("TokenSwap deployed to:", tokenSwapAddress);

  // Deploy SpotTrading
  console.log("\nDeploying SpotTrading...");
  const SpotTrading = await hre.ethers.getContractFactory("SpotTrading");
  const spotTrading = await SpotTrading.deploy();
  await spotTrading.waitForDeployment();
  const spotTradingAddress = await spotTrading.getAddress();
  console.log("SpotTrading deployed to:", spotTradingAddress);

  // Deploy mock tokens
  console.log("\nDeploying mock tokens...");
  
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

  // Mint tokens to accounts
  console.log("\nMinting tokens to test accounts...");
  
  // Mint to deployer
  console.log("Minting to deployer:", deployer.address);
  await ethToken.mint(deployer.address, hre.ethers.parseEther("50"));
  await btcToken.mint(deployer.address, hre.ethers.parseUnits("2", 8));
  await usdtToken.mint(deployer.address, hre.ethers.parseUnits("100000", 6));
  await linkToken.mint(deployer.address, hre.ethers.parseEther("5000"));
  
  // Mint to user1
  console.log("Minting to user1:", user1.address);
  await ethToken.mint(user1.address, hre.ethers.parseEther("20"));
  await btcToken.mint(user1.address, hre.ethers.parseUnits("0.75", 8));
  await usdtToken.mint(user1.address, hre.ethers.parseUnits("50000", 6));
  await linkToken.mint(user1.address, hre.ethers.parseEther("2000"));
  
  // Mint to user2
  console.log("Minting to user2:", user2.address);
  await ethToken.mint(user2.address, hre.ethers.parseEther("15"));
  await btcToken.mint(user2.address, hre.ethers.parseUnits("0.5", 8));
  await usdtToken.mint(user2.address, hre.ethers.parseUnits("40000", 6));
  await linkToken.mint(user2.address, hre.ethers.parseEther("1500"));
  
  // Mint to user3
  console.log("Minting to user3:", user3.address);
  await ethToken.mint(user3.address, hre.ethers.parseEther("10"));
  await btcToken.mint(user3.address, hre.ethers.parseUnits("0.25", 8));
  await usdtToken.mint(user3.address, hre.ethers.parseUnits("30000", 6));
  await linkToken.mint(user3.address, hre.ethers.parseEther("1000"));
  
  console.log("All tokens minted successfully");

  // Verify balances
  console.log("\nVerifying token balances...");
  
  try {
    // Deployer balances
    console.log("Deployer balances:");
    const deployerEthBalance = await ethToken.balanceOf(deployer.address);
    const deployerBtcBalance = await btcToken.balanceOf(deployer.address);
    const deployerUsdtBalance = await usdtToken.balanceOf(deployer.address);
    const deployerLinkBalance = await linkToken.balanceOf(deployer.address);
    
    console.log("ETH:", hre.ethers.formatEther(deployerEthBalance));
    console.log("BTC:", hre.ethers.formatUnits(deployerBtcBalance, 8));
    console.log("USDT:", hre.ethers.formatUnits(deployerUsdtBalance, 6));
    console.log("LINK:", hre.ethers.formatEther(deployerLinkBalance));
    
    // User1 balances
    console.log("\nUser1 balances:");
    const user1EthBalance = await ethToken.balanceOf(user1.address);
    const user1BtcBalance = await btcToken.balanceOf(user1.address);
    const user1UsdtBalance = await usdtToken.balanceOf(user1.address);
    const user1LinkBalance = await linkToken.balanceOf(user1.address);
    
    console.log("ETH:", hre.ethers.formatEther(user1EthBalance));
    console.log("BTC:", hre.ethers.formatUnits(user1BtcBalance, 8));
    console.log("USDT:", hre.ethers.formatUnits(user1UsdtBalance, 6));
    console.log("LINK:", hre.ethers.formatEther(user1LinkBalance));
  } catch (error) {
    console.error("Error verifying balances:", error.message);
  }

  // Save the new contract addresses to a JSON file
  const fs = require("fs");
  const contractAddresses = {
    TOKEN_SWAP: tokenSwapAddress,
    SPOT_TRADING: spotTradingAddress,
    ETH: ethTokenAddress,
    USDT: usdtTokenAddress,
    BTC: btcTokenAddress,
    LINK: linkTokenAddress
  };
  
  fs.writeFileSync(
    "./contract-addresses.json", 
    JSON.stringify(contractAddresses, null, 2)
  );
  console.log("\nContract addresses saved to contract-addresses.json");
  
  console.log("\nDeployment, initialization, and minting complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });