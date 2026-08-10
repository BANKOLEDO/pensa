import { SectionTitle, Reveal } from "../Deco";
import { Icon } from "../Icon";

const DASHBOARD_PHOTO =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80";
const BOT_PHOTO =
  "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=80";

export default function Showcase() {
  return (
    <section className="section" id="showcase" style={{ paddingTop: 0 }}>
      <div className="container">
        <SectionTitle
          eyebrow="Built for where you already work"
          title="The dashboard, and the bot that runs it."
          sub="Track compounding in the browser or just text the bot — same vault, same chain, same keys."
        />

        <Reveal>
          <div className="relative mx-auto max-w-5xl">
            {/* browser window — dashboard */}
            <div className="lg:-rotate-2 rounded-xl border shadow-stack overflow-hidden" style={{ background: "var(--bg-100)", borderColor: "var(--border-200)" }}>
              {/* browser chrome */}
              <div className="row items-center" style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-100)", gap: 10 }}>
                <span className="row" style={{ gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#e5484d" }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f5a400" }} />
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#00a46a" }} />
                </span>
                <div className="row items-center" style={{ flex: 1, background: "var(--bg-200)", borderRadius: 8, padding: "5px 12px", gap: 8 }}>
                  <Icon name="lock" size={12} className="muted" />
                  <span className="mono-sm" style={{ color: "var(--fg-400)" }}>pensa.app/vault</span>
                </div>
                <span className="mono-sm hidden sm:inline" style={{ color: "var(--fg-400)" }}>v0.4.2</span>
              </div>

              <img
                src={DASHBOARD_PHOTO}
                alt="PENSA web dashboard"
                className="w-full object-cover"
                style={{ height: "clamp(280px, 34vw, 440px)" }}
                loading="lazy"
              />

              {/* browser footer */}
              <div className="row space-between" style={{ padding: "10px 14px", borderTop: "1px solid var(--border-100)" }}>
                <span className="mono-sm accent-text">web dashboard</span>
                <span className="mono-sm muted">desktop + mobile</span>
              </div>
            </div>

            {/* phone — Telegram bot, overlapping and offset down-right */}
            <div className="relative lg:absolute lg:-bottom-16 lg:right-6 lg:w-[42%]" style={{ marginTop: "clamp(40px, 5vw, 64px)", marginInline: "auto" }}>
              <div className="lg:rotate-3 rounded-2xl border shadow-stack" style={{ background: "var(--bg-100)", borderColor: "var(--border-300)", padding: 8, maxWidth: 380, marginInline: "auto" }}>
                <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-200)" }}>
                  {/* status bar */}
                  <div className="row space-between" style={{ padding: "8px 14px" }}>
                    <span className="mono-sm" style={{ color: "var(--fg-400)" }}>9:41</span>
                    <span style={{ width: 90, height: 22, borderRadius: 11, background: "var(--bg-300)" }} />
                    <span className="mono-sm" style={{ color: "var(--fg-400)" }}>100%</span>
                  </div>
                  <img
                    src={BOT_PHOTO}
                    alt="PENSA Telegram bot"
                    className="w-full object-cover"
                    style={{ height: "clamp(220px, 26vw, 340px)" }}
                    loading="lazy"
                  />
                  {/* chat bar */}
                  <div className="row items-center" style={{ gap: 8, padding: "10px 12px", borderTop: "1px solid var(--border-100)" }}>
                    <span className="mono-sm" style={{ color: "var(--green-100)" }}>online</span>
                    <div className="row" style={{ flex: 1, background: "var(--bg-300)", borderRadius: 999, padding: "6px 12px" }}>
                      <span className="mono-sm muted">PENSA Bot</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* floating live chip */}
              <span className="sticker sticker-gold lg:-rotate-3" style={{ top: -18, right: 12 }}>
                <span className="dot" style={{ background: "#171c26" }} />
                +4.9% APR avg
              </span>
            </div>
          </div>
        </Reveal>

        <div className="row gap-6" style={{ marginTop: 56, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            ["web dashboard", "#ffc94d"],
            ["desktop + mobile", "var(--fg-400)"],
            ["telegram bot", "#06b6d4"],
            ["zero install", "var(--fg-400)"],
            ["same vault · one key", "var(--fg-400)"],
          ].map(([label, color]) => (
            <span key={label} className="row gap-2 mono-sm" style={{ color: "var(--fg-400)" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
