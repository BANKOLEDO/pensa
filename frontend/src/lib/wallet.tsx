import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CHAINS, type NetworkId } from "./chains";

const STORAGE_KEY = "pensa:wallet";
const STORAGE_NETWORK = "pensa:network";

type EthProvider = {
  request: (r: unknown) => Promise<unknown>;
};

interface WalletContextValue {
  wallet: string;
  connecting: boolean;
  network: NetworkId;
  setNetwork: (n: NetworkId) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue>({
  wallet: "",
  connecting: false,
  network: "mainnet",
  setNetwork: () => {},
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [network, setNetworkState] = useState<NetworkId>(() => {
    try {
      return (localStorage.getItem(STORAGE_NETWORK) as NetworkId) || "mainnet";
    } catch {
      return "mainnet";
    }
  });
  const [connecting, setConnecting] = useState(false);

  const switchToNetwork = useCallback(async (n: NetworkId) => {
    const eth = (window as unknown as { ethereum?: EthProvider }).ethereum;
    if (!eth) return;
    const chain = CHAINS[n];
    const addParams = {
      chainId: chain.chainIdHex,
      chainName: chain.chainName,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: chain.rpcUrls,
      blockExplorerUrls: chain.blockExplorerUrls,
    };
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chain.chainIdHex }] });
    } catch (e) {
      const code = (e as { code?: number }).code;
      if (code === 4902) {
        await eth.request({ method: "wallet_addEthereumChain", params: [addParams] });
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chain.chainIdHex }] });
      } else {
        throw e;
      }
    }
  }, []);

  const setNetwork = useCallback(
    async (n: NetworkId) => {
      setNetworkState(n);
      try {
        localStorage.setItem(STORAGE_NETWORK, n);
      } catch {
        /* ignore storage errors */
      }
      // Keep the connected wallet's chain in sync — without this, on-chain
      // signatures (createVault, allocation, strategy) target the wrong chain
      // and silently revert.
      try {
        await switchToNetwork(n);
      } catch {
        /* no wallet connected — ignore */
      }
    },
    [switchToNetwork]
  );

  const connect = useCallback(async () => {
    const eth = (window as unknown as { ethereum?: EthProvider }).ethereum;
    if (!eth) return;
    setConnecting(true);
    try {
      let accounts: string[];
      try {
        accounts = (await Promise.race([
          eth.request({ method: "eth_requestAccounts" }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Wallet request timed out — make sure your wallet extension is unlocked and enabled.")), 30000)),
        ])) as string[];
      } catch (e) {
        if (e instanceof Error && e.message.includes("timed out")) throw e;
        throw new Error(
          "Your wallet extension could not open a connection. If you use multiple wallet extensions, disable all but one, then retry."
        );
      }
      const addr = accounts[0];
      await switchToNetwork(network);
      setWallet(addr);
      try {
        localStorage.setItem(STORAGE_KEY, addr);
      } catch {
        /* ignore storage errors */
      }
    } finally {
      setConnecting(false);
    }
  }, [network, switchToNetwork]);

  const disconnect = useCallback(() => {
    setWallet("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const value = useMemo(
    () => ({ wallet, connecting, network, setNetwork, connect, disconnect }),
    [wallet, connecting, network, setNetwork, connect, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  return useContext(WalletContext);
}
