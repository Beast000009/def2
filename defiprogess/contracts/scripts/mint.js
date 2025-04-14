const hre = require("hardhat");

// Token contract addresses (these should match the ones in blockchain-server.cjs)
const TOKEN_ADDRESSES = {
  ETH: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  USDT: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
  BTC: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
  LINK: "0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e"
};

async function main() {
  console.log("Running token minting script...");

  // Get several test accounts
  const [deployer, user1, user2, user3] = await hre.ethers.getSigners();
  
  console.log("Minting tokens to these accounts:");
  console.log("1.", deployer.address, " (deployer/owner)");
  console.log("2.", user1.address);
  console.log("3.", user2.address);
  console.log("4.", user3.address);

  // Connect to each token contract
  const ethToken = await hre.ethers.getContractAt("ERC20Mock", TOKEN_ADDRESSES.ETH);
  const usdtToken = await hre.ethers.getContractAt("ERC20Mock", TOKEN_ADDRESSES.USDT);
  const btcToken = await hre.ethers.getContractAt("ERC20Mock", TOKEN_ADDRESSES.BTC);
  const linkToken = await hre.ethers.getContractAt("ERC20Mock", TOKEN_ADDRESSES.LINK);

  // Mint tokens to deployer (already done, but adding more)
  console.log("\nMinting additional tokens to deployer...");
  await ethToken.mint(deployer.address, hre.ethers.parseEther("50"));
  await btcToken.mint(deployer.address, hre.ethers.parseUnits("2", 8));
  await usdtToken.mint(deployer.address, hre.ethers.parseUnits("100000", 6));
  await linkToken.mint(deployer.address, hre.ethers.parseEther("5000"));
  console.log("Tokens minted to deployer");

  // Mint tokens to user1
  console.log("\nMinting tokens to user1...");
  await ethToken.mint(user1.address, hre.ethers.parseEther("20"));
  await btcToken.mint(user1.address, hre.ethers.parseUnits("0.75", 8));
  await usdtToken.mint(user1.address, hre.ethers.parseUnits("50000", 6));
  await linkToken.mint(user1.address, hre.ethers.parseEther("2000"));
  console.log("Tokens minted to user1");

  // Mint tokens to user2
  console.log("\nMinting tokens to user2...");
  await ethToken.mint(user2.address, hre.ethers.parseEther("15"));
  await btcToken.mint(user2.address, hre.ethers.parseUnits("0.5", 8));
  await usdtToken.mint(user2.address, hre.ethers.parseUnits("40000", 6));
  await linkToken.mint(user2.address, hre.ethers.parseEther("1500"));
  console.log("Tokens minted to user2");

  // Mint tokens to user3
  console.log("\nMinting tokens to user3...");
  await ethToken.mint(user3.address, hre.ethers.parseEther("10"));
  await btcToken.mint(user3.address, hre.ethers.parseUnits("0.25", 8));
  await usdtToken.mint(user3.address, hre.ethers.parseUnits("30000", 6));
  await linkToken.mint(user3.address, hre.ethers.parseEther("1000"));
  console.log("Tokens minted to user3");

  // Print summary of minted tokens
  console.log("\nToken minting complete!\n");
  console.log("Token Addresses:");
  console.log("ETH:", TOKEN_ADDRESSES.ETH);
  console.log("USDT:", TOKEN_ADDRESSES.USDT);
  console.log("BTC:", TOKEN_ADDRESSES.BTC);
  console.log("LINK:", TOKEN_ADDRESSES.LINK);

  // Get token balances for verification
  const deployerEthBalance = await ethToken.balanceOf(deployer.address);
  console.log("\nVerification - Deployer balances:");
  console.log("ETH:", hre.ethers.formatEther(deployerEthBalance));
  console.log("USDT:", hre.ethers.formatUnits(await usdtToken.balanceOf(deployer.address), 6));
  console.log("BTC:", hre.ethers.formatUnits(await btcToken.balanceOf(deployer.address), 8));
  console.log("LINK:", hre.ethers.formatEther(await linkToken.balanceOf(deployer.address)));

  console.log("\nVerification - User1 balances:");
  console.log("ETH:", hre.ethers.formatEther(await ethToken.balanceOf(user1.address)));
  console.log("USDT:", hre.ethers.formatUnits(await usdtToken.balanceOf(user1.address), 6));
  console.log("BTC:", hre.ethers.formatUnits(await btcToken.balanceOf(user1.address), 8));
  console.log("LINK:", hre.ethers.formatEther(await linkToken.balanceOf(user1.address)));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });