import { Link } from "react-router-dom";
import { Corners, Reveal } from "../Deco";
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
            className="rounded-xl"
            style={{
              background: "var(--accent-100)",
              padding: "clamp(40px, 6vw, 72px)",
              textAlign: "center",
              color: "#171c26",
              position: "relative",
            }}
          >
            <Corners />
            <h2 className="title" style={{ maxWidth: 640, marginInline: "auto", marginBottom: 16 }}>
              Start your pension in 60 seconds.
            </h2>
            <p
              className="text-lg"
              style={{ color: "rgba(23,28,38,0.72)", maxWidth: 520, marginInline: "auto", marginBottom: 32 }}
            >
              No paperwork, no minimums, no manager. Just your wallet and a 3% habit.
            </p>
            <Link to={wallet ? "/app" : "/app/onboard"} className="btn btn-dark btn-lg">
              Open the dashboard
              <Icon name="arrow-right" size={16} />
            </Link>
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
