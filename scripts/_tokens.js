/**
 * Token addresses used by scripts (seed.js). Real bridged USDC on X Layer
 * mainnet/testnet — verify on-chain before using with real funds.
 */
module.exports = {
  USDC_ADDRESSES: {
    // X Layer mainnet
    xlayer: "0x74b7f16337b8972027f6196a17a631ac6de26f22",
    // X Layer testnet (Circle-issued USDC, chain 1952)
    xlayerTestnet: "0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3"
  },
  TOKEN_ALIASES: {
    localhost: "PUSD (mock)",
    xlayer: "USDC (bridged)",
    xlayerTestnet: "USDC (bridged)"
  }
};
