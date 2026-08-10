import { ethers } from "ethers";
import type { SystemConfig } from "./types";

const FACTORY_ABI = [
  "function createVault(uint256 allocationPercent, address[] preferredAssets, uint256 riskTolerance) returns (address)",
  "function updateStrategy(bytes32 strategyHash)",
  "function updateAllocation(uint256 newAlloc)",
];

type EthereumProvider = {
  request: (r: unknown) => Promise<unknown>;
  on?: (e: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (e: string, cb: (...args: unknown[]) => void) => void;
};

function provider(): EthereumProvider {
  const eth = (window as unknown as { ethereum?: EthereumProvider }).ethereum;
  if (!eth) throw new Error("No web3 wallet detected — install OKX Wallet or MetaMask.");
  return eth;
}

async function getSigner(factory: string) {
  const eth = provider();
  const p = new ethers.BrowserProvider(eth as unknown as ethers.Eip1193Provider);
  const signer = await p.getSigner();
  return new ethers.Contract(factory, FACTORY_ABI, signer);
}

/** The reviewer signs a real createVault tx — the vault becomes THEIRS, not the agent's. */
export async function signCreateVault(
  factory: string,
  allocationPercent: number,
  preferredAssets: string[],
  riskTolerance: number,
  onTx?: (hash: string) => void
): Promise<string> {
  const contract = await getSigner(factory);
  const tx = await contract.createVault(allocationPercent, preferredAssets, riskTolerance);
  if (onTx) onTx(tx.hash);
  await tx.wait();
  return tx.hash;
}

/** The reviewer signs updateStrategy so the hash lands on THEIR vault. */
export async function signUpdateStrategy(factory: string, strategyHash: string, onTx?: (hash: string) => void): Promise<string> {
  const contract = await getSigner(factory);
  const tx = await contract.updateStrategy(strategyHash);
  if (onTx) onTx(tx.hash);
  await tx.wait();
  return tx.hash;
}

/** The reviewer signs updateAllocation so their vault's split changes on-chain. */
export async function signUpdateAllocation(factory: string, newAlloc: number, onTx?: (hash: string) => void): Promise<string> {
  const contract = await getSigner(factory);
  const tx = await contract.updateAllocation(newAlloc);
  if (onTx) onTx(tx.hash);
  await tx.wait();
  return tx.hash;
}

/** True when the backend is live on-chain (non-simulated) and has a real factory to sign against. */
export function isLiveConfig(config: SystemConfig | null): boolean {
  return !!config && !config.simulated && /^0x[0-9a-fA-F]{40}$/.test(config.factoryAddress);
}