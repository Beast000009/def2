const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Connecting to Hardhat Network...");
    
    // Get the provider
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // Get network information
    const network = await provider.getNetwork();
    console.log("Connected to network:", {
      name: network.name,
      chainId: network.chainId,
    });
    
    // Check if we can get accounts
    const accounts = await provider.listAccounts();
    console.log(`Found ${accounts.length} accounts`);
    if (accounts.length > 0) {
      console.log("First account:", accounts[0]);
      
      // Check balance of first account
      const balance = await provider.getBalance(accounts[0]);
      console.log("Balance of first account:", ethers.formatEther(balance), "ETH");
    }
    
    // Check the test token address
    const testTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    console.log("Checking TEST token at address:", testTokenAddress);
    
    // Get contract code
    const code = await provider.getCode(testTokenAddress);
    console.log("Contract code length:", code.length);
    console.log("Is contract deployed:", code !== "0x");
    
    if (code !== "0x") {
      // Try to get the token info
      const abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address account) view returns (uint256)"
      ];
      
      const token = new ethers.Contract(testTokenAddress, abi, provider);
      const name = await token.name();
      const symbol = await token.symbol();
      const decimals = await token.decimals();
      const totalSupply = await token.totalSupply();
      
      console.log("Token info:", {
        name,
        symbol,
        decimals: decimals.toString(),
        totalSupply: ethers.formatUnits(totalSupply, decimals)
      });
      
      // Check balance of test accounts
      const testAccounts = [
        "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Deployer
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"  // Recipient
      ];
      
      for (const address of testAccounts) {
        const balance = await token.balanceOf(address);
        console.log(`TEST token balance for ${address}:`, ethers.formatUnits(balance, decimals));
      }
    }
    
  } catch (error) {
    console.error("Error during diagnosis:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });