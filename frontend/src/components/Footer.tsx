import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { useWallet } from "../lib/wallet";

const LINKS = [
  { label: "Vault", to: "/app" },
  { label: "How it works", href: "#how" },
  { label: "Assets", href: "#assets" },
  { label: "Security", href: "#security" },
];

export default function Footer() {
  const { wallet } = useWallet();
  const appRoute = wallet ? "/app" : "/app/onboard";
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <Link to="/" style={{ display: "inline-flex", width: "fit-content" }}>
            <Logo />
          </Link>
          <p className="text muted">
            AI-managed micro-pensions for the global gig economy. 3% of every payout grows your
            future on X Layer.
          </p>
          <div className="footer-links">
            {LINKS.map((l) =>
              l.to ? (
                <Link key={l.label} to={appRoute}>
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.label}
                  href={`#${l.href?.slice(1)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(l.href?.slice(1) ?? "");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {l.label}
                </a>
              )
            )}
          </div>
        </div>

        <div
          className="border-t"
          style={{
            paddingBlock: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span className="mono-sm muted">
            © {new Date().getFullYear()} PENSA Protocol · Built for BuildX AI Season
          </span>
          <div className="row gap-4">
            <a
              href="https://rpc.xlayer.tech"
              target="_blank"
              rel="noreferrer"
              className="mono-sm muted"
              style={{ textTransform: "none", letterSpacing: 0 }}
            >
              X Layer · chain 196
            </a>
            <span style={{ width: 1, height: 18, background: "var(--border-200)" }} aria-hidden="true" />
            <a
              href="https://www.oklink.com/x-layer"
              target="_blank"
              rel="noreferrer"
              className="mono-sm muted"
              style={{ textTransform: "none", letterSpacing: 0 }}
            >
              Explorer
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
