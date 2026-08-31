import { Reveal, BorderedHead } from "../Deco";
import { Icon } from "../Icon";

const MECHANICS = [
  {
    n: "01",
    title: "Assess",
    body: "Age, income and risk tolerance shape your allocation before any money moves.",
    c: "var(--teal-100)",
  },
  {
    n: "02",
    title: "Split",
    body: "Every payout splits automatically: 97% to your wallet, 3% into your personal vault.",
    c: "var(--accent-100)",
  },
  {
    n: "03",
    title: "Allocate",
    body: "The agent reads live yields, scores risk, and rebalances across RWA, DeFi, and stable assets.",
    c: "var(--purple-100)",
  },
  {
    n: "04",
    title: "Record",
    body: "Each allocation is hashed on-chain — immutable, verifiable, and yours to audit.",
    c: "var(--green-100)",
  },
  {
    n: "05",
    title: "Compound",
    body: "Yields flow back into the vault. Rebalancing is automatic while you keep working.",
    c: "var(--teal-100)",
  },
  {
    n: "06",
    title: "Withdraw",
    body: "Single-step and user-only. Funds leave your vault straight to your wallet.",
    c: "var(--red-100)",
  },
];

export default function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <BorderedHead
          n="01 / mechanism"
          title="Money in. Future grows."
          sub="A split happens on every payout you receive — automatically, before you even notice."
        />

        <Reveal>
          <div className="ns-grid">
            {MECHANICS.map((m) => (
              <div key={m.n} className="ns-cell ns-panel" style={{ background: "var(--bg-200)" }}>
                <div className="row space-between" style={{ marginBottom: 10 }}>
                  <span className="mono" style={{ fontSize: 12, color: m.c }}>{m.n}</span>
                  <Icon name="bolt" size={14} style={{ color: m.c, opacity: 0.7 }} />
                </div>
                <h3 className="heading-sm" style={{ marginBottom: 6 }}>{m.title}</h3>
                <p className="text-sm muted" style={{ lineHeight: 1.5 }}>{m.body}</p>
                <span style={{ display: "block", height: 2, width: 28, background: m.c, marginTop: 14, transition: "width 180ms ease" }} />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
