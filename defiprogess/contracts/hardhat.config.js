require("@nomicfoundation/hardhat-toolbox");

// Auto-deploy script
const fs = require("fs");
const path = require("path");

// Don't import ethers from hardhat directly in the config - this causes circular reference
// We'll use it in the onStart function

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545/",
      chainId: 31337,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  // Node configuration with auto-deployment
  node: {
    // Enable JSON-RPC logging
    logging: {
      rpc: false, // Set to true for verbose RPC logs
    }
  }
};