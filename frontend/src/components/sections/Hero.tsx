import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Icon } from "../Icon";
import { useWallet } from "../../lib/wallet";

const PensionGlobe = lazy(() => import("../PensionGlobe"));

const STATS = [
  { v: "1.5B", l: "gig workers with no pension plan" },
  { v: "3%", l: "auto-saved from every payout" },
  { v: "~90k", l: "gas to deploy a vault" },
  { v: "0.5%", l: "protocol fee, returns only" },
];

function HeroStats() {
  return (
    <div className="hairline-row rounded">
      {STATS.map((s) => (
        <div key={s.l} className="stack-2" style={{ flex: 1, padding: "24px clamp(16px, 2vw, 28px)" }}>
          <div className="mono" style={{ fontSize: "1.9rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
            {s.v}
          </div>
          <div className="text-sm muted">{s.l}</div>
        </div>
      ))}
    </div>
  );
}

export default function Hero() {
  const { wallet } = useWallet();
  return (
    <section className="dot-grid-lg" style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid var(--border-100)" }}>
      {/* background glows, flat against the section */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-30%",
          right: "-8%",
          width: "58%",
          height: "95%",
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--accent-100) 15%, transparent), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-40%",
          left: "-6%",
          width: "45%",
          height: "80%",
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--teal-100) 12%, transparent), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="container" style={{ paddingBlock: "clamp(20px, 2.5vw, 36px) 0", position: "relative" }}>

        {/* two columns */}
        <div className="flex flex-wrap items-center gap-10 lg:gap-12" style={{ padding: "clamp(28px, 4vw, 48px) 0 0" }}>
          <div className="w-full max-w-2xl flex-1" style={{ position: "relative", zIndex: 1 }}>
            <motion.div
              className="row gap-3"
              style={{ marginBottom: 24, flexWrap: "wrap" }}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
            >
              <span className="pill pill-accent">
                <Icon name="globe" size={14} />
                X Layer · chain 196
              </span>
              <span className="pill">
                <Icon name="shield" size={14} />
                Non-custodial
              </span>
            </motion.div>

            <motion.h1
              className="display"
              style={{ marginBottom: 24 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
            >
              Pensions for the people who{" "}
              <span style={{ position: "relative", color: "var(--accent-100)" }}>
                run the gig economy
                <svg
                  viewBox="0 0 280 22"
                  preserveAspectRatio="none"
                  style={{ position: "absolute", left: 0, right: 0, bottom: -12, width: "100%", height: 16 }}
                  aria-hidden="true"
                >
                  {/* marker swipe */}
                  <path
                    d="M4 16 L206 10 L260 5 L260 9 L212 17 L4 21 Z"
                    fill="var(--accent-100)"
                  />
                  {/* sparkle */}
                  <path
                    d="M268 2 l1.6 3.8 3.8 1.6 -3.8 1.6 -1.6 3.8 -1.6 -3.8 -3.8 -1.6 3.8 -1.6 z"
                    fill="var(--accent-100)"
                  />
                </svg>
              </span>
              .
            </motion.h1>

            <motion.p
              className="text-xl muted"
              style={{ maxWidth: 560, marginBottom: 32 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18 }}
            >
              Every payout you receive automatically routes 3% into your personal on-chain vault.
              An open-source agent compounds it across treasuries, lending, and stable assets
              while you keep working.
            </motion.p>

            <motion.div
              className="row gap-3"
              style={{ flexWrap: "wrap" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.24 }}
            >
              <Link to={wallet ? "/app" : "/app/onboard"} className="btn btn-accent btn-lg">
                Open the dashboard
                <Icon name="arrow-right" size={16} />
              </Link>
              <a href="#how" className="btn btn-ghost btn-lg">
                How it works
              </a>
            </motion.div>

            <motion.div
              className="row gap-4"
              style={{ marginTop: 28, flexWrap: "wrap" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.32 }}
            >
              <span className="mono-sm muted">zero setup</span>
              <span className="mono-sm muted">no savings history needed</span>
              <span className="mono-sm muted">no minimums</span>
            </motion.div>
          </div>

          <motion.div
            className="w-full min-w-[300px] flex-1"
            style={{ position: "relative" }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <span className="sticker sticker-gold" style={{ top: -16, right: 24 }}>
              <Icon name="bolt" size={13} />
              save 3%
            </span>
            <div className="row" style={{ position: "absolute", top: 0, left: 0, zIndex: 3 }}>
              <span
                className="pill"
                style={{
                  background: "color-mix(in srgb, var(--bg-100) 72%, transparent)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <span className="dot-gold" />
                live network · 8 cities
              </span>
            </div>
            <div style={{ position: "absolute", top: 6, right: 0, zIndex: 3 }}>
              <span className="mono-sm" style={{ color: "var(--fg-400)" }}>X Layer</span>
            </div>
            <Suspense fallback={<div style={{ height: 400 }} />}>
              <PensionGlobe />
            </Suspense>
            <span className="sticker sticker-glass" style={{ bottom: -14, left: 0 }}>
              <span className="dot" style={{ background: "#00a46a" }} />
              +4.9% APR avg
            </span>
          </motion.div>
        </div>

        {/* stats */}
        <div style={{ padding: "clamp(48px, 6vw, 72px) 0 clamp(36px, 5vw, 64px)" }}>
          <HeroStats />
        </div>
      </div>
    </section>
  );
}
