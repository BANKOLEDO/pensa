import { Link } from "react-router-dom";
import { SectionTitle, Reveal } from "../Deco";
import { Icon } from "../Icon";
import { useWallet } from "../../lib/wallet";

const RISK_PROFILES = [
  {
    key: "conservative",
    color: "#f5a400",
    tag: "For steady savers",
    name: "Conservative",
    apr: "3.5–4.5%",
    aprNote: "expected APR band",
    allocs: [["stable", "70%"], ["rwa", "30%"], ["defi", "0%"]],
    features: ["Stable + treasury only", "Zero liquidation risk", "Withdraw in 1 step"],
    popular: false,
  },
  {
    key: "balanced",
    color: "#06b6d4",
    tag: "For most gig workers",
    name: "Balanced",
    apr: "4.5–6.0%",
    aprNote: "expected APR band",
    allocs: [["stable", "40%"], ["rwa", "40%"], ["defi", "20%"]],
    features: ["Blended treasury + lending", "Bounded drawdown budget", "Monthly yield reports"],
    popular: true,
  },
  {
    key: "aggressive",
    color: "#8b5cf6",
    tag: "For long horizons",
    name: "Aggressive",
    apr: "5.5–8.0%",
    aprNote: "expected APR band",
    allocs: [["stable", "20%"], ["rwa", "40%"], ["defi", "40%"]],
    features: ["Weight to DeFi lending", "Sweep on yield spikes", "Live risk monitoring"],
    popular: false,
  },
];

export default function RiskProfiles() {
  const { wallet } = useWallet();
  return (
    <section className="section" id="risk" style={{ paddingTop: 0 }}>
      <div className="container">
        <SectionTitle
          eyebrow="Choose your risk profile"
          title="Pick a profile. The agent does the rest."
          sub="Answer three questions and the agent sets your weights — or start from a profile and adjust anytime."
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 24 }}>
          {RISK_PROFILES.map((p, i) => (
            <Reveal key={p.key} delay={i * 0.08}>
              <div className="price-card h-full">
                <div className="price-cat" style={{ background: p.color, opacity: 0.85 }} />
                <span className="price-tag" style={{ color: p.color }}>
                  {p.tag}
                </span>
                <div style={{ marginTop: 24 }}>
                  <h3 className="heading heading-lg" style={{ marginBottom: 6 }}>{p.name}</h3>
                  <div className="mono" style={{ fontSize: "1.7rem", fontWeight: 600, letterSpacing: "-0.03em" }}>
                    {p.apr}
                  </div>
                  <div className="text-sm muted">{p.aprNote}</div>
                </div>
                <div className="row gap-2" style={{ marginBlock: 20, flexWrap: "wrap" }}>
                  {p.allocs.map(([label, pct]) => (
                    <span key={label} className="chip">{label} {pct}</span>
                  ))}
                </div>
                <div className="stack-3">
                  {p.features.map((f) => (
                    <div key={f} className="price-feature">
                      <Icon name="check" size={14} className="accent-text" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  to={wallet ? "/app" : "/app/onboard"}
                  className={`btn ${p.popular ? "btn-accent" : "btn-ghost"} btn-sm`}
                  style={{ marginTop: 28, width: "100%", justifyContent: "center" }}
                >
                  Set my profile
                </Link>
                {p.popular && (
                  <div className="eyebrow accent-text" style={{ textAlign: "center", marginTop: 14 }}>
                    Most popular
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
