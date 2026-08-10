export const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

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
