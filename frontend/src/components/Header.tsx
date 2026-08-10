import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
import { useWallet } from "../lib/wallet";

export function EnvBadge({ env = "dev", live = false }: { env?: string; live?: boolean }) {
  const sim = !live || env === "dev";
  return (
    <span className={`pill ${sim ? "pill-green" : "pill-navy"}`}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: sim ? "var(--green-100)" : "#fff",
          flex: "none",
        }}
      />
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
      className={`sticky top-0 z-50 border-b border-line bg-base/85 backdrop-blur-lg transition-shadow ${
        scrolled ? "shadow-[0_10px_28px_rgba(0,0,0,0.4)]" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="PENSA home" className="flex flex-none items-center">
          <Logo />
        </a>

        {/* desktop links */}
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => {
            const isActive = active === l.href.slice(1);
            return (
              <a
                key={l.href}
                href={`#${l.href.slice(1)}`}
                onClick={scrollTo(l.href.slice(1))}
                className={`group relative rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-surface hover:text-ink ${
                  isActive ? "text-ink" : "text-ink3"
                }`}
              >
                {l.label}
                <span
                  className={`absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-gold transition-opacity ${
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-70"
                  }`}
                />
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            to={appRoute}
            className="hidden items-center gap-1.5 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-[#171c26] transition-colors hover:bg-gold-deep sm:inline-flex"
          >
            Open dashboard
            <Icon name="arrow-right" size={14} />
          </Link>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line2 text-ink2 transition-colors hover:border-line3 hover:text-ink lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            aria-expanded={open}
          >
            <Icon name={open ? "x" : "menu"} size={18} />
          </button>
        </div>
      </div>

      {/* mobile drawer */}
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-line bg-base/95 pb-4 pt-1 backdrop-blur-lg lg:hidden">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={`#${l.href.slice(1)}`}
              onClick={scrollTo(l.href.slice(1))}
              className="block rounded-md px-5 py-3 text-[15px] font-medium text-ink3 transition-colors hover:bg-surface hover:text-ink"
            >
              {l.label}
            </a>
          ))}
          <div className="px-4 pt-3">
            <Link
              to={appRoute}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 rounded-md bg-gold px-4 py-3 text-sm font-semibold text-[#171c26] transition-colors hover:bg-gold-deep"
            >
              Open dashboard
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
