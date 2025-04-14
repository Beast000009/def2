// Test script to interact with the API for swap and spot trading
const axios = require('axios');

// Test account (use one from the Hardhat accounts)
const WALLET_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Account #1

// API base URL
const API_URL = 'http://localhost:5001/api';

// Token IDs (1 is ETH in the default configuration)
const ETH_TOKEN_ID = 1;
const TEST_TOKEN_ID = 2; // TEST token 

async function testAPI() {
  try {
    console.log('---------- Testing DeFi Platform API ----------');
    
    // Check available tokens
    console.log('\n1. Checking available tokens:');
    const tokensResponse = await axios.get(`${API_URL}/tokens`);
    console.log(JSON.stringify(tokensResponse.data, null, 2));
    
    // Get current gas price
    console.log('\n2. Checking current gas price:');
    const gasPriceResponse = await axios.get(`${API_URL}/gas-price`);
    console.log(JSON.stringify(gasPriceResponse.data, null, 2));
    
    // Get token prices
    console.log('\n3. Checking token prices:');
    const pricesResponse = await axios.get(`${API_URL}/prices`);
    console.log(JSON.stringify(pricesResponse.data, null, 2));

    // Get portfolio for the wallet
    console.log(`\n4. Checking portfolio for ${WALLET_ADDRESS}:`);
    try {
      const portfolioResponse = await axios.get(`${API_URL}/portfolio/${WALLET_ADDRESS}`);
      console.log(JSON.stringify(portfolioResponse.data, null, 2));
    } catch (error) {
      console.log('Portfolio not available or error:', error.response?.data || error.message);
    }
    
    // Test swap functionality
    console.log('\n5. Testing swap functionality:');
    try {
      const swapResponse = await axios.post(`${API_URL}/swap`, {
        fromTokenId: TEST_TOKEN_ID,  // From TEST
        toTokenId: ETH_TOKEN_ID,     // To ETH
        fromAmount: '10',            // Amount to swap
        walletAddress: WALLET_ADDRESS
      });
      console.log('Swap result:');
      console.log(JSON.stringify(swapResponse.data, null, 2));
    } catch (error) {
      console.log('Swap failed:', error.response?.data || error.message);
    }
    
    // Test spot trading functionality
    console.log('\n6. Testing spot trading functionality:');
    try {
      const spotTradeResponse = await axios.post(`${API_URL}/trade`, {
        tokenId: TEST_TOKEN_ID,      // TEST token
        baseTokenId: ETH_TOKEN_ID,   // Base is ETH
        amount: '5',                 // Amount to trade
        price: '0.01',               // Price in ETH
        type: 'sell',                // Sell order
        walletAddress: WALLET_ADDRESS
      });
      console.log('Spot trade result:');
      console.log(JSON.stringify(spotTradeResponse.data, null, 2));
    } catch (error) {
      console.log('Spot trade failed:', error.response?.data || error.message);
    }
    
    // Check transactions history
    console.log(`\n7. Checking transaction history for ${WALLET_ADDRESS}:`);
    try {
      const txResponse = await axios.get(`${API_URL}/transactions/${WALLET_ADDRESS}`);
      console.log(JSON.stringify(txResponse.data, null, 2));
    } catch (error) {
      console.log('Transaction history not available or error:', error.response?.data || error.message);
    }
    
    console.log('\n---------- API Tests Completed ----------');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the tests
testAPI();