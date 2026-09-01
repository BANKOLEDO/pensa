const LANES = [
  { label: "EXTERNAL", color: "var(--accent-100)", y: 0 },
  { label: "PROTOCOL", color: "var(--teal-100)", y: 1 },
  { label: "ON-CHAIN", color: "var(--green-100)", y: 2 },
  { label: "AI AGENT", color: "var(--purple-100)", y: 3 },
] as const;

const NODES = [
  { id: "gig", x: 40, y: 44, w: 130, h: 34, label: "GIG PLATFORM", sub: "uber · fiverr · upwork", lane: 0, color: "var(--accent-100)" },
  { id: "x402", x: 210, y: 44, w: 130, h: 34, label: "x402 PAYMENT", sub: "HTTP 402 · pay-to-play", lane: 0, color: "var(--accent-100)" },
  { id: "factory", x: 60, y: 100, w: 150, h: 40, label: "PENSA FACTORY", sub: "EIP-1167 · ~90k gas", lane: 1, color: "var(--teal-100)" },
  { id: "splitter", x: 260, y: 100, w: 150, h: 40, label: "PAYOUT SPLITTER", sub: "97% wallet · 3% vault", lane: 1, color: "var(--teal-100)" },
  { id: "vault", x: 60, y: 166, w: 150, h: 40, label: "WORKER VAULT", sub: "ownable · withdrawable", lane: 2, color: "var(--green-100)" },
  { id: "strategy", x: 260, y: 166, w: 150, h: 40, label: "STRATEGY REGISTRY", sub: "on-chain hash", lane: 2, color: "var(--green-100)" },
  { id: "alloc", x: 460, y: 166, w: 150, h: 40, label: "ALLOCATION", sub: "rwa · defi · stable", lane: 2, color: "var(--green-100)" },
  { id: "agent", x: 120, y: 232, w: 180, h: 40, label: "PENSA AGENT", sub: "yield · risk · rebalance", lane: 3, color: "var(--purple-100)" },
  { id: "market", x: 360, y: 232, w: 150, h: 40, label: "MARKET DATA", sub: "defilama · on-chain", lane: 3, color: "var(--purple-100)" },
  { id: "rwa", x: 520, y: 166, w: 100, h: 40, label: "RWA", sub: "t-bills · bonds", lane: 2, color: "var(--blue-100)" },
  { id: "defi", x: 640, y: 166, w: 100, h: 40, label: "DEFI", sub: "aave · compound", lane: 2, color: "var(--blue-100)" },
];

const FLOWS = [
  { from: "gig", to: "x402", color: "var(--accent-100)" },
  { from: "x402", to: "factory", color: "var(--accent-100)", curve: true },
  { from: "factory", to: "vault", color: "var(--teal-100)", curve: true },
  { from: "splitter", to: "strategy", color: "var(--teal-100)", curve: true },
  { from: "strategy", to: "alloc", color: "var(--green-100)" },
  { from: "alloc", to: "rwa", color: "var(--blue-100)" },
  { from: "alloc", to: "defi", color: "var(--blue-100)" },
  { from: "agent", to: "vault", color: "var(--purple-100)", curve: true },
  { from: "market", to: "agent", color: "var(--purple-100)", curve: true },
];

