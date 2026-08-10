export type NetworkId = "testnet" | "mainnet";

export interface ChainConfig {
  id: NetworkId;
  label: string;
  shortLabel: string;
  chainId: number;
  chainIdHex: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const CHAINS: Record<NetworkId, ChainConfig> = {
  testnet: {
    id: "testnet",
    label: "X Layer Testnet",
    shortLabel: "testnet",
    chainId: 1952,
    chainIdHex: "0x7A0",
    chainName: "X Layer Testnet",
    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
    rpcUrls: ["https://testrpc.xlayer.tech"],
    blockExplorerUrls: ["https://www.oklink.com/x-layer-testnet"],
  },
  mainnet: {
    id: "mainnet",
    label: "X Layer Mainnet",
    shortLabel: "mainnet",
    chainId: 196,
    chainIdHex: "0xC4",
    chainName: "X Layer Mainnet",
    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
    rpcUrls: ["https://rpc.xlayer.tech"],
    blockExplorerUrls: ["https://www.oklink.com/x-layer"],
  },
};

export const NETWORKS: NetworkId[] = ["testnet", "mainnet"];
