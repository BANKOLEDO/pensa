// In production the SPA is served by the same FastAPI process, so an empty
// API_URL means same-origin. In dev (vite on :5173) default to the local
// backend; overridable with VITE_API_URL at build time.
export const API_URL =
  (import.meta.env.VITE_API_URL as string) || (import.meta.env.DEV ? "http://localhost:8000" : "");

/** Human short + long address formatting. */
export const shortAddr = (a: string, n = 6): string =>
  a ? `${a.slice(0, n)}…${a.slice(-4)}` : "";

export const usd = (v: number | string, digits = 2): string =>
  `$${Number(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const pct = (v: number | string, digits = 2): string => `${Number(v).toFixed(digits)}%`;

export const bpsToPct = (bps: number): number => bps / 100;

export const fmtBps = (bps: number): string => `${bpsToPct(bps).toFixed(2)}%`;

export const categoryColor: Record<string, string> = {
  rwa: "text-gold-300",
  defi: "text-teal-300",
  stable: "text-emerald-300",
};

export const categoryDot: Record<string, string> = {
  rwa: "bg-gold-400",
  defi: "bg-teal-400",
  stable: "bg-emerald-400",
};

/**
 * Map an on-chain asset address to a friendly symbol. On-chain vault holdings
 * are keyed by token address; show "USDC" instead of a raw 0x… hash when we
 * recognize it (e.g. the demo/mintable USDC from scripts/fund.js).
 */
export const tokenLabel = (addr: string, usdcAddr?: string): string => {
  if (!addr) return "USDC";
  const known: Record<string, string> = {
    // X Layer testnet (mainnet / demo USDC from fund.js)
    "0x74b7f16337b8972027f6196a17a631ac6de26f22": "USDC",
    "0xDec90b78111Ba2fc6FC6d84d8B9ec159A2d4b9B3": "USDC",
  };
  if (usdcAddr) known[usdcAddr.toLowerCase()] = "USDC";
  const lower = addr.toLowerCase();
  if (known[lower]) return known[lower];
  return shortAddr(addr);
};
