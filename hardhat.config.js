require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || undefined;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false
    }
  },
  networks: {
    // Local dev: `npx hardhat node` then deploy:local
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    // X Layer testnet (chain ID 1952) — free testnet OKB from faucet
    xlayerTestnet: {
      url: process.env.X_LAYER_TESTNET_RPC || "https://testrpc.xlayer.tech",
      chainId: 1952,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : []
    },
    // X Layer mainnet (chain ID 196)
    xlayer: {
      url: process.env.X_LAYER_RPC || "https://rpc.xlayer.tech",
      chainId: 196,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      xlayer: "empty",
      xlayerTestnet: "empty"
    },
    customChains: [
      {
        network: "xlayer",
        chainId: 196,
        urls: {
          apiURL: "https://www.oklink.com/api/v5/explorer/contract/verify",
          browserURL: "https://www.oklink.com/x-layer"
        }
      },
      {
        network: "xlayerTestnet",
        chainId: 1952,
        urls: {
          apiURL: "https://www.oklink.com/api/v5/explorer/contract/verify",
          browserURL: "https://www.oklink.com/x-layer-testnet"
        }
      }
    ]
  }
};
