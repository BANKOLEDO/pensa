import { BorderedHead, Reveal } from "../Deco";
import Waveform from "../Waveform";

function DotStream() {
  const colors = ["#f5a400", "#ffc94d", "#06b6d4", "#00a46a"];
  return (
    <div className="row" style={{ gap: 6 }}>
      {Array.from({ length: 22 }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: colors[i % colors.length],
            opacity: 0.5 + ((i * 7) % 50) / 100,
          }}
        />
      ))}
    </div>
  );
}

export default function HowItWorks() {
  return (
    <section className="section" id="how" style={{ paddingTop: "clamp(56px, 7vw, 88px)" }}>
      <div className="container-narrow">
        <BorderedHead
          n="01"
          title="Money in. Future grows."
          sub="A split happens on every payout you receive — automatically, before you even notice."
        />

        <Reveal>
          <div className="hairline-row rounded-xl" style={{ border: "1px solid var(--border-100)" }}>
            <div
              className="dot-grid"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "clamp(24px, 3vw, 36px)",
                display: "flex",
                flexDirection: "column",
                gap: 18,
                background: "var(--bg-200)",
                borderRadius: "var(--radius-xl)",
              }}
            >
              <div className="eyebrow accent-text">Auto-save</div>
              <h3 className="heading heading-md">Every payout saves 3%</h3>
              <p className="text muted">
                Link a wallet, pick a percentage, done. Each incoming payment splits: the rest lands
                in your wallet, your pension share flows straight into your vault.
              </p>
              <div
                className="border rounded"
                style={{ overflow: "hidden", background: "var(--bg-100)", padding: 16 }}
              >
                <Waveform />
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 0,
                padding: "clamp(24px, 3vw, 36px)",
                display: "flex",
                flexDirection: "column",
                gap: 18,
                background: "var(--accent-100)",
                borderRadius: "var(--radius-xl)",
                color: "#171c26",
              }}
            >
              <div className="eyebrow" style={{ color: "rgba(23,28,38,0.55)" }}>Compounding</div>
              <h3 className="heading heading-md" style={{ color: "#171c26" }}>Growth that runs itself</h3>
              <p className="text" style={{ color: "rgba(23,28,38,0.75)" }}>
                The agent re-balances across treasuries, lending pools, and stable assets — and
                records every move on-chain.
              </p>
              <div className="stack-2" style={{ gap: 12 }}>
                <DotStream />
              </div>
              <div className="stack-2" style={{ marginTop: "auto" }}>
                {[["TBILL", "4.9%"], ["AAVE", "5.2%"], ["USDC", "3.5%"]].map(([n, y]) => (
                  <div
                    key={n}
                    className="row space-between"
                    style={{ borderBottom: "1px dashed rgba(23,28,38,0.2)", paddingBlock: 9 }}
                  >
                    <span className="mono-sm" style={{ color: "rgba(23,28,38,0.7)" }}>{n}</span>
                    <span className="mono" style={{ fontWeight: 600, fontSize: 14 }}>{y}</span>
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
