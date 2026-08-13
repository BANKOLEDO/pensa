import { Link } from "react-router-dom";
import { Reveal, Corners } from "../Deco";
import { Icon } from "../Icon";
import { useWallet } from "../../lib/wallet";

const DEMO_FLOW = [
  ["1", "Connect your wallet", "One signature creates your vault on-chain."],
  ["2", "Add a demo payout", "$1,000 → 3% ($30) routes into the vault automatically."],
  ["3", "Watch the balance move", "Real testnet transaction, live on X Layer."],
  ["4", "Inspect the strategy", "Follow the 60-second walkthrough in the app."],
];

const PROOF = [
  { icon: "terminal" as const, t: "Agent log", d: "Every decision, human-readable." },
  { icon: "doc" as const, t: "Strategy hash", d: "On-chain, auditable." },
  { icon: "shield" as const, t: "Factory vault", d: "EIP-1167, ~90k gas." },
  { icon: "globe" as const, t: "X Layer testnet", d: "Chain 196, faucet gas." },
];

export default function Showcase() {
  const { wallet } = useWallet();
  return (
    <section className="section" id="showcase" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="row" style={{ alignItems: "flex-end", justifyContent: "space-between", gap: 20, marginBottom: "clamp(36px, 5vw, 56px)", flexWrap: "wrap" }}>
          <div className="stack-3" style={{ maxWidth: 640 }}>
            <h2 className="heading heading-lg" style={{ margin: 0 }}>Works end to end — test it live.</h2>
            <p className="text muted" style={{ margin: 0, maxWidth: 520 }}>
              The whole flow runs on X Layer testnet: connect a wallet, drop in a demo payout,
              and verify the vault, strategy, and agent output yourself.
            </p>
          </div>
          <Link to={wallet ? "/app" : "/app/onboard"} className="btn btn-accent" style={{ flex: "none" }}>
            Open the live demo
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        <Reveal>
          <div className="rounded-xl" style={{ position: "relative", border: "1px solid var(--border-200)", overflow: "hidden" }}>
            <Corners />
            <div
              className="hairline-row"
              style={{ flexDirection: "column", gap: 0, background: "var(--bg-200)", padding: "clamp(28px, 4vw, 44px)" }}
            >
              <div className="stack-3">
                {DEMO_FLOW.map(([n, t, d]) => (
                  <div key={n} className="row" style={{ gap: 16, alignItems: "flex-start" }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--accent-100)",
                        width: 32,
                        height: 32,
                        flex: "none",
                        border: "1px solid var(--border-300)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {n}
                    </span>
                    <div>
                      <div className="text-sm" style={{ fontWeight: 600 }}>{t}</div>
                      <div className="text-sm muted">{d}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hairline-row" style={{ marginTop: 28 }}>
                {PROOF.map((p) => (
                  <div key={p.t} className="stack-2" style={{ flex: 1, padding: "18px clamp(14px, 2vw, 22px)" }}>
                    <Icon name={p.icon} size={15} className="accent-text" />
                    <div className="text-sm" style={{ fontWeight: 600 }}>{p.t}</div>
                    <div className="text-sm muted">{p.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}