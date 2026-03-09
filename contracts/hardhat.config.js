require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // Local development
    hardhat: {},

    // Celo Sepolia — PRIMARY testnet (replaces Alfajores, Sept 2025)
    // Chain ID: 11142220 · Explorer: celo-sepolia.blockscout.com
    // Faucet: faucet.celo.org/celo-sepolia
    celoSepolia: {
      url: "https://forno.celo-sepolia.celo-testnet.org",
      accounts: [PRIVATE_KEY],
      chainId: 11142220,
      // No hardcoded gasPrice — let the network report its own base fee
    },

    // Celo Alfajores — legacy testnet (sunsets Sept 30 2025)
    // Keep for backwards compatibility during transition
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      accounts: [PRIVATE_KEY],
      chainId: 44787,
    },

    // Celo mainnet — only after audit
    celo: {
      url: "https://forno.celo.org",
      accounts: [PRIVATE_KEY],
      chainId: 42220,
    },
  },
  etherscan: {
    apiKey: {
      celoSepolia: process.env.BLOCKSCOUT_API_KEY || "any", // Blockscout doesn't require a key
      alfajores: process.env.CELOSCAN_API_KEY || "",
      celo: process.env.CELOSCAN_API_KEY || "",
    },
    customChains: [
      // Celo Sepolia — uses Blockscout (not Celoscan)
      {
        network: "celoSepolia",
        chainId: 11142220,
        urls: {
          apiURL: "https://celo-sepolia.blockscout.com/api",
          browserURL: "https://celo-sepolia.blockscout.com",
        },
      },
      // Alfajores (legacy)
      {
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/api",
          browserURL: "https://alfajores.celoscan.io",
        },
      },
      // Celo mainnet
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    token: "CELO",
  },
};