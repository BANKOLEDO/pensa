import { SectionTitle, Corners } from "../Deco";

const ASSET_CLASSES = [
  {
    key: "rwa",
    tag: "RWA",
    color: "#f5a400",
    name: "Tokenized treasuries",
    apr: "4.9%",
    note: "real-world yield",
    rows: [["TBILL · US Treasuries", "4.9%"], ["USDY · Ondo", "4.7%"], ["USYC · Centrifuge", "4.5%"]],
  },
  {
    key: "defi",
    tag: "DeFi",
    color: "#06b6d4",
    name: "Blue-chip lending",
    apr: "5.2%",
    note: "protocol yields",
    rows: [["AAVE · USDC supply", "5.2%"], ["Compound · cUSDC", "4.1%"], ["Curve · 3pool", "3.9%"]],
  },
  {
    key: "stable",
    tag: "Stable",
    color: "#00a46a",
    name: "Stable assets",
    apr: "3.5%",
    note: "capital preservation",
    rows: [["USDC", "3.5%"], ["USDT", "3.3%"], ["PYUSD", "3.6%"]],
  },
];

export default function AssetClasses() {
  return (
    <section className="section" id="assets" style={{ paddingTop: 0 }}>
      <div className="container">
        <SectionTitle
          eyebrow="Where your money grows"
          title="Three engines of yield"
          sub="Live rates are sampled from the market by the agent; the mix shifts with your risk profile."
        />
        <div className="hairline-row rounded" style={{ position: "relative" }}>
          <Corners />
          {ASSET_CLASSES.map((a) => (
            <div key={a.key} className="stack-4" style={{ flex: 1, minWidth: 0, padding: "clamp(28px, 3vw, 40px)" }}>
              <span className="pill" style={{ borderColor: a.color, color: a.color, width: "fit-content" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.color }} />
                {a.tag}
              </span>
              <h3 className="heading heading-sm">{a.name}</h3>
              <div>
                <span className="mono" style={{ fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.03em", color: a.color }}>
                  {a.apr}
                </span>
                <span className="text-sm muted" style={{ marginLeft: 8 }}>{a.note}</span>
              </div>
              <div className="stack-2" style={{ marginTop: 8 }}>
                {a.rows.map(([n, y]) => (
                  <div key={n} className="row space-between" style={{ borderBottom: "1px solid var(--border-100)", paddingBlock: 10 }}>
                    <span className="text-sm" style={{ color: "var(--fg-300)" }}>{n}</span>
                    <span className="mono-sm">{y}</span>
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
