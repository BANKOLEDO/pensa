import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Icon } from "../Icon";
import { useWallet } from "../../lib/wallet";

const PensionGlobe = lazy(() => import("../PensionGlobe"));

function HeroStamp() {
  return (
    <div className="ns-stamp inline-flex items-center gap-2" style={{ padding: "4px 12px", borderRadius: 999, background: "color-mix(in srgb, var(--bg-100) 78%, transparent)", border: "1px solid color-mix(in srgb, var(--accent-100) 35%, transparent)" }}>
      <span className="status-dot status-dot-live" />
      <span className="mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent-100)" }}>
        system live · X Layer / chain 196
      </span>
    </div>
  );
}

const METRICS = [
  { l: "unbanked gig workers", v: "1.5B", c: "var(--accent-100)", live: true },
  { l: "auto-saved", v: "3%", c: "var(--teal-100)" },
  { l: "vault deploy gas", v: "~90k", c: "var(--green-100)" },
  { l: "protocol fee", v: "0.5%", c: "var(--purple-100)" },
];

export default function Hero() {
  const { wallet } = useWallet();
  return (
    <section className="ns-dotgrid" style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid var(--border-100)" }}>
      <div className="container" style={{ paddingBlock: "clamp(24px, 3vw, 44px) 0" }}>
        <div className="flex flex-wrap items-center gap-8" style={{ padding: "clamp(20px, 3vw, 36px) 0 0" }}>
          <div className="w-full max-w-2xl flex-1" style={{ position: "relative", zIndex: 1 }}>
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.05 }}>
              <HeroStamp />
            </motion.div>

            <motion.h1
              className="display"
              style={{ marginTop: 20, marginBottom: 16 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Pensions for the people who{" "}
              <span style={{ position: "relative", color: "var(--accent-100)" }}>run the gig economy</span>.
            </motion.h1>

            <motion.p
              className="text-lg muted"
              style={{ maxWidth: 560, marginBottom: 24 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
            >
              Every payout automatically routes 3% into your personal on-chain vault. An
              open-source agent compounds it across treasuries, lending, and stable assets
              while you keep working.
            </motion.p>

            <motion.div
              className="row gap-3"
              style={{ flexWrap: "wrap" }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22 }}
            >
              <Link to={wallet ? "/app" : "/app/onboard"} className="btn btn-accent">
                Open the dashboard
                <Icon name="arrow-right" size={16} />
              </Link>
              <a href="#how" className="btn btn-ghost">
                How it works
              </a>
            </motion.div>
          </div>

          <motion.div
            className="w-full min-w-[300px] flex-1"
            style={{ position: "relative" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
          >
            <Suspense fallback={<div style={{ height: 320 }} />}>
              <PensionGlobe />
            </Suspense>
          </motion.div>
        </div>

        {/* compact metric row */}
        <div style={{ padding: "clamp(28px, 4vw, 48px) 0 clamp(20px, 3vw, 32px)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {METRICS.map((m) => (
              <div key={m.l} style={{ padding: "14px 16px", border: "1px solid var(--border-100)", borderRadius: "10px", background: "var(--bg-200)" }}>
                <div className="row gap-2" style={{ gap: 8, marginBottom: 6 }}>
                  {m.live && <span className="status-dot status-dot-live" />}
                  <div className="mono" style={{ fontSize: 22, fontWeight: 600, color: m.c, lineHeight: 1 }}>{m.v}</div>
                </div>
                <div className="text-xs muted">{m.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
