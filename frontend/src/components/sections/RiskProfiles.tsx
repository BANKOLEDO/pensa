import { Link } from "react-router-dom";
import { BorderedHead } from "../Deco";
import { Icon } from "../Icon";
import { useWallet } from "../../lib/wallet";

const RISK_PROFILES = [
  {
    key: "conservative",
    c: "var(--green-100)",
    code: "P0",
    tag: "safe first",
    name: "Conservative",
    apr: "3.5–4.5%",
    allocs: [["stable", "70%"], ["rwa", "30%"], ["defi", "0%"]],
    features: ["Stable + treasury only", "Zero liquidation risk", "Withdraw in 1 step"],
    popular: false,
  },
  {
    key: "balanced",
    c: "var(--accent-100)",
    code: "P1",
    tag: "steady growth",
    name: "Balanced",
    apr: "4.5–6.0%",
    allocs: [["stable", "40%"], ["rwa", "40%"], ["defi", "20%"]],
    features: ["Blended treasury + lending", "Bounded drawdown", "Monthly yield reports"],
    popular: true,
  },
  {
    key: "aggressive",
    c: "var(--purple-100)",
    code: "P2",
    tag: "maximize returns",
    name: "Aggressive",
    apr: "5.5–8.0%",
    allocs: [["stable", "20%"], ["rwa", "40%"], ["defi", "40%"]],
    features: ["Weight to DeFi lending", "Sweep on yield spikes", "Live risk monitoring"],
    popular: false,
  },
];

export default function RiskProfiles() {
  const { wallet } = useWallet();
  return (
    <section className="section" id="risk">
      <div className="container">
        <BorderedHead
          n="04 / profiles"
          title="Pick a profile. The agent does the rest."
          sub="Answer three questions and the agent sets your weights — or start from a profile and adjust anytime."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 12 }}>
          {RISK_PROFILES.map((p) => (
            <div key={p.key} className="ns-card ns-panel" style={{ display: "flex", flexDirection: "column" }}>
              <div className="row space-between" style={{ marginBottom: 14 }}>
                <span className="mono" style={{ fontSize: 12, color: p.c }}>{p.code}</span>
                <span className="row gap-2" style={{ gap: 6 }}>
                  <span className="status-dot" style={{ background: p.c, boxShadow: `0 0 8px color-mix(in srgb, ${p.c} 55%, transparent)` }} />
                  <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: p.c }}>{p.tag}</span>
                </span>
              </div>
              <h3 className="heading-lg" style={{ color: p.c }}>{p.name}</h3>
              <div className="mono" style={{ fontSize: 28, fontWeight: 600, margin: "8px 0 2px" }}>{p.apr}</div>
              <div className="text-xs muted">expected APR band</div>
              <div className="row gap-2" style={{ gap: 6, flexWrap: "wrap", margin: "14px 0" }}>
                {p.allocs.map(([label, pct]) => (
                  <span key={label} className="mono" style={{ fontSize: 11, padding: "3px 8px", borderRadius: 999, border: `1px solid color-mix(in srgb, ${p.c} 32%, transparent)`, color: p.c }}>{label} {pct}</span>
                ))}
              </div>
              <div className="stack-2" style={{ flex: 1 }}>
                {p.features.map((f) => (
                  <div key={f} className="row gap-2" style={{ gap: 8, fontSize: 13, color: "var(--fg-300)" }}>
                    <Icon name="check" size={14} style={{ color: p.c, flex: "none" }} />
                    {f}
                  </div>
                ))}
              </div>
              <Link
                to={wallet ? "/app" : "/app/onboard"}
                className={`btn ${p.popular ? "btn-accent" : "btn-ghost"} btn-sm`}
                style={{ marginTop: 18, width: "100%", justifyContent: "center" }}
              >
                Set my profile
                <Icon name="arrow-right" size={14} />
              </Link>
              {p.popular && (
                <span className="mono" style={{ textAlign: "center", marginTop: 10, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-100)" }}>
                  most popular
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
