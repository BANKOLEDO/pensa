/**
 * Persisted user profile (age, income, risk appetite). Stored in localStorage
 * because the project has no database — the profile shapes the AI strategy
 * recommendation and is sent alongside every vault/strategy call.
 */

export interface UserProfile {
  age: number;
  monthly_income: number;
  retirement_age: number;
  risk_tolerance: number;
}

export const DEFAULT_PROFILE: UserProfile = {
  age: 30,
  monthly_income: 2000,
  retirement_age: 65,
  risk_tolerance: 50,
};

const STORAGE_KEY = "pensa:profile";

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return {
      age: clampNum(parsed.age, 16, 100, DEFAULT_PROFILE.age),
      monthly_income: clampNum(parsed.monthly_income, 0, 1_000_000, DEFAULT_PROFILE.monthly_income),
      retirement_age: clampNum(parsed.retirement_age, 16, 110, DEFAULT_PROFILE.retirement_age),
      risk_tolerance: clampNum(parsed.risk_tolerance, 0, 100, DEFAULT_PROFILE.risk_tolerance),
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore storage errors */
  }
}

export function hasProfile(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}
