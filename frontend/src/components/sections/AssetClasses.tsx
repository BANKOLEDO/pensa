import { BorderedHead } from "../Deco";

const ASSET_CLASSES = [
  {
    key: "rwa",
    tag: "RWA",
    c: "var(--accent-100)",
    name: "Tokenized treasuries",
    apr: "4.9%",
    note: "real-world yield",
    rows: [["TBILL · US Treasuries", "4.9%"], ["USDY · Ondo", "4.7%"], ["USYC · Centrifuge", "4.5%"]],
  },
  {
    key: "defi",
    tag: "DeFi",
    c: "var(--teal-100)",
    name: "Blue-chip lending",
    apr: "5.2%",
    note: "protocol yields",
    rows: [["AAVE · USDC supply", "5.2%"], ["Compound · cUSDC", "4.1%"], ["Curve · 3pool", "3.9%"]],
  },
  {
    key: "stable",
    tag: "Stable",
    c: "var(--green-100)",
    name: "Stable assets",
    apr: "3.5%",
    note: "capital preservation",
    rows: [["USDC", "3.5%"], ["USDT", "3.3%"], ["PYUSD", "3.6%"]],
  },
];

export default function AssetClasses() {
  return (
    <section className="section" id="assets">
      <div className="container">
        <BorderedHead
          n="02 / engines"
          title="Three engines of yield"
          sub="Live rates are sampled by the agent; the mix shifts with your risk profile."
        />
        <div className="ns-grid">
          {ASSET_CLASSES.map((a) => (
            <div key={a.key} className="ns-cell ns-panel" style={{ background: "var(--bg-200)" }}>
              <span className="ns-badge ns-badge-gold" style={{ borderColor: `color-mix(in srgb, ${a.c} 35%, transparent)`, color: a.c, background: `color-mix(in srgb, ${a.c} 10%, transparent)` }}>
                <span className="dot" style={{ background: a.c }} />
                {a.tag}
              </span>
              <h3 className="heading-sm" style={{ marginTop: 14 }}>{a.name}</h3>
              <div className="mono" style={{ fontSize: 26, fontWeight: 600, marginTop: 6, color: a.c }}>{a.apr}</div>
              <div className="text-xs muted" style={{ marginBottom: 12 }}>{a.note}</div>
              <div className="stack-2">
                {a.rows.map(([n, y]) => (
                  <div key={n} className="ns-meta" style={{ paddingBlock: 7, borderTop: "1px dashed var(--border-200)" }}>
                    <span className="text-sm" style={{ color: "var(--fg-300)" }}>{n}</span>
                    <span className="mono" style={{ color: a.c, fontSize: 13 }}>{y}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
