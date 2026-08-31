import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Corners } from "../components/Deco";
import { Icon } from "../components/Icon";
import AppPage from "../components/AppPage";
import { useWallet } from "../lib/wallet";
import { useTheme } from "../lib/theme";
import { shortAddr } from "../lib/format";
import { CHAINS, NETWORKS } from "../lib/chains";
import { DEFAULT_PROFILE, saveProfile, type UserProfile } from "../lib/profile";

const STEPS = [
  { icon: "wallet" as const, t: "Connect your wallet", d: "OKX Wallet or MetaMask — your vault is tied to your address, no signup." },
  { icon: "layers" as const, t: "Auto-save 3%", d: "Every payout you receive silently routes 3% into your on-chain vault." },
  { icon: "spark" as const, t: "AI grows it", d: "An open-source agent rebalances across treasuries, lending, and stable assets." },
];

export default function Onboarding() {
  const { wallet, connecting, network, setNetwork, connect } = useWallet();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<UserProfile>({ ...DEFAULT_PROFILE });

  const patch = (p: Partial<UserProfile>) => setProfile((cur) => ({ ...cur, ...p }));

  const handleConnect = async () => {
    setError("");
    try {
      await connect();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleStart = () => {
    saveProfile(profile);
    navigate("/app", { replace: true });
  };

  return (
    <AppPage>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" style={{ display: "inline-flex" }}>
            <Logo />
          </Link>
          <div className="flex items-center gap-2.5">
            <button
              className="theme-toggle"
              onClick={toggle}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
            </button>
            <Link to="/" className="btn btn-ghost btn-sm">
              <Icon name="arrow" size={15} />
              Back to site
            </Link>
          </div>
        </div>
      </header>

      <main className="section" style={{ paddingBlock: "clamp(28px, 4vw, 48px)", paddingInline: "clamp(16px, 3vw, 36px)" }}>
        <div
          className="rounded-xl border shadow-stack dot-grid"
          style={{
            background: "var(--bg-200)",
            position: "relative",
            overflow: "hidden",
            maxWidth: 680,
            marginInline: "auto",
          }}
        >
          <Corners />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "-35%",
              right: "-8%",
              width: "58%",
              height: "90%",
              background:
                "radial-gradient(closest-side, color-mix(in srgb, var(--accent-100) 15%, transparent), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div style={{ padding: "clamp(28px, 4vw, 44px) clamp(20px, 3vw, 36px)", textAlign: "center", position: "relative" }}>
            <span className="pill pill-accent" style={{ marginInline: "auto" }}>
              <span className="status-dot status-dot-live" />
              X Layer · chain {CHAINS[network].chainId}
            </span>
            <h1 className="heading-lg" style={{ marginBlock: "14px 10px" }}>
              Your pension, one wallet away
            </h1>
            <p className="text muted" style={{ maxWidth: 500, marginInline: "auto", marginBottom: 20 }}>
              Connect your wallet to view your pension. Your vault lives on-chain and belongs to you —
              nothing to sign up, nothing to install.
            </p>

            {!wallet ? (
              <>
                <button className="btn btn-accent btn-lg" onClick={handleConnect} disabled={connecting}>
                  {connecting ? "Connecting…" : "Connect wallet"}
                  <Icon name="wallet" size={16} />
                </button>
                {error && (
                  <p className="text-sm" style={{ color: "var(--red-100)", maxWidth: 480, marginInline: "auto", marginTop: 16 }}>
                    {error}
                  </p>
                )}
              </>
            ) : (
              <div className="stack-4" style={{ textAlign: "left", maxWidth: 560, marginInline: "auto" }}>
                <p className="mono-sm muted" style={{ textAlign: "center", marginBottom: 0 }}>
                  connected · {shortAddr(wallet)}
                </p>

                <div className="stack-2">
                  <div className="eyebrow accent-text">1 · About you</div>
                  <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    <label className="field">
                      <span style={{ minHeight: "2.6em", display: "flex", alignItems: "center" }}>Age</span>
                      <input
                        type="number"
                        min={16}
                        max={100}
                        value={profile.age}
                        onChange={(e) => patch({ age: Number(e.target.value) || 16 })}
                      />
                    </label>
                    <label className="field">
                      <span style={{ minHeight: "2.6em", display: "flex", alignItems: "center" }}>Monthly income ($)</span>
                      <input
                        type="number"
                        min={0}
                        value={profile.monthly_income}
                        onChange={(e) => patch({ monthly_income: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className="field">
                      <span style={{ minHeight: "2.6em", display: "flex", alignItems: "center" }}>Planned retirement age</span>
                      <input
                        type="number"
                        min={16}
                        max={110}
                        value={profile.retirement_age}
                        onChange={(e) => patch({ retirement_age: Number(e.target.value) || 16 })}
                      />
                    </label>
                  </div>
                </div>

                <div className="stack-2">
                  <div className="eyebrow accent-text">2 · Your risk appetite</div>
                  <p className="text-sm muted" style={{ margin: 0 }}>
                    This tunes how aggressively the AI invests. You can change it later.
                  </p>
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    {[
                      { v: 20, label: "Conservative", d: "safe first", c: "var(--green-100)" },
                      { v: 50, label: "Balanced", d: "steady growth", c: "var(--accent-100)" },
                      { v: 80, label: "Aggressive", d: "maximize returns", c: "var(--purple-100)" },
                    ].map((o) => (
                      <button
                        key={o.v}
                        type="button"
                        onClick={() => patch({ risk_tolerance: o.v })}
                        className="border rounded"
                        style={{
                          flex: "1 1 140px",
                          padding: "12px 14px",
                          background: profile.risk_tolerance === o.v ? "color-mix(in srgb, var(--bg-300) 80%, transparent)" : "var(--bg-100)",
                          borderColor: profile.risk_tolerance === o.v ? o.c : "var(--border-100)",
                          color: "var(--fg-100)",
                          cursor: "pointer",
                        }}
                      >
                        <div className="text-sm" style={{ fontWeight: 600, color: profile.risk_tolerance === o.v ? o.c : "var(--fg-100)" }}>{o.label}</div>
                        <div className="text-xs muted">{o.d}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button className="btn btn-accent btn-lg" onClick={handleStart} style={{ width: "100%", justifyContent: "center" }}>
                  Create my pension
                  <Icon name="arrow-right" size={16} />
                </button>
              </div>
            )}

            <div className="row gap-4" style={{ marginTop: 20, justifyContent: "center", flexWrap: "wrap" }}>
              <span className="mono-sm muted">OKX Wallet · MetaMask</span>
              <span className="mono-sm muted">3% auto-save</span>
              <span className="mono-sm muted">no minimums</span>
            </div>

            <p className="text-xs muted" style={{ maxWidth: 460, marginInline: "auto", marginTop: 14 }}>
              A moment after you connect: your wallet signs one small transaction to open your pension
              vault (testnet gas is free from the{" "}
              <a href="https://www.okx.com/xlayer/faucet/xlayerfaucet" target="_blank" rel="noreferrer" style={{ color: "var(--accent-100)" }}>
                X Layer faucet
              </a>
              ). Keep this browser on Testnet while you explore.
            </p>

            <div
              className="row border rounded"
              style={{ marginTop: 18, marginInline: "auto", padding: 4, gap: 4, width: "fit-content", background: "var(--bg-100)" }}
            >
              {NETWORKS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNetwork(n)}
                  className="mono-sm"
                  style={{
                    padding: "8px 18px",
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    background: network === n ? "var(--bg-300)" : "transparent",
                    color: network === n ? "var(--ink)" : "var(--muted-100)",
                  }}
                >
                  {n === "testnet" ? "Testnet" : "Mainnet"}
                </button>
              ))}
            </div>
            <p className="text-xs muted" style={{ marginTop: 10 }}>
              {CHAINS[network].label} · {CHAINS[network].rpcUrls[0]}
            </p>
          </div>
        </div>

        <div className="ns-grid" style={{ maxWidth: 680, marginInline: "auto", marginTop: 20 }}>
          {STEPS.map((s, i) => (
            <div className="ns-cell" key={s.t}>
              <div className="row space-between" style={{ marginBottom: 10 }}>
                <span className="border rounded" style={{ width: 30, height: 30, display: "grid", placeContent: "center", background: "var(--bg-300)", flex: "none" }}>
                  <Icon name={s.icon} size={15} className="accent-text" />
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--accent-100)" }}>0{i + 1}</span>
              </div>
              <div className="text-sm" style={{ fontWeight: 600, marginBottom: 4 }}>{s.t}</div>
              <div className="text-xs muted">{s.d}</div>
            </div>
          ))}
        </div>
      </main>
    </AppPage>
  );
}
