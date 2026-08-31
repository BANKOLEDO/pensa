import { BorderedHead, Reveal } from "../Deco";
import { Icon } from "../Icon";
import FlowCanvas from "../FlowCanvas";

const AGENT_LOG = [
  { t: "profile", msg: "risk tolerance 34/100 · horizon 35y · fallback enabled" },
  { t: "yield", msg: "sampled 14 protocols · best RWA 4.9%, DeFi 5.2%" },
  { t: "weights", msg: "stable 34% · rwa 42% · defi 24% · hash 0x7f3a…c91" },
  { t: "rebalance", msg: "no-op — drift below 2% threshold" },
  { t: "next", msg: "re-check yields in 6h · pausing for now" },
];

export default function SecurityBento() {
  return (
    <section className="section" id="security">
      <div className="container">
        <BorderedHead
          n="03 / trust"
          title="An agent you can audit."
          sub="The strategy is open-source, every decision is hashed on-chain, and your money never leaves your vault."
        />

        <Reveal>
          <div className="bento-frost">
            {/* Agent console — full width, frosted glass */}
            <div className="bento-card span-8 glow-violet">
              <div className="eyebrow" style={{ color: "var(--purple-100)", marginBottom: 16 }}>
                Agent console
              </div>
              <h3 className="heading heading-md" style={{ marginBottom: 20 }}>
                The agent that runs your pension
              </h3>
              <div
                className="data-display"
                style={{ flex: 1 }}
              >
                <div className="row gap-3" style={{ marginBottom: 14 }}>
                  <span className="status-dot status-dot-live" />
                  <span className="mono-sm" style={{ color: "var(--fg-400)" }}>
                    pensa-agent · live session
                  </span>
                  <span style={{ marginLeft: "auto" }} className="mono-sm sema-teal">
                    X Layer
                  </span>
                </div>
                {AGENT_LOG.map((l, i) => (
                  <div
                    key={i}
                    className="row"
                    style={{ gap: 10, paddingBlock: 6, alignItems: "flex-start" }}
                  >
                    <span className="mono-sm" style={{ color: "var(--fg-400)", width: 84, flex: "none" }}>
                      [{l.t}]
                    </span>
                    <span style={{ color: "var(--fg-200)" }}>{l.msg}</span>
                  </div>
                ))}
                <div className="row" style={{ gap: 10, paddingBlock: 6 }}>
                  <span className="mono-sm" style={{ color: "var(--fg-400)", width: 84, flex: "none" }}>
                    [think]
                  </span>
                  <span className="blink" style={{ color: "var(--fg-300)" }}>_</span>
                </div>
              </div>
            </div>

            {/* Factory — semantic teal card */}
            <div className="bento-card span-4 glow-teal">
              <div className="eyebrow" style={{ color: "var(--teal-100)", marginBottom: 16 }}>
                Factory
              </div>
              <h3 className="heading heading-md" style={{ marginBottom: 16 }}>
                Every vault is a clone
              </h3>
              <div className="mono" style={{ fontSize: "1.9rem", fontWeight: 600, letterSpacing: "-0.03em", marginBottom: 8, color: "var(--teal-100)" }}>
                ~90k gas
              </div>
              <p className="text muted" style={{ marginBottom: 20 }}>
                Vaults deploy as EIP-1167 minimal proxies from a single factory — auditable, tiny, and
                cheap enough that each worker gets their own.
              </p>
              <div className="ns-badge ns-badge-teal" style={{ width: "fit-content", marginTop: "auto" }}>
                EIP-1167
              </div>
            </div>

            {/* Custody — semantic mint card */}
            <div className="bento-card span-4 glow-mint">
              <div className="eyebrow" style={{ color: "var(--green-100)", marginBottom: 16 }}>
                Custody
              </div>
              <h3 className="heading heading-md" style={{ marginBottom: 16 }}>
                Your keys, always
              </h3>
              <div className="stack-3" style={{ marginTop: "auto" }}>
                {[
                  ["PENSA never takes custody", "shield"],
                  ["Withdraw is user-only, single-step", "key"],
                  ["Factory only records yields", "lock"],
                ].map(([label, icon]) => (
                  <div key={label} className="row" style={{ gap: 12 }}>
                    <Icon
                      name={icon as "shield"}
                      size={16}
                      className="sema-mint"
                      style={{ flex: "none" }}
                    />
                    <span className="text-sm" style={{ color: "var(--fg-300)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* x402 flow — full width, frosted */}
            <div className="bento-card span-8 glow-gold">
              <div className="eyebrow" style={{ color: "var(--accent-100)", marginBottom: 16 }}>
                x402
              </div>
              <h3 className="heading heading-md" style={{ marginBottom: 8 }}>
                One habit, every chain
              </h3>
              <p className="text muted" style={{ maxWidth: 560, marginBottom: 8 }}>
                Payouts verified on-chain via x402 split into wallet and pension automatically.
              </p>
              <FlowCanvas height={150} />
              <div className="row gap-6" style={{ marginTop: 12, flexWrap: "wrap" }}>
                <div className="flow-lane">
                  <span className="status-dot" style={{ background: "var(--accent-100)" }} />
                  <span>
                    <span className="mono-sm">payout</span>
                    <span className="mono" style={{ marginLeft: 10 }}>client → you</span>
                  </span>
                </div>
                <div className="flow-lane">
                  <span className="status-dot" style={{ background: "var(--teal-100)" }} />
                  <span>
                    <span className="mono-sm">97% → wallet</span>
                    <span className="mono" style={{ marginLeft: 10 }}>3% → vault</span>
                  </span>
                </div>
                <div className="flow-lane">
                  <span className="status-dot" style={{ background: "var(--green-100)" }} />
                  <span>
                    <span className="mono-sm">yield</span>
                    <span className="mono" style={{ marginLeft: 10 }}>rwa · defi · stable</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
