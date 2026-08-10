interface Segment {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  segments: Segment[];
  center: string;
  sub?: string;
  size?: number;
  thickness?: number;
}

export default function Donut({ segments, center, sub, size = 200, thickness = 24 }: DonutProps) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div
      style={{ position: "relative", width: size, height: size, display: "inline-flex", justifyContent: "center" }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="allocation donut">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border-200)"
          strokeWidth={thickness}
        />
        {segments.map((s, i) => {
          const frac = total > 0 ? s.value / total : 0;
          const dash = frac * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeContent: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--fg-100)",
          }}
        >
          {center}
        </div>
        {sub && <div style={{ fontSize: 12, color: "var(--fg-400)" }}>{sub}</div>}
      </div>
    </div>
  );
}
