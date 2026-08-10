import type { Allocation, StrategyRecommendation, SystemConfig, Vault } from "../lib/types";

/**
 * Local fallback dataset. Used when the backend is not running so the UI
 * always renders something meaningful in dev. Identical shape to the backend.
 */
export const DEMO_CONFIG: SystemConfig = {
  env: "dev",
  chainId: 196,
  rpc: "https://rpc.xlayer.tech",
  simulated: true,
  factoryAddress: "0x0",
  strategyAddress: "0x0",
};

export const DEMO_USER = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

export const DEMO_VAULTS: Vault[] = [
  {
    user: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    name: "Maya Chen",
    vault: "0x9e8F1f9Dc5eB8aF6c0d8E9f1b2C3d4E5f6A7b8C9",
    allocationPercent: 300,
    riskTolerance: 40,
    holdings: { USDC: 635.2, TBILL: 381.12, "AAVE-USDC": 254.08 },
    totalValue: 1270.4,
    totalDeposited: 1232.29,
    totalReturns: 38.11,
    growthPct: 3.09,
    strategyHash: "0x" + "a1".repeat(32),
    simulated: true,
  },
  {
    user: "0xB0B5B4E9c6fB4f1F8fB0B1B2B3B4B5B6B7B8B9BA",
    name: "David Okafor",
    vault: "0x6d7c8E9f0a1B2C3d4E5F6a7b8C9d0E1f2A3b4C5D",
    allocationPercent: 300,
    riskTolerance: 70,
    holdings: { USDC: 870.5, TBILL: 348.2, "AAVE-USDC": 696.4 },
    totalValue: 1915.1,
    totalDeposited: 1857.65,
    totalReturns: 57.45,
    growthPct: 3.09,
    strategyHash: "0x" + "b2".repeat(32),
    simulated: true,
  },
  {
    user: "0x1111111111111111111111111111111111111111",
    name: "Sara Lindqvist",
    vault: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    allocationPercent: 300,
    riskTolerance: 25,
    holdings: { USDC: 710.5, TBILL: 497.35, "AAVE-USDC": 213.15 },
    totalValue: 1421.0,
    totalDeposited: 1378.37,
    totalReturns: 42.63,
    growthPct: 3.09,
    strategyHash: "0x" + "c3".repeat(32),
    simulated: true,
  },
];

export const DEMO_STRATEGY: StrategyRecommendation = {
  user: DEMO_USER,
  profile: {
    address: DEMO_USER,
    age: 30,
    risk_tolerance: 40,
    preferred_assets: ["USDC", "TBILL"],
    monthly_income: 2000,
    retirement_age: 65,
  },
  market: { is_fallback: false, rwa_count: 12, defi_count: 34, stable_count: 18 },
  risk: {
    score: 34,
    level: "balanced",
    note: "Stable core with moderate DeFi yield participation.",
    breakdown: { stated_tolerance: 20, portfolio_volatility: 9.1, concentration: 4.5 },
  },
  expectedApr: 4.42,
  allocations: [
    { asset: "USDC", project: "aave", category: "defi", percentage: 34.2, apy: 5.2 },
    { asset: "TBILL", project: "tbill", category: "rwa", percentage: 28.5, apy: 4.9 },
    { asset: "USDY", project: "ondo-finance", category: "rwa", percentage: 17.3, apy: 4.7 },
    { asset: "USDT", project: "stable", category: "stable", percentage: 20.0, apy: 3.5 },
  ] as Allocation[],
  strategyHash: "0x" + "d4".repeat(32),
};