function nodeCenter(id: string) {
  const n = NODES.find((n) => n.id === id)!;
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

function flowPath(from: string, to: string, curve?: boolean) {
  const a = nodeCenter(from);
  const b = nodeCenter(to);
  if (curve) {
    const mx = (a.x + b.x) / 2;
    return `M${a.x},${a.y} Q${mx},${a.y} ${mx},${(a.y + b.y) / 2} T${b.x},${b.y}`;
  }
  return `M${a.x},${a.y} L${b.x},${b.y}`;
}

export default function ArchitectureFlow() {
  return (
    <div className="arch-diagram" style={{ position: "relative" }}>
      {/* Live indicator */}
      <div className="row gap-2" style={{ position: "absolute", top: 12, left: 16, zIndex: 2 }}>
        <span className="status-dot status-dot-live" />
        <span className="mono-sm" style={{ color: "var(--fg-400)" }}>LIVE SIGNAL PATH</span>
      </div>

      <svg viewBox="0 0 780 290" xmlns="http://www.w3.org/2000/svg" style={{ marginTop: 28 }}>
        <defs>
          {(["accent-100", "teal-100", "green-100", "purple-100", "blue-100"] as const).map((c) => (
            <marker
              key={c}
              id={`arrow-${c}`}
              markerWidth="7"
              markerHeight="5"
              refX="7"
              refY="2.5"
              orient="auto"
            >
              <path d="M0,0 L7,2.5 L0,5" fill="none" stroke={`var(--${c})`} strokeWidth="1" />
            </marker>
          ))}
        </defs>

        {/* Lane backgrounds */}
        {LANES.map((lane, i) => (
          <rect
            key={lane.label}
            x="0"
            y={i * 66 + 4}
            width="780"
            height="60"
            rx="4"
            fill={`color-mix(in srgb, ${lane.color} 4%, var(--bg-100))`}
            stroke="var(--border-100)"
            strokeWidth="0.5"
          />
        ))}

        {/* Lane labels */}
        {LANES.map((lane, i) => (
          <text
            key={`label-${lane.label}`}
            x="12"
            y={i * 66 + 18}
            className="mono-sm"
            style={{ fontSize: 7, fill: "var(--fg-400)", letterSpacing: ".12em" }}
          >
            {lane.label}
          </text>
        ))}

        {/* Flow paths */}
        {FLOWS.map((f, i) => (
          <path
            key={i}
            d={flowPath(f.from, f.to, f.curve)}
            fill="none"
            stroke={f.color}
            strokeWidth="1.2"
            strokeDasharray="4,4"
            opacity="0.4"
            markerEnd={`url(#arrow-${f.from === "gig" ? "accent-100" : f.from === "x402" ? "accent-100" : f.from === "factory" ? "teal-100" : f.from === "splitter" ? "teal-100" : f.from === "strategy" ? "green-100" : f.from === "alloc" ? "green-100" : "purple-100"})`}
          />
        ))}

        {/* Animated dots */}
        {FLOWS.filter((_, i) => i % 2 === 0).map((f, i) => (
          <circle
            key={`dot-${i}`}
            r="3"
            fill={f.color}
            style={{ color: f.color }}
          >
            <animateMotion
              dur={`${3 + i * 0.7}s`}
              repeatCount="indefinite"
              path={flowPath(f.from, f.to, f.curve)}
            />
          </circle>
        ))}

        {/* Nodes */}
        {NODES.map((n) => (
          <g key={n.id} className="arch-node" style={{ color: n.color }}>
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={n.h}
              rx="6"
              fill={`color-mix(in srgb, ${n.color} 10%, var(--bg-100))`}
              stroke={n.color}
              strokeWidth="1.2"
            />
            <text
              x={n.x + n.w / 2}
              y={n.y + n.h / 2 - 2}
              textAnchor="middle"
              style={{ fontSize: 9, fill: n.color, fontFamily: "var(--font-mono)", fontWeight: 600, letterSpacing: ".03em" }}
            >
              {n.label}
            </text>
            <text
              x={n.x + n.w / 2}
              y={n.y + n.h / 2 + 11}
              textAnchor="middle"
              style={{ fontSize: 7, fill: "var(--fg-400)", fontFamily: "var(--font-mono)" }}
            >
              {n.sub}
            </text>
          </g>
        ))}

        {/* Legend */}
        <g transform="translate(620,8)">
          <rect x="0" y="0" width="150" height="80" rx="4" fill="var(--bg-200)" stroke="var(--border-100)" strokeWidth="0.5" />
          <text x="10" y="14" style={{ fontSize: 7, fill: "var(--fg-400)", fontFamily: "var(--font-mono)", letterSpacing: ".1em" }}>LEGEND</text>
          {[["var(--accent-100)", "External"], ["var(--teal-100)", "Protocol"], ["var(--green-100)", "On-chain"], ["var(--purple-100)", "AI Agent"], ["var(--blue-100)", "DeFi"]].map(([c, l], i) => (
            <g key={i}>
              <circle cx="16" cy={26 + i * 12} r="3" fill={c} />
              <text x="24" y={29 + i * 12} style={{ fontSize: 7, fill: "var(--fg-300)", fontFamily: "var(--font-mono)" }}>{l}</text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
