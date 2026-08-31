import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { useWallet } from "../lib/wallet";
import { useTheme } from "../lib/theme";

export function EnvBadge({ env = "dev", live = false, className = "" }: { env?: string; live?: boolean; className?: string }) {
  const sim = !live || env === "dev";
  return (
    <span className={`ns-badge ns-badge-green ${className}`}>
      <span className="dot" />
      {sim ? "Simulation · dev" : env === "prod" ? "X Layer mainnet" : "X Layer testnet"}
    </span>
  );
}

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#assets", label: "Asset classes" },
  { href: "#security", label: "Security" },
  { href: "#risk", label: "Risk profiles" },
];

const SECTION_IDS = ["how", "assets", "risk", "security"];

export default function Header() {
  const { wallet } = useWallet();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");
  const appRoute = wallet ? "/app" : "/app/onboard";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-50"
      style={{ padding: "clamp(10px, 1.6vw, 22px) clamp(12px, 2vw, 28px) 0", transition: "padding 180ms ease" }}
    >
      <div
        className="ns-dotgrid"
        style={{
          maxWidth: 1360,
          marginInline: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          height: 52,
          paddingInline: "14px 16px",
          border: "1px solid var(--border-200)",
          borderRadius: 14,
          background: "color-mix(in srgb, var(--bg-100) 86%, transparent)",
          backdropFilter: "blur(12px)",
          boxShadow: scrolled ? "0 10px 30px rgba(0,0,0,0.28)" : "0 4px 14px rgba(0,0,0,0.12)",
          transition: "box-shadow 180ms ease",
        }}
      >
        <div className="flex flex-none items-center gap-7">
          <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="PENSA home" className="flex flex-none items-center">
            <Logo />
          </a>

          {/* desk links — left-aligned segmented rail */}
          <nav className="hidden items-center gap-1 lg:flex" style={{ border: "1px solid var(--border-200)", borderRadius: 999, padding: 3, background: "color-mix(in srgb, var(--bg-300) 60%, transparent)" }}>
            {LINKS.map((l) => {
              const isActive = active === l.href.slice(1);
              return (
                <a
                  key={l.href}
                  href={`#${l.href.slice(1)}`}
                  onClick={scrollTo(l.href.slice(1))}
                  className={isActive ? "nav-pill active" : "nav-pill"}
                >
                  {l.label}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
          </button>
          <Link
            to={appRoute}
            className="btn btn-accent btn-sm hidden sm:inline-flex"
          >
            Open dashboard
            <Icon name="arrow-right" size={14} />
          </Link>
          <button
            className="theme-toggle lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            aria-expanded={open}
          >
            <Icon name={open ? "x" : "menu"} size={17} />
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="lg:hidden ns-dotgrid" style={{ maxWidth: 1360, marginInline: "auto", marginTop: 8, border: "1px solid var(--border-200)", borderRadius: 14, background: "var(--bg-100)", overflow: "hidden" }}>
          <div className="px-4 py-2">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={`#${l.href.slice(1)}`}
                onClick={scrollTo(l.href.slice(1))}
                className="block py-3"
                style={{ color: "var(--fg-200)", borderBottom: "1px solid var(--border-100)" }}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
