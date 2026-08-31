const TOKEN_ROW = [
  { t: "USDC", c: "var(--teal-100)", y: "3.5%" },
  { t: "TBILL", c: "var(--accent-100)", y: "4.9%" },
  { t: "USDY", c: "var(--accent-100)", y: "4.7%" },
  { t: "AAVE-USDC", c: "var(--teal-100)", y: "5.2%" },
  { t: "USDT", c: "var(--green-100)", y: "3.3%" },
  { t: "Ondo", c: "var(--accent-100)", y: "4.6%" },
  { t: "COMP", c: "var(--teal-100)", y: "4.1%" },
  { t: "Curve3pool", c: "var(--green-100)", y: "3.9%" },
];

export default function TokenTicker() {
  return (
    <div className="marquee" style={{ borderBottom: "1px solid var(--border-100)", paddingBlock: 20, background: "var(--bg-200)" }}>
      <div className="marquee-track marquee-slow">
        {[...TOKEN_ROW, ...TOKEN_ROW, ...TOKEN_ROW, ...TOKEN_ROW].map((x, i) => (
          <span
            key={i}
            className="mono"
            style={{
              paddingInline: 28,
              fontSize: 13,
              color: "var(--fg-400)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: x.c }} />
            {x.t}
            <span style={{ color: x.c }}>{x.y}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
