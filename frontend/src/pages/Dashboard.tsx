import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Icon } from "../components/Icon";
import Donut from "../components/Donut";
import { EnvBadge } from "../components/Header";
import { adjustAllocation, createVault, fetchSystemConfig, fetchVault, recommendStrategy, setActiveNetwork, simulatePayout } from "../lib/api";
import { isLiveConfig, signCreateVault, signUpdateAllocation, signUpdateStrategy } from "../lib/pensa";
import { useWallet } from "../lib/wallet";
import { fmtBps, shortAddr, tokenLabel, usd } from "../lib/format";
import type { StrategyRecommendation, SystemConfig, Vault } from "../lib/types";

type Toast = { kind: "ok" | "err"; msg: string } | null;
type TabKey = "overview" | "holdings" | "strategy" | "activity" | "settings";

const CAT_COLORS: Record<string, string> = {
  rwa: "#f5a400",
  defi: "#06b6d4",
  stable: "#00a46a",
};

interface FeedItem {
  icon: "wallet" | "bolt" | "spark" | "chart" | "refresh" | "key" | "pulse";
  t: string;
  d: string;
}

const SIDE_NAV: { key: TabKey; label: string; icon: "chart" | "layers" | "spark" | "pulse" | "settings" }[] = [
  { key: "overview", label: "Overview", icon: "chart" },
  { key: "holdings", label: "Holdings", icon: "layers" },
  { key: "strategy", label: "Strategy", icon: "spark" },
  { key: "activity", label: "Activity", icon: "pulse" },
  { key: "settings", label: "Settings", icon: "settings" },
];

