import { useEffect, useRef, useState } from "react";
import { fetchMarketSnapshot } from "../lib/api";
import type { MarketYield } from "../lib/types";

interface MarketMonitorProps {
  live: boolean;
}

interface Row extends MarketYield {
  dir: 0 | 1 | -1;
}

const FLASH = ["var(--green-100)", "var(--red-100)"];

function pick(snapshot: NonNullable<Awaited<ReturnType<typeof fetchMarketSnapshot>>>): Row[] {
  // Interleave a few of each category so the monitor shows the full market,
  // not just the vault's own holdings.
  const take = (arr: MarketYield[], n: number) => arr.slice(0, n);
  const rows = [
    ...take(snapshot.rwa_yields, 2),
    ...take(snapshot.defi_yields, 3),
    ...take(snapshot.stable_rates, 2),
  ].map((y) => ({ ...y, dir: 0 as const }));
  return rows.slice(0, 6);
}

export default function MarketMonitor({ live }: MarketMonitorProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<{ rwa: number; defi: number; stable: number } | null>(null);
  const prev = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let timer = 0;

    const poll = async () => {
      const s = await fetchMarketSnapshot();
      if (cancelled || !s) return;
      setCounts(s.counts);
      const next = pick(s);
      setRows((cur) => {
        const merged = next.map((r) => {
          const key = `${r.asset}-${r.project}`;
          const oldApy = prev.current.get(key) ?? cur.find((c) => `${c.asset}-${c.project}` === key)?.apy;
          let dir: 0 | 1 | -1 = 0;
          if (oldApy !== undefined && oldApy !== r.apy) dir = r.apy > oldApy ? 1 : -1;
          prev.current.set(key, r.apy);
          return { ...r, dir };
        });
        return merged;
      });
      timer = window.setTimeout(poll, 15000);
    };
    poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [live]);

  if (!live) {
    return (
      <div className="panel">
        <div className="panel-head">
          <h3 className="heading heading-sm" style={{ margin: 0 }}>Live markets</h3>
          <span className="mono-sm muted">offline snapshot</span>
        </div>
        <div className="panel-body">
          <p className="text-sm muted" style={{ margin: 0 }}>
            Connect a wallet on Testnet to stream live market yields.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h3 className="heading heading-sm" style={{ margin: 0 }}>Live markets</h3>
        <span className="row gap-2" style={{ alignItems: "center", gap: 8 }} title="Polling real market data">
          <span className="blink" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green-100)" }} />
          <span className="mono-sm muted">live · {counts ? `${counts.rwa}RWA · ${counts.defi}DeFi · ${counts.stable}stable` : "…"}</span>
        </span>
      </div>
      <div className="panel-body stack-3">
        {rows.length === 0 && <p className="text-sm muted">Fetching live yields…</p>}
        {rows.map((r) => (
          <div key={`${r.asset}-${r.project}`} className="row space-between">
            <span className="row gap-2" style={{ gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLORS[r.category] ?? "#f5a400" }} />
              <span className="text-sm" style={{ fontWeight: 600 }}>{r.asset}</span>
              <span className="chip">{r.project}</span>
            </span>
            <span className="mono-sm" style={{ color: r.dir === 0 ? "var(--fg-300)" : FLASH[r.dir === 1 ? 0 : 1] }}>
              {r.dir === 1 ? "▲" : r.dir === -1 ? "▼" : "·"} {r.apy.toFixed(2)}% APY
            </span>
          </div>
        ))}
        <p className="text-xs muted" style={{ margin: 0 }}>
          The agent polls these real yields and re-optimizes when the mix drifts.
        </p>
      </div>
    </div>
  );
}

const CAT_COLORS: Record<string, string> = {
  rwa: "#f5a400",
  defi: "#06b6d4",
  stable: "#00a46a",
};