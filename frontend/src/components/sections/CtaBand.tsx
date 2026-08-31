import { Link } from "react-router-dom";
import { Reveal } from "../Deco";
import { Icon } from "../Icon";
import { useWallet } from "../../lib/wallet";

const TICKER = [
  { icon: "wallet" as const, t: "No minimums" },
  { icon: "percent" as const, t: "0.5% fee · returns only" },
  { icon: "key" as const, t: "Withdraw anytime" },
  { icon: "doc" as const, t: "Strategy hash on-chain" },
  { icon: "shield" as const, t: "Non-custodial vaults" },
  { icon: "terminal" as const, t: "Telegram-first" },
  { icon: "bolt" as const, t: "3% auto-save" },
  { icon: "spark" as const, t: "Risk-aware AI" },
];

export default function CtaBand() {
  const { wallet } = useWallet();
  return (
    <section className="section-sm">
      <div className="container-narrow">
        <Reveal>
          <div
            className="ns-dotgrid cta-band"
            style={{
              border: "1px solid var(--border-200)",
              borderRadius: 16,
              padding: "clamp(28px, 4vw, 56px)",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at 50% 0%, color-mix(in srgb, currentColor 12%, transparent), transparent 60%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ position: "relative" }}>
              <h2 className="title" style={{ maxWidth: 640, marginInline: "auto", marginBottom: 12, color: "currentColor" }}>
                Start your pension in 60 seconds.
              </h2>
              <p className="text muted" style={{ maxWidth: 520, marginInline: "auto", marginBottom: 24, color: "color-mix(in srgb, currentColor 65%, transparent)" }}>
                No paperwork, no minimums, no manager. Just your wallet and a 3% habit.
              </p>
              <Link to={wallet ? "/app" : "/app/onboard"} className="btn" style={{ background: "var(--bg-100)", color: "var(--fg-100)", borderColor: "var(--bg-100)" }}>
                Open the dashboard
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        </Reveal>

        <div className="ticker-band marquee">
          <div className="marquee-track marquee-fast">
            {[...TICKER, ...TICKER].map((x, i) => (
              <span key={i} className="ticker-row" style={{ minWidth: 300, borderBottom: 0 }}>
                <Icon name={x.icon} size={16} className="accent-text" />
                {x.t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
