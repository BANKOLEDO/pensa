import { useEffect, useRef } from "react";

interface Pt {
  x: number;
  y: number;
}

const START: Pt = { x: 0.06, y: 0.5 };
const SPLIT: Pt = { x: 0.5, y: 0.5 };
const WALLET: Pt = { x: 0.94, y: 0.27 };
const VAULT: Pt = { x: 0.94, y: 0.73 };

const LANES = [
  { c: "#f5a400", path: [START, { x: 0.28, y: 0.42 }, SPLIT] as Pt[], speed: 0.34, phase: 0 },
  { c: "#06b6d4", path: [SPLIT, { x: 0.72, y: 0.33 }, WALLET] as Pt[], speed: 0.42, phase: 0.6 },
  { c: "#00a46a", path: [SPLIT, { x: 0.72, y: 0.67 }, VAULT] as Pt[], speed: 0.46, phase: 0.3 },
];

function bezier(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.clearRect(0, 0, w, h);

  const px = (p: Pt) => ({ x: p.x * w, y: p.y * h });

  for (const lane of LANES) {
    const [p0, p1, p2] = lane.path.map(px);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
    ctx.strokeStyle = lane.c;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    const prog = (t * lane.speed + lane.phase) % 1;
    const pos = bezier(p0, p1, p2, prog);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = lane.c;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const nodes: { pt: Pt; c: string; r: number }[] = [
    { pt: START, c: "#f5a400", r: 5 },
    { pt: SPLIT, c: "#06b6d4", r: 4 },
    { pt: WALLET, c: "#06b6d4", r: 5 },
    { pt: VAULT, c: "#00a46a", r: 5 },
  ];
  for (const n of nodes) {
    const p = px(n.pt);
    ctx.beginPath();
    ctx.arc(p.x, p.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = n.c;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, n.r + 4, 0, Math.PI * 2);
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Animated savings-routing diagram (payout → wallet / vault split). */
export default function FlowCanvas({ height = 180 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let raf = 0;
    let paused = false;
    let w = 0;
    let h = 0;
    let start = performance.now();

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, w, h, 0.4);
    };
    resize();

    const loop = () => {
      if (!paused) draw(ctx, w, h, (performance.now() - start) / 1000);
      raf = requestAnimationFrame(loop);
    };

    if (reduced) {
      draw(ctx, w, h, 0.5);
    } else {
      raf = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const io = new IntersectionObserver((entries) => {
      paused = !entries[0].isIntersecting;
    });
    io.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [height]);

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height, display: "block" }} />
    </div>
  );
}
