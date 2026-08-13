import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** DOM id of the element to spotlight (optional — full-screen step when absent). */
  target?: string;
  /** Switch the dashboard to this tab before showing the step. */
  tab?: string;
}

interface TargetBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TourProps {
  steps: TourStep[];
  open: boolean;
  onStep?: (step: TourStep) => void;
  onClose: () => void;
}

export default function Tour({ steps, open, onStep, onClose }: TourProps) {
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<TargetBox | null>(null);

  const current = steps[Math.min(step, steps.length - 1)];

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (open && current?.tab && onStep) onStep(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open) return;
    // Let the tab render before measuring the highlighted element.
    const t = window.setTimeout(() => {
      if (current?.target) {
        const el = document.getElementById(current.target);
        if (el) {
          const r = el.getBoundingClientRect();
          setBox({ x: r.left, y: r.top, w: r.width, h: r.height });
        } else {
          setBox(null);
        }
      } else {
        setBox(null);
      }
    }, 120);
    return () => window.clearTimeout(t);
  }, [open, current]);

  const advance = (dir: 1 | -1) => {
    const next = Math.min(Math.max(step + dir, 0), steps.length - 1);
    setStep(next);
  };

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step, steps.length]);

  if (!open) return null;

  const isLast = step === steps.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none" }}>
      {/* dim the page, keep the target readable */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(6,10,18,0.72)", backdropFilter: "blur(2px)" }} />
      {box && (
        <div
          style={{
            position: "absolute",
            left: box.x - 8,
            top: box.y - 8,
            width: box.w + 16,
            height: box.h + 16,
            borderRadius: 16,
            boxShadow: "0 0 0 4px var(--accent-100), 0 0 0 9999px rgba(6,10,18,0.72)",
            pointerEvents: "none",
            transition: "all .25s ease",
          }}
        />
      )}

      {/* speech card */}
      <div
        style={{
          position: "absolute",
          left: 24,
          right: 24,
          bottom: 24,
          maxWidth: 640,
          marginInline: "auto",
          background: "var(--bg-100)",
          border: "1px solid var(--border-200)",
          borderRadius: 18,
          boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
          padding: "22px 24px",
          pointerEvents: "auto",
        }}
      >
        <div className="row space-between" style={{ marginBottom: 10 }}>
          <span className="pill pill-accent">
            <Icon name="spark" size={13} />
            Guided tour · {step + 1} of {steps.length}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close tour">
            Skip
            <Icon name="x" size={14} />
          </button>
        </div>

        <h3 className="heading heading-sm" style={{ margin: "0 0 6px" }}>{current.title}</h3>
        <p className="text-sm muted" style={{ margin: 0, maxWidth: 560 }}>{current.body}</p>

        <div style={{ height: 5, background: "var(--border-200)", borderRadius: 999, marginTop: 18, overflow: "hidden" }}>
          <span style={{ display: "block", height: "100%", width: `${progress}%`, background: "var(--accent-100)", transition: "width .25s ease" }} />
        </div>

        <div className="row space-between" style={{ marginTop: 16, gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => advance(-1)} disabled={step === 0}>
            <Icon name="arrow" size={14} />
            Back
          </button>
          <button className="btn btn-accent" onClick={() => (isLast ? onClose() : advance(1))}>
            {isLast ? "Done — explore freely" : "Next"}
            <Icon name="arrow-right" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}