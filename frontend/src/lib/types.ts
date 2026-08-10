export interface SystemConfig {
  env: "dev" | "staging" | "prod";
  chainId: number;
  rpc: string;
  simulated: boolean;
  factoryAddress: string;
  strategyAddress: string;
}

export interface Holding {
  amount: number;
  apy: number;
}

export interface Vault {
  user: string;
  name: string;
  vault: string;
  allocationPercent: number;
  riskTolerance: number;
  holdings: Record<string, number>;
  totalValue: number;
  totalDeposited: number;
  totalReturns: number;
  growthPct: number;
  strategyHash: string;
  simulated: boolean;
}

export interface Allocation {
  asset: string;
  project?: string;
  category: "rwa" | "defi" | "stable";
  percentage: number;
  apy: number;
  pool?: string;
}

export interface RiskScore {
  score: number;
  level: string;
  note: string;
  breakdown: {
    stated_tolerance: number;
    portfolio_volatility: number;
    concentration: number;
  };
}

export interface StrategyRecommendation {
  user: string;
  profile: {
    address: string;
    age: number;
    risk_tolerance: number;
    preferred_assets: string[];
    monthly_income: number;
    retirement_age: number;
  };
  market: {
    is_fallback: boolean;
    rwa_count: number;
    defi_count: number;
    stable_count: number;
  };
  risk: RiskScore;
  expectedApr: number;
  allocations: Allocation[];
  strategyHash?: string;
}

export interface PaymentResult {
  paymentAmount: number;
  asset: string;
  allocation: { user: string; asset: string; paymentAmount: number; captured: number };
  message: string;
}
