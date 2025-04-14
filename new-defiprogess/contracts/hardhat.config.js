require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    // Default hardhat network
    hardhat: {
      chainId: 31337,
    },
    // Running hardhat node
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Local Ganache network
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 5777, // Standard Ganache chainId
      accounts: {
        // This will use the default accounts that come with Ganache
        mnemonic: "test test test test test test test test test test test junk",
      },
    },
    // Ganache UI (if you're using the desktop app)
    ganacheUI: {
      url: "http://127.0.0.1:7545",
      chainId: 1337, // Ganache UI default chainId
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
};
