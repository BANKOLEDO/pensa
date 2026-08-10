import { API_URL } from "./format";
import { DEMO_CONFIG, DEMO_STRATEGY, DEMO_VAULTS, DEMO_USER } from "../data/mock";
import type { NetworkId } from "./chains";
import type { PaymentResult, StrategyRecommendation, SystemConfig, Vault } from "./types";

/** True when the backend answered; false -> UI falls back to demo data. */
export const backendLive = { value: false };

/** Network the user selected (wallet.tsx setNetwork); mirrors the backend ?network= query. */
let activeNetwork: NetworkId = "mainnet";
export function setActiveNetwork(n: NetworkId) {
  activeNetwork = n;
}
export function getActiveNetwork(): NetworkId {
  return activeNetwork;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${API_URL}${path}${sep}network=${activeNetwork}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function fetchSystemConfig(): Promise<SystemConfig> {
  try {
    const c = await json<SystemConfig>("/system/config");
    backendLive.value = true;
    return c;
  } catch {
    return DEMO_CONFIG;
  }
}

export async function fetchVaults(): Promise<Vault[]> {
  try {
    const r = await json<{ vaults: Vault[] }>("/vaults");
    return r.vaults;
  } catch {
    return DEMO_VAULTS;
  }
}

export async function fetchVault(user: string): Promise<Vault | null> {
  try {
    return await json<Vault>(`/vaults/${user}`);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("404")) return null;
    const v = DEMO_VAULTS.find((x) => x.user.toLowerCase() === user.toLowerCase());
    return v ?? DEMO_VAULTS[0];
  }
}

export async function createVault(
  user: string,
  allocationPercent: number,
  riskTolerance: number,
  preferredAssets: string[]
): Promise<Vault> {
  try {
    return await json<Vault>("/vaults", {
      method: "POST",
      body: JSON.stringify({ user, allocationPercent, riskTolerance, preferredAssets }),
    });
  } catch {
    return { ...DEMO_VAULTS[0], user, allocationPercent, riskTolerance, simulated: true };
  }
}

export async function adjustAllocation(user: string, allocationPercent: number): Promise<Vault> {
  try {
    return await json<Vault>(`/vaults/${user}/allocation`, {
      method: "PATCH",
      body: JSON.stringify({ allocationPercent }),
    });
  } catch {
    return { ...DEMO_VAULTS[0], allocationPercent };
  }
}

export async function simulatePayout(user: string, amount: number, asset = "USDC"): Promise<PaymentResult> {
  try {
    return await json<PaymentResult>("/payments/auto", {
      method: "POST",
      body: JSON.stringify({ user, asset, amount }),
    });
  } catch {
    return {
      paymentAmount: amount,
      asset,
      allocation: { user, asset, paymentAmount: amount, captured: amount * 0.03 },
      message: `${amount} ${asset} received; allocation routed to pension vault`,
    };
  }
}

export async function recommendStrategy(
  user: string,
  opts: Partial<StrategyRecommendation["profile"]> = {}
): Promise<StrategyRecommendation> {
  try {
    return await json<StrategyRecommendation>("/strategies/recommend", {
      method: "POST",
      body: JSON.stringify({
        user,
        age: opts.age ?? 30,
        monthly_income: opts.monthly_income ?? 2000,
        riskTolerance: opts.risk_tolerance ?? 50,
        retirement_age: opts.retirement_age ?? 65,
        preferred_assets: opts.preferred_assets ?? [],
      }),
    });
  } catch {
    return { ...DEMO_STRATEGY, user };
  }
}

export async function applyStrategy(user: string, riskTolerance?: number): Promise<StrategyRecommendation> {
  try {
    return await json<StrategyRecommendation>("/strategies/apply", {
      method: "POST",
      body: JSON.stringify({ user, riskTolerance }),
    });
  } catch {
    return DEMO_STRATEGY;
  }
}

export const demoUser = DEMO_USER;
