import { useEffect, useMemo, useRef, useState } from "react";
import { usd } from "../lib/format";

interface GrowthChartProps {
  /** current total vault value */
  total: number;
  /** total deposited (start of the line) */
  deposited: number;
  /** expected APR % */
  apr: number;
  /** years left until retirement (projection horizon) */
  yearsToRetirement: number;
}

const W = 560;
const H = 190;
const PAD = { l: 10, r: 10, t: 18, b: 26 };
const INNER_W = W - PAD.l - PAD.r;
const INNER_H = H - PAD.t - PAD.b;

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export default function GrowthChart({ total, deposited, apr, yearsToRetirement }: GrowthChartProps) {
  const [progress, setProgress] = useState(0);
  const [showProjection, setShowProjection] = useState(false);
  const firstRun = useRef(true);

  // Build the series: real path from deposited → today, then project to retirement.
  const series = useMemo(() => {
    const nowX = PAD.l + INNER_W * 0.62;
    // Two real points: what you saved (deposited) and what it's worth now.
    const past = [
      { x: PAD.l, y: 0, val: deposited },
      { x: nowX, y: 0, val: total },
    ];

    // projection: compound APR over remaining years
    const projected = [];
    const steps = Math.max(12, Math.round(yearsToRetirement * 4));
    const r = Math.max(apr, 0) / 100 / 12;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = nowX + t * (INNER_W - nowX + PAD.l - PAD.r);
      const val = total * Math.pow(1 + r, i * 12 * 0.25); // quarterly compounding
      projected.push({ x, y: 0, val });
    }
    return { past, nowX, projected, maxVal: Math.max(total, projected[projected.length - 1]?.val ?? total, deposited) };
  }, [total, deposited, apr, yearsToRetirement]);

  const mapped = useMemo(() => {
    const max = series.maxVal * 1.08;
    const min = 0;
    const mapY = (v: number) => PAD.t + INNER_H - ((v - min) / (max - min)) * INNER_H;
    const past = series.past.map((p) => ({ ...p, y: mapY(p.val) }));
    const projected = series.projected.map((p) => ({ ...p, y: mapY(p.val) }));
    return { past, projected, max, mapY };
  }, [series]);

  const projPath = useMemo(() => smoothPath(mapped.projected), [mapped]);

  // Draw the past line in, then reveal the projection.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const start = performance.now();
      const dur = 900;
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        setProgress(p);
        if (p < 1) requestAnimationFrame(step);
        else window.setTimeout(() => setShowProjection(true), 250);
      };
      requestAnimationFrame(step);
    }, 300);
    return () => window.clearTimeout(t);
  }, []);

  // Re-run the draw when the total jumps (new payout).
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setProgress(0);
    setShowProjection(false);
    const t = window.setTimeout(() => {
      const start = performance.now();
      const dur = 700;
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        setProgress(p);
        if (p < 1) requestAnimationFrame(step);
        else window.setTimeout(() => setShowProjection(true), 200);
      };
      requestAnimationFrame(step);
    }, 250);
    return () => window.clearTimeout(t);
  }, [total]);

  const clippedPast = useMemo(
    () => {
      const visible = Math.floor(mapped.past.length * (0.35 + 0.65 * progress));
      return smoothPath(mapped.past.slice(0, Math.max(visible, 2)));
    },
    [mapped, progress]
  );

  const nowPt = mapped.past[mapped.past.length - 1];
  const projEnd = mapped.projected[mapped.projected.length - 1];

  return (
    <div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="growFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffc94d" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ffc94d" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="projStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffc94d" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4d7cfe" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines */}
        {[0.25, 0.5, 0.75].map((g) => {
          const y = PAD.t + INNER_H * g;
          return (
            <line key={g} x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="var(--border-100)" strokeWidth="1" strokeDasharray="3 6" />
          );
        })}

        {/* past fill + line */}
        {clippedPast && (
          <>
            <path d={`${clippedPast} L ${nowPt.x} ${PAD.t + INNER_H} L ${PAD.l} ${PAD.t + INNER_H} Z`} fill="url(#growFill)" />
            <path d={clippedPast} fill="none" stroke="var(--accent-100)" strokeWidth="2.5" strokeLinecap="round" />
          </>
        )}

        {/* projected dashed path */}
        {showProjection && projPath && (
          <path
            d={projPath}
            fill="none"
            stroke="url(#projStroke)"
            strokeWidth="2"
            strokeDasharray="5 7"
            strokeLinecap="round"
            style={{ animation: "fadeUp 0.7s ease both" }}
          />
        )}

        {/* now point */}
        <circle cx={nowPt.x} cy={nowPt.y} r="5" fill="var(--accent-100)" stroke="var(--bg-100)" strokeWidth="2">
          <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* projected end point */}
        {showProjection && <circle cx={projEnd.x} cy={projEnd.y} r="4" fill="var(--blue-100)" stroke="var(--bg-100)" strokeWidth="2" />}

        {/* x labels */}
        <text x={PAD.l} y={H - 6} fill="var(--fg-400)" fontSize="11">
          deposited
        </text>
        <text x={nowPt.x} y={H - 6} fill="var(--fg-300)" fontSize="11" textAnchor="middle">
          today
        </text>
        <text x={projEnd.x} y={H - 6} fill="var(--fg-400)" fontSize="11" textAnchor="end">
          {yearsToRetirement > 0 ? `~${Math.round(yearsToRetirement)} yrs` : "now"}
        </text>
      </svg>

      <div className="row space-between" style={{ marginTop: 8 }}>
        <div>
          <div className="text-xs muted">today</div>
          <div className="mono" style={{ color: "var(--accent-100)" }}>{usd(total)}</div>
        </div>
        {showProjection && (
          <div style={{ textAlign: "right" }}>
            <div className="text-xs muted">projected @ {apr.toFixed(1)}% APR</div>
            <div className="mono" style={{ color: "var(--blue-100)" }}>{usd(projEnd.val)}</div>
          </div>
        )}
      </div>
    </div>
  );
}