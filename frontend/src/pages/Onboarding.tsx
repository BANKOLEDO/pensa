import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Corners } from "../components/Deco";
import { Icon } from "../components/Icon";
import { useWallet } from "../lib/wallet";
import { shortAddr } from "../lib/format";
import { CHAINS, NETWORKS } from "../lib/chains";

const STEPS = [
  { icon: "wallet" as const, t: "Connect your wallet", d: "OKX Wallet or MetaMask — your vault is tied to your address, no signup." },
  { icon: "layers" as const, t: "Auto-save 3%", d: "Every payout you receive silently routes 3% into your on-chain vault." },
  { icon: "spark" as const, t: "AI grows it", d: "An open-source agent rebalances across treasuries, lending, and stable assets." },
];

export default function Onboarding() {
  const { wallet, connecting, network, setNetwork, connect } = useWallet();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setError("");
    try {
      await connect();
      navigate("/app", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" style={{ display: "inline-flex" }}>
            <Logo />
          </Link>
          <Link to="/" className="btn btn-ghost btn-sm">
            <Icon name="arrow" size={15} />
            Back to site
          </Link>
        </div>
      </header>

      <main className="section" style={{ paddingBlock: "clamp(40px, 6vw, 72px)" }}>
        <div
          className="rounded-xl border shadow-stack dot-grid"
          style={{
            background: "var(--bg-200)",
            position: "relative",
            overflow: "hidden",
            maxWidth: 1080,
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
          <div style={{ padding: "clamp(48px, 7vw, 96px) clamp(24px, 4vw, 56px)", textAlign: "center", position: "relative" }}>
            <span className="pill pill-accent" style={{ marginInline: "auto" }}>
              <Icon name="globe" size={14} />
              X Layer · chain {CHAINS[network].chainId}
            </span>
            <h1 className="title" style={{ marginBlock: "20px 16px" }}>
              Your pension, one wallet away
            </h1>
            <p className="text-lg muted" style={{ maxWidth: 540, marginInline: "auto", marginBottom: 32 }}>
              Connect your wallet to view your pension. Your vault is tied to your address —
              nothing to sign up, nothing to install. The dashboard reads it straight from the chain.
            </p>

            <button className="btn btn-accent btn-lg" onClick={handleConnect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect wallet"}
              <Icon name="wallet" size={16} />
            </button>
            {error && (
              <p className="text-sm" style={{ color: "var(--red-100)", maxWidth: 480, marginInline: "auto", marginTop: 16 }}>
                {error}
              </p>
            )}
            {wallet && <p className="mono-sm muted" style={{ marginTop: 14 }}>connected · {shortAddr(wallet)}</p>}

            <div className="row gap-4" style={{ marginTop: 32, justifyContent: "center", flexWrap: "wrap" }}>
              <span className="mono-sm muted">OKX Wallet · MetaMask</span>
              <span className="mono-sm muted">3% auto-save</span>
              <span className="mono-sm muted">no minimums</span>
            </div>

            <div
              className="row border rounded"
              style={{ marginTop: 28, marginInline: "auto", padding: 4, gap: 4, width: "fit-content", background: "var(--bg-100)" }}
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

        <div className="row gap-6" style={{ maxWidth: 1080, marginInline: "auto", marginTop: 32, flexWrap: "wrap" }}>
          {STEPS.map((s, i) => (
            <div className="border rounded" style={{ flex: "1 1 220px", padding: "22px", background: "var(--bg-100)" }} key={s.t}>
              <div className="row gap-3" style={{ gap: 12, marginBottom: 12 }}>
                <span
                  className="border rounded"
                  style={{ width: 36, height: 36, display: "grid", placeContent: "center", background: "var(--bg-200)", flex: "none" }}
                >
                  <Icon name={s.icon} size={17} className="accent-text" />
                </span>
                <span className="mono-sm muted" style={{ marginLeft: "auto" }}>0{i + 1}</span>
              </div>
              <div className="text-sm" style={{ fontWeight: 600, marginBottom: 6 }}>{s.t}</div>
              <div className="text-xs muted">{s.d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
