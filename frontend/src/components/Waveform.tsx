const ROWS = 24;
const COLS = 44;

function litClass(i: number, j: number): string {
  const v =
    Math.sin(i * 0.42 + j * 0.23) * 0.55 +
    Math.cos(i * 0.11 - j * 0.37) * 0.45 +
    Math.sin((i + j) * 0.18) * 0.3;
  if (v > 0.62) return "lit l1";
  if (v > 0.28) return "lit l2";
  if (v < -0.62) return "lit l3";
  return "";
}

function DotGrid() {
  return (
    <div className="wave-dots" aria-hidden="true">
      {Array.from({ length: ROWS }).map((_, i) =>
        Array.from({ length: COLS }).map((_, j) => (
          <span key={`${i}-${j}`} className={`wave-dot ${litClass(i, j)}`} />
        ))
      )}
    </div>
  );
}

/** Vertically-scrolling waveform of lit dots. */
export default function Waveform() {
  return (
    <div className="wave-scroll">
      <div className="wave-track">
        <DotGrid />
        <DotGrid />
        <DotGrid />
        <DotGrid />
      </div>
    </div>
  );
}
