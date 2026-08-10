const TOKEN_ROW = [
  { t: "USDC", c: "#06b6d4" },
  { t: "TBILL", c: "#f5a400" },
  { t: "USDY", c: "#ffc94d" },
  { t: "AAVE-USDC", c: "#67e8f9" },
  { t: "USDT", c: "#00a46a" },
  { t: "Ondo", c: "#f5a400" },
  { t: "COMP", c: "#67e8f9" },
  { t: "Curve", c: "#06b6d4" },
];

export default function TokenTicker() {
  return (
    <div className="marquee" style={{ borderBottom: "1px solid var(--border-100)", paddingBlock: 20 }}>
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
          </span>
        ))}
      </div>
    </div>
  );
}
