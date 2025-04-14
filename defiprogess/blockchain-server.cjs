// blockchain-server.cjs
// This file sets up a simple server that deploys contracts to the local Hardhat node
// Use separate nonces to avoid conflicts with other transactions
// This is a one-time setup script that initializes the DeFi protocol

// Import the blockchain interface
const blockchainInterface = require('./server-direct.cjs');

async function main() {
  console.log('Starting blockchain with integrated DeFi app...');
  
  try {
    console.log('Hardhat node is ready. Deploying contracts...');
    
    // Destructure the blockchain interface
    const {
      tokenSwap,
      spotTrading,
      ethToken,
      usdtToken,
      btcToken,
      linkToken,
      CONTRACT_ADDRESSES,
      parseAmount
    } = blockchainInterface;
    
    // Setup transaction options with high gas limit for safety
    const txOptions = { gasLimit: 3000000 };
    
    console.log('Initializing DeFi protocol...');
    
    // Add supported tokens to TokenSwap
    console.log('Adding supported tokens to TokenSwap...');
    try {
      // Check if tokens are already supported to avoid nonce errors
      const ethSupported = await tokenSwap.supportedTokens(CONTRACT_ADDRESSES.ETH);
      if (!ethSupported) await tokenSwap.addSupportedToken(CONTRACT_ADDRESSES.ETH, txOptions);
      
      const usdtSupported = await tokenSwap.supportedTokens(CONTRACT_ADDRESSES.USDT);
      if (!usdtSupported) await tokenSwap.addSupportedToken(CONTRACT_ADDRESSES.USDT, txOptions);
      
      const btcSupported = await tokenSwap.supportedTokens(CONTRACT_ADDRESSES.BTC);
      if (!btcSupported) await tokenSwap.addSupportedToken(CONTRACT_ADDRESSES.BTC, txOptions);
      
      const linkSupported = await tokenSwap.supportedTokens(CONTRACT_ADDRESSES.LINK);
      if (!linkSupported) await tokenSwap.addSupportedToken(CONTRACT_ADDRESSES.LINK, txOptions);
    } catch (error) {
      console.log('Error adding supported tokens to TokenSwap, they may already be supported:', error.message);
    }
    
    // Add supported tokens to SpotTrading
    console.log('Adding supported tokens to SpotTrading...');
    try {
      // Check if tokens are already supported to avoid nonce errors
      const ethSupported = await spotTrading.supportedTokens(CONTRACT_ADDRESSES.ETH);
      if (!ethSupported) await spotTrading.addSupportedToken(CONTRACT_ADDRESSES.ETH, txOptions);
      
      const usdtSupported = await spotTrading.supportedTokens(CONTRACT_ADDRESSES.USDT);
      if (!usdtSupported) await spotTrading.addSupportedToken(CONTRACT_ADDRESSES.USDT, txOptions);
      
      const btcSupported = await spotTrading.supportedTokens(CONTRACT_ADDRESSES.BTC);
      if (!btcSupported) await spotTrading.addSupportedToken(CONTRACT_ADDRESSES.BTC, txOptions);
      
      const linkSupported = await spotTrading.supportedTokens(CONTRACT_ADDRESSES.LINK);
      if (!linkSupported) await spotTrading.addSupportedToken(CONTRACT_ADDRESSES.LINK, txOptions);
    } catch (error) {
      console.log('Error adding supported tokens to SpotTrading, they may already be supported:', error.message);
    }
    
    // Set exchange rates
    console.log('Setting exchange rates...');
    try {
      // ETH/USDT: 1 ETH = 3000 USDT
      await tokenSwap.setExchangeRate(
        CONTRACT_ADDRESSES.ETH, 
        CONTRACT_ADDRESSES.USDT, 
        parseAmount("3000", CONTRACT_ADDRESSES.ETH),
        txOptions
      );
      
      // USDT/ETH: 1 USDT = 0.000333 ETH
      await tokenSwap.setExchangeRate(
        CONTRACT_ADDRESSES.USDT, 
        CONTRACT_ADDRESSES.ETH, 
        parseAmount("0.000333", CONTRACT_ADDRESSES.ETH),
        txOptions
      );
      
      // BTC/USDT: 1 BTC = 60000 USDT
      await tokenSwap.setExchangeRate(
        CONTRACT_ADDRESSES.BTC, 
        CONTRACT_ADDRESSES.USDT, 
        parseAmount("60000", CONTRACT_ADDRESSES.ETH),
        txOptions
      );
      
      // USDT/BTC: 1 USDT = 0.0000166 BTC
      await tokenSwap.setExchangeRate(
        CONTRACT_ADDRESSES.USDT, 
        CONTRACT_ADDRESSES.BTC, 
        parseAmount("0.0000166", CONTRACT_ADDRESSES.ETH),
        txOptions
      );
      
      // LINK/USDT: 1 LINK = 15 USDT
      await tokenSwap.setExchangeRate(
        CONTRACT_ADDRESSES.LINK, 
        CONTRACT_ADDRESSES.USDT, 
        parseAmount("15", CONTRACT_ADDRESSES.ETH),
        txOptions
      );
      
      // USDT/LINK: 1 USDT = 0.0666 LINK
      await tokenSwap.setExchangeRate(
        CONTRACT_ADDRESSES.USDT, 
        CONTRACT_ADDRESSES.LINK, 
        parseAmount("0.0666", CONTRACT_ADDRESSES.ETH),
        txOptions
      );
    } catch (error) {
      console.log('Error setting exchange rates, they may already be set:', error.message);
    }
    
    // Mint tokens to demo wallet address
    console.log('Minting tokens to demo wallet address...');
    try {
      const demoWallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      
      await ethToken.mint(demoWallet, parseAmount("10", CONTRACT_ADDRESSES.ETH), txOptions);
      await usdtToken.mint(demoWallet, parseAmount("30000", CONTRACT_ADDRESSES.USDT), txOptions);
      await btcToken.mint(demoWallet, parseAmount("0.5", CONTRACT_ADDRESSES.BTC), txOptions);
      await linkToken.mint(demoWallet, parseAmount("1000", CONTRACT_ADDRESSES.LINK), txOptions);
    } catch (error) {
      console.log('Error minting tokens, they may already be minted:', error.message);
    }
    
    console.log('DeFi protocol initialization complete!');
    console.log('Ready to serve API requests.');
    console.log('Contract Addresses:');
    console.log(JSON.stringify(CONTRACT_ADDRESSES, null, 2));
    
  } catch (error) {
    console.error('Error initializing blockchain:', error);
    console.error(error.stack);
    // Don't exit on error, just log it
    // process.exit(1);
  }
}

main().catch(error => {
  console.error('Uncaught error in initialization:', error);
  console.error(error.stack);
});