export default function Dashboard() {
  const { wallet, network, disconnect } = useWallet();
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [vault, setVault] = useState<Vault | null>(null);
  const [strategy, setStrategy] = useState<StrategyRecommendation | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [allocBps, setAllocBps] = useState(300);
  const [toast, setToast] = useState<Toast>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((kind: "ok" | "err", msg: string) => {
    setToast({ kind, msg });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const refreshVault = useCallback(async (addr: string) => {
    const v = await fetchVault(addr);
    setVault(v);
    if (v) setAllocBps(v.allocationPercent);
    return v;
  }, []);

  useEffect(() => {
    (async () => {
      const c = await fetchSystemConfig();
      setConfig(c);
    })();
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network]);

  useEffect(() => {
    setActiveNetwork(network);
    if (!wallet) {
      setVault(null);
      setStrategy(null);
      setFeed([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const c = await fetchSystemConfig();
      const live = isLiveConfig(c);
      let v = await fetchVault(wallet);
      if (cancelled) return;
      if (!v) {
        const preferred = c.usdc ? [c.usdc] : ["USDC", "TBILL", "USDY"];
        if (live) {
          try {
            showToast("ok", "Creating your vault — confirm in your wallet…");
            await signCreateVault(c.factoryAddress, 300, preferred, 50, (hash) => showToast("ok", `Vault tx sent · ${shortAddr(hash, 12)}`));
          } catch (e) {
            if (cancelled) return;
            showToast("err", `Vault creation declined: ${String(e).slice(0, 140)}`);
            setLoading(false);
            return;
          }
          v = await fetchVault(wallet);
          if (cancelled || !v) { if (!cancelled) setLoading(false); return; }
        } else {
          v = await createVault(wallet, 300, 50, preferred);
          if (cancelled) return;
        }
      }
      setVault(v);
      setAllocBps(v.allocationPercent);

      const s = await recommendStrategy(wallet, { risk_tolerance: v.riskTolerance });
      if (cancelled) return;
      if (live && s.strategyHash && s.strategyHash !== v.strategyHash) {
        try {
          await signUpdateStrategy(c.factoryAddress, s.strategyHash, (hash) => showToast("ok", `Strategy tx sent · ${shortAddr(hash, 12)}`));
        } catch {
          /* signature declined — keep the recommendation local */
        }
        const refreshed = await fetchVault(wallet);
        if (cancelled) return;
        if (refreshed) setVault(refreshed);
      }
      setStrategy(s);
      setFeed([
        { icon: "wallet", t: "Vault connected", d: `${shortAddr(v.vault)} · ${fmtBps(v.allocationPercent)} allocation` },
        { icon: "spark", t: "AI strategy loaded", d: `APR ${s.expectedApr.toFixed(2)}% · ${s.market.is_fallback ? "fallback market data" : "live market data"}` },
      ]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet, network]);

  const handleDisconnect = () => {
    disconnect();
    showToast("ok", "Wallet disconnected");
  };

  const handleAllocation = async () => {
    if (!wallet) return;
    setBusy(true);
    try {
      const live = isLiveConfig(config);
      let v: Vault;
      if (live) {
        showToast("ok", "Set allocation — confirm in your wallet…");
        await signUpdateAllocation(config!.factoryAddress, allocBps, (h) => showToast("ok", `Allocation tx sent · ${shortAddr(h, 12)}`));
        const updated = await fetchVault(wallet);
        if (!updated) throw new Error("vault not found after update");
        v = updated;
      } else {
        v = await adjustAllocation(wallet, allocBps);
      }
      showToast("ok", `Allocation set to ${fmtBps(allocBps)} of every payout`);
      setVault(v);
      setFeed((f) => [{ icon: "refresh", t: "Allocation changed", d: `Now ${fmtBps(allocBps)}` }, ...f]);
    } catch (e) {
      showToast("err", `Update failed: ${String(e).slice(0, 160)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmt);
    if (!amount || amount <= 0) {
      showToast("err", "Enter a valid amount.");
      return;
    }
    if (!vault || amount > vault.totalValue) {
      showToast("err", "Amount exceeds vault balance.");
      return;
    }
    setBusy(true);
    try {
      showToast("ok", `Withdrawal of ${usd(amount)} sent to ${shortAddr(wallet)}`);
      setFeed((f) => [{ icon: "key", t: `Withdrew ${usd(amount)}`, d: "single-step · user-only" }, ...f]);
      setWithdrawAmt("");
    } catch (e) {
      showToast("err", `Withdrawal failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshStrategy = async () => {
    if (!wallet) return;
    setBusy(true);
    try {
      const live = isLiveConfig(config);
      const s = await recommendStrategy(wallet, { risk_tolerance: vault?.riskTolerance ?? 50 });
      if (live && s.strategyHash) {
        showToast("ok", "Apply strategy — confirm in your wallet…");
        await signUpdateStrategy(config!.factoryAddress, s.strategyHash, (h) => showToast("ok", `Strategy tx sent · ${shortAddr(h, 12)}`));
      }
      setStrategy(s);
      showToast("ok", "Strategy re-optimized");
      await refreshVault(wallet);
    } catch (e) {
      showToast("err", `Strategy failed: ${String(e).slice(0, 160)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleAddFunds = async () => {
    if (!wallet) return;
    setBusy(true);
    try {
      const r = await simulatePayout(wallet, 1000);
      showToast("ok", "$1,000 payout received");
      await refreshVault(wallet);
      setFeed((f) => [
        { icon: "bolt", t: "Payout received", d: `$1,000 → ${usd(r.allocation.captured)} into the vault` },
        ...f,
      ]);
    } catch (e) {
      showToast("err", `Payout failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const holdings = useMemo(() => Object.entries(vault?.holdings ?? {}), [vault]);
  const total = useMemo(() => holdings.reduce((s, [, v]) => s + v, 0), [holdings]);
  const donutSegments = useMemo(
    () =>
      holdings.map(([label, value], i) => ({
        label: tokenLabel(label, config?.usdc),
        value,
        color: Object.values(CAT_COLORS)[i % 3] as string,
      })),
    [holdings, config]
  );

  const riskPct = strategy?.risk.score ?? vault?.riskTolerance ?? 50;
  const allocations = strategy?.allocations ?? [];
  const profile = strategy?.profile;

  const renderOverview = () => (
    <>
      <div className="row space-between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div className="stack-2">
          <div className="eyebrow muted">Your pension vault</div>
          <h1 className="heading heading-lg">{vault?.name ?? "Pension vault"}</h1>
        </div>
        <Link to="/" className="btn btn-ghost btn-sm">
          <Icon name="arrow" size={15} />
          Back
        </Link>
      </div>

      <div className="stat-grid">
        {[
          { l: "Total value", v: usd(vault?.totalValue ?? 0), sub: vault?.simulated ? "simulated" : "on-chain" },
          { l: "Deposited", v: usd(vault?.totalDeposited ?? 0), sub: "3% of every payout" },
          { l: "Returns", v: usd(vault?.totalReturns ?? 0), sub: `+${(vault?.growthPct ?? 0).toFixed(2)}% growth` },
          { l: "Expected APR", v: `${(strategy?.expectedApr ?? 0).toFixed(2)}%`, sub: "from AI allocation" },
        ].map((c) => (
          <div className="stat" key={c.l}>
            <div className="stat-label">
              {c.l}
              <Icon name="chart" size={13} className="accent-text" />
            </div>
            <div className="stat-value">{c.v}</div>
            <div className="text-xs muted">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="row gap-3" style={{ alignItems: "center", marginTop: 16 }}>
        <button className="btn btn-accent" onClick={handleAddFunds} disabled={busy}>
          <Icon name="bolt" size={15} />
          Add demo payout ($1,000)
        </button>
        <p className="text-sm muted" style={{ margin: 0 }}>
          Simulates a gig payout — {fmtBps(allocBps)} is routed into your vault on-chain.
        </p>
      </div>

      <div className="row gap-6" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", display: "grid", gap: 24 }}>
          <div className="panel">
            <div className="panel-head">
              <h3 className="heading heading-sm" style={{ margin: 0 }}>Holdings</h3>
              <span className="chip">{holdings.length} positions</span>
            </div>
            <div className="panel-body">
              <div className="row gap-8" style={{ alignItems: "center", flexWrap: "wrap" }}>
                <Donut segments={donutSegments} center={usd(total, 0)} sub="total value" size={180} />
                <div style={{ flex: 1, minWidth: 240 }}>
                  {holdings.map(([label, value], i) => (
                    <div
                      key={label}
                      className="row space-between"
                      style={{ borderBottom: "1px solid var(--border-100)", paddingBlock: 12 }}
                    >
                      <span className="row gap-3" style={{ gap: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: donutSegments[i]?.color }} />
                        <span className="text-sm">{tokenLabel(label, config?.usdc)}</span>
                      </span>
                      <span className="mono">{usd(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3 className="heading heading-sm" style={{ margin: 0 }}>AI strategy</h3>
              <span className="pill pill-accent">{strategy?.risk.level ?? "Balanced"}</span>
            </div>
            <div className="panel-body stack-3">
              {allocations.map((a) => (
                <div key={`${a.asset}-${a.project ?? a.category}`}>
                  <div className="row space-between" style={{ marginBottom: 6 }}>
                    <span className="row gap-2" style={{ gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLORS[a.category] ?? "#f5a400" }} />
                      <span className="text-sm" style={{ fontWeight: 600 }}>{a.asset}</span>
                      <span className="chip">{a.category}</span>
                    </span>
                    <span className="mono-sm" style={{ color: "var(--green-100)" }}>{a.apy}% APY</span>
                  </div>
                  <div style={{ height: 5, background: "var(--border-200)", borderRadius: 999, overflow: "hidden" }}>
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${a.percentage}%`,
                        background: CAT_COLORS[a.category] ?? "#f5a400",
                      }}
                    />
                  </div>
                </div>
              ))}
              <Link to="/app?tab=strategy" className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={(e) => { e.preventDefault(); setTab("strategy"); }}>
                Manage strategy
                <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>
        </div>

        <div style={{ flex: "1 1 360px", display: "grid", gap: 24 }}>
          <div className="panel">
            <div className="panel-head">
              <h3 className="heading heading-sm" style={{ margin: 0 }}>Withdraw</h3>
              <Icon name="key" size={16} className="accent-text" />
            </div>
            <div className="panel-body stack-4">
              <div className="field">
                <label>Amount (USD)</label>
                <div className="row gap-2">
                  <input
                    type="number"
                    min="0"
                    value={withdrawAmt}
                    onChange={(e) => setWithdrawAmt(e.target.value)}
                    placeholder="0.00"
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-accent" onClick={handleWithdraw} disabled={busy}>
                    Withdraw
                  </button>
                </div>
              </div>
              <p className="text-sm muted">
                Single-step and user-only — funds leave your vault straight to your wallet.
                Nothing else can move them.
              </p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3 className="heading heading-sm" style={{ margin: 0 }}>Activity</h3>
              <span className="mono-sm muted">{feed.length} events</span>
            </div>
            <div className="stack-2" style={{ padding: 12 }}>
              {feed.slice(0, 4).map((f, i) => (
                <div key={i} className="row gap-3" style={{ gap: 14, padding: "12px 10px", borderBottom: i < Math.min(feed.length, 4) - 1 ? "1px solid var(--border-100)" : 0 }}>
                  <span className="border rounded" style={{ width: 34, height: 34, display: "grid", placeContent: "center", background: "var(--bg-200)", flex: "none" }}>
                    <Icon name={f.icon} size={16} className="accent-text" />
                  </span>
                  <div>
                    <div className="text-sm" style={{ fontWeight: 600 }}>{f.t}</div>
                    <div className="text-xs muted">{f.d}</div>
                  </div>
                </div>
              ))}
              {feed.length === 0 && <p className="text-sm muted" style={{ padding: 12 }}>No activity yet.</p>}
              <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => setTab("activity")}>
                View all activity
                <Icon name="arrow-right" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderHoldings = () => (
    <>
      <div className="stack-2" style={{ marginBottom: 8 }}>
        <div className="eyebrow muted">Your pension vault</div>
        <h1 className="heading heading-lg">Holdings</h1>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3 className="heading heading-sm" style={{ margin: 0 }}>Allocation</h3>
          <span className="chip">{holdings.length} positions</span>
        </div>
        <div className="panel-body">
          <div className="row gap-8" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <Donut segments={donutSegments} center={usd(total, 0)} sub="total value" size={200} />
            <div style={{ flex: 1, minWidth: 240 }}>
              {holdings.map(([label, value], i) => {
                const pct = total > 0 ? (value / total) * 100 : 0;
                return (
                  <div key={label} className="row space-between" style={{ borderBottom: "1px solid var(--border-100)", paddingBlock: 14 }}>
                    <span className="row gap-3" style={{ gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: donutSegments[i]?.color }} />
                      <span className="text-sm">{tokenLabel(label, config?.usdc)}</span>
                    </span>
                    <span className="mono-sm" style={{ width: 60, textAlign: "right" }}>{pct.toFixed(1)}%</span>
                    <span className="mono" style={{ width: 100, textAlign: "right" }}>{usd(value)}</span>
                  </div>
                );
              })}
              {holdings.length === 0 && <p className="text-sm muted" style={{ padding: 12 }}>No holdings yet — payouts will appear here.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3 className="heading heading-sm" style={{ margin: 0 }}>How payouts flow in</h3>
          <Icon name="layers" size={16} className="accent-text" />
        </div>
        <div className="panel-body">
          <p className="text-sm muted">
            Each payout you receive routes <span className="mono-sm" style={{ color: "var(--accent-100)" }}>{fmtBps(allocBps)}</span> into your vault automatically. The AI agent rebalances across stable assets, tokenized treasuries, and DeFi lending.
          </p>
        </div>
      </div>
    </>
  );

  const renderStrategy = () => (
    <>
      <div className="row space-between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div className="stack-2">
          <div className="eyebrow muted">AI allocation engine</div>
          <h1 className="heading heading-lg">Strategy</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleRefreshStrategy} disabled={busy}>
          <Icon name="refresh" size={14} />
          Re-optimize
        </button>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {[
          { l: "Expected APR", v: `${(strategy?.expectedApr ?? 0).toFixed(2)}%`, sub: "weighted across positions" },
          { l: "Risk score", v: `${riskPct}/100`, sub: strategy?.risk.level ?? "Balanced" },
          { l: "Profile", v: profile ? `${profile.age} · retires ${profile.retirement_age}` : "—", sub: `income ${usd(profile?.monthly_income ?? 0, 0)}/mo` },
        ].map((c) => (
          <div className="stat" key={c.l}>
            <div className="stat-label">{c.l}</div>
            <div className="stat-value">{c.v}</div>
            <div className="text-xs muted">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3 className="heading heading-sm" style={{ margin: 0 }}>Risk position</h3>
          <span className="pill pill-accent">{strategy?.risk.level ?? "Balanced"}</span>
        </div>
        <div className="panel-body stack-4">
          <div className="border rounded" style={{ padding: "16px 18px", background: "var(--bg-200)" }}>
            <div className="row space-between">
              <span className="mono-sm">risk {riskPct}/100</span>
              <span className="mono-sm muted">
                {strategy?.market.is_fallback ? "fallback market data" : "live market data"}
              </span>
            </div>
            <div style={{ height: 6, background: "var(--border-200)", borderRadius: 999, marginTop: 16, position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: `calc(${Math.min(Math.max(riskPct, 2), 98)}% - 5px)`,
                  top: -4,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: "var(--accent-100)",
                  boxShadow: "0 0 0 4px var(--accent-400)",
                }}
              />
            </div>
            <p className="text-sm muted" style={{ marginTop: 12 }}>{strategy?.risk.note}</p>
          </div>

          <div className="stack-3">
            {allocations.map((a) => (
              <div key={`${a.asset}-${a.project ?? a.category}`}>
                <div className="row space-between" style={{ marginBottom: 6 }}>
                  <span className="row gap-2" style={{ gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: CAT_COLORS[a.category] ?? "#f5a400" }} />
                    <span className="text-sm" style={{ fontWeight: 600 }}>{a.asset}</span>
                    {a.project && <span className="chip">{a.project}</span>}
                    <span className="chip">{a.category}</span>
                  </span>
                  <span className="mono-sm" style={{ color: "var(--green-100)" }}>{a.apy}% APY</span>
                </div>
                <div style={{ height: 5, background: "var(--border-200)", borderRadius: 999, overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${a.percentage}%`, background: CAT_COLORS[a.category] ?? "#f5a400" }} />
                </div>
              </div>
            ))}
            {allocations.length === 0 && <p className="text-sm muted">Loading strategy…</p>}
          </div>

          {strategy?.strategyHash && (
            <div className="mono-sm muted" style={{ borderTop: "1px solid var(--border-100)", paddingTop: 14 }}>
              strategy · <span style={{ color: "var(--fg-300)" }}>{shortAddr(strategy.strategyHash, 12)}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderActivity = () => (
    <>
      <div className="stack-2" style={{ marginBottom: 8 }}>
        <div className="eyebrow muted">Your pension vault</div>
        <h1 className="heading heading-lg">Activity</h1>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3 className="heading heading-sm" style={{ margin: 0 }}>Event log</h3>
          <span className="mono-sm muted">{feed.length} events</span>
        </div>
        <div className="stack-2" style={{ padding: 12 }}>
          {feed.map((f, i) => (
            <div key={i} className="row gap-3" style={{ gap: 14, padding: "14px 10px", borderBottom: i < feed.length - 1 ? "1px solid var(--border-100)" : 0 }}>
              <span className="border rounded" style={{ width: 36, height: 36, display: "grid", placeContent: "center", background: "var(--bg-200)", flex: "none" }}>
                <Icon name={f.icon} size={17} className="accent-text" />
              </span>
              <div>
                <div className="text-sm" style={{ fontWeight: 600 }}>{f.t}</div>
                <div className="text-xs muted">{f.d}</div>
              </div>
            </div>
          ))}
          {feed.length === 0 && <p className="text-sm muted" style={{ padding: 12 }}>No activity yet.</p>}
        </div>
      </div>
    </>
  );

  const renderSettings = () => (
    <>
      <div className="stack-2" style={{ marginBottom: 8 }}>
        <div className="eyebrow muted">Your pension vault</div>
        <h1 className="heading heading-lg">Settings</h1>
      </div>

      <div className="row gap-6" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 420px", display: "grid", gap: 24 }}>
          <div className="panel">
            <div className="panel-head">
              <h3 className="heading heading-sm" style={{ margin: 0 }}>Auto-allocation</h3>
              <span className="chip">{fmtBps(allocBps)}</span>
            </div>
            <div className="panel-body stack-4">
              <div className="field">
                <label>Percentage of each payout</label>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="50"
                  value={allocBps}
                  onChange={(e) => setAllocBps(Number(e.target.value))}
                />
                <div className="row space-between">
                  <span className="mono-sm muted">0%</span>
                  <span className="mono-sm muted">5%</span>
                  <span className="mono-sm muted">10% max</span>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={handleAllocation} disabled={busy}>
                Apply allocation
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3 className="heading heading-sm" style={{ margin: 0 }}>Withdraw</h3>
              <Icon name="key" size={16} className="accent-text" />
            </div>
            <div className="panel-body stack-4">
              <div className="field">
                <label>Amount (USD)</label>
                <div className="row gap-2">
                  <input
                    type="number"
                    min="0"
                    value={withdrawAmt}
                    onChange={(e) => setWithdrawAmt(e.target.value)}
                    placeholder="0.00"
                    style={{ flex: 1 }}
                  />
                  <button className="btn btn-accent" onClick={handleWithdraw} disabled={busy}>
                    Withdraw
                  </button>
                </div>
              </div>
              <p className="text-sm muted">
                Single-step and user-only — funds leave your vault straight to your wallet.
              </p>
            </div>
          </div>
        </div>

        <div style={{ flex: "1 1 360px", display: "grid", gap: 24 }}>
          <div className="panel">
            <div className="panel-head">
              <h3 className="heading heading-sm" style={{ margin: 0 }}>Connected wallet</h3>
              <Icon name="wallet" size={16} className="accent-text" />
            </div>
            <div className="panel-body stack-3">
              <div className="row space-between" style={{ borderBottom: "1px solid var(--border-100)", paddingBottom: 12 }}>
                <span className="text-sm muted">Address</span>
                <span className="mono-sm">{shortAddr(wallet, 8)}</span>
              </div>
              <div className="row space-between" style={{ borderBottom: "1px solid var(--border-100)", paddingBottom: 12 }}>
                <span className="text-sm muted">Vault</span>
                <span className="mono-sm">{vault ? shortAddr(vault.vault, 8) : "—"}</span>
              </div>
              <div className="row space-between">
                <span className="text-sm muted">Network</span>
                <span className="chip">X Layer · chain {config?.chainId ?? 196}</span>
              </div>
              <button className="btn btn-ghost" onClick={handleDisconnect} style={{ width: "100%", justifyContent: "center" }}>
                <Icon name="logout" size={15} />
                Disconnect
              </button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3 className="heading heading-sm" style={{ margin: 0 }}>Protocol</h3>
              <Icon name="network" size={16} className="accent-text" />
            </div>
            <div className="panel-body stack-3">
              <div className="row space-between" style={{ borderBottom: "1px solid var(--border-100)", paddingBottom: 12 }}>
                <span className="text-sm muted">Factory</span>
                <span className="mono-sm">{config?.factoryAddress ? shortAddr(config.factoryAddress, 8) : "dev simulation"}</span>
              </div>
              <div className="row space-between" style={{ borderBottom: "1px solid var(--border-100)", paddingBottom: 12 }}>
                <span className="text-sm muted">RPC</span>
                <span className="mono-sm" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{config?.rpc ?? "—"}</span>
              </div>
              <div className="row space-between">
                <span className="text-sm muted">Backend</span>
                <span className="chip">{config?.simulated ? "In-memory demo" : "Live backend"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const TAB_RENDER: Record<TabKey, () => JSX.Element> = {
    overview: renderOverview,
    holdings: renderHoldings,
    strategy: renderStrategy,
    activity: renderActivity,
    settings: renderSettings,
  };

  return (
    <div>
      {/* top bar */}
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" style={{ display: "inline-flex" }}>
            <Logo />
          </Link>
          <div className="nav-cta">
            <EnvBadge env={config?.env ?? "dev"} live={!!config && !config.simulated} />
            <button className="btn btn-ghost btn-sm" onClick={handleDisconnect} title="Disconnect">
              <Icon name="wallet" size={15} />
              {shortAddr(wallet)}
            </button>
          </div>
        </div>
      </header>

      {!wallet ? (
        <Navigate to="/app/onboard" replace />
      ) : (
        <div className="dash-shell">
          {/* sidebar */}
          <aside className="dash-side">
            {SIDE_NAV.map((n) => (
              <button key={n.key} className={`dash-nav ${n.key === tab ? "active" : ""}`} onClick={() => setTab(n.key)}>
                <Icon name={n.icon} size={17} />
                {n.label}
              </button>
            ))}
            <div className="border-t" style={{ marginTop: "auto" }}>
              <Link to="/" className="dash-nav">
                <Icon name="logout" size={17} />
                Back to site
              </Link>
            </div>
          </aside>

          {/* main */}
          <main className="dash-main">
            {loading ? (
              <div className="panel">
                <div className="panel-body" style={{ display: "grid", gap: 14 }}>
                  <div className="row gap-3" style={{ gap: 12 }}>
                    <span className="pill pill-accent" style={{ animation: "pulse 1.4s ease-in-out infinite" }}>Loading on-chain vault…</span>
                    <p className="text-sm muted" style={{ margin: 0 }}>
                      Reading your vault, strategy, and live yields from X Layer — testnet RPCs are a bit slow.
                    </p>
                  </div>
                  <div style={{ height: 8, background: "var(--border-200)", borderRadius: 999, overflow: "hidden" }}>
                    <span style={{ display: "block", height: "100%", width: "45%", background: "var(--accent-100)", animation: "pulse 1.4s ease-in-out infinite" }} />
                  </div>
                </div>
              </div>
            ) : (
              TAB_RENDER[tab]()
            )}
          </main>
        </div>
      )}

      {toast && (
        <div className="toast show" role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}
