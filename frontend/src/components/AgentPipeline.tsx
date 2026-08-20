import { Icon } from "./Icon";

export interface AgentStep {
  id: string;
  label: string;
}

export default function AgentPipeline({ steps, activeIndex, error }: { steps: AgentStep[]; activeIndex: number; error?: string }) {
  return (
    <div
      className="border rounded fade-up"
      style={{
        padding: "14px 16px",
        background: "var(--bg-300)",
        borderColor: "var(--accent-600)",
        marginTop: 18,
      }}
    >
      <div className="row gap-2" style={{ alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Icon name="spark" size={16} className="accent-text" />
        <span className="text-sm" style={{ fontWeight: 700 }}>PENSAgent working…</span>
        <span className="blink mono-sm muted" style={{ marginLeft: "auto" }}>
          live
        </span>
      </div>
      <div className="stack-2">
        {steps.map((s, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <div key={s.id} className="row gap-3" style={{ gap: 12, alignItems: "center" }}>
              <span
                className="border rounded"
                style={{
                  width: 22,
                  height: 22,
                  display: "grid",
                  placeContent: "center",
                  background: done ? "var(--green-100)" : active ? "var(--bg-400)" : "var(--bg-200)",
                  color: done ? "#0a0f18" : active ? "var(--accent-100)" : "var(--fg-400)",
                  fontSize: 12,
                  fontWeight: 700,
                  flex: "none",
                }}
              >
                {done ? "✓" : active ? <span className="spin">◌</span> : i + 1}
              </span>
              <span className="text-sm" style={{ color: done ? "var(--fg-200)" : active ? "var(--fg-100)" : "var(--fg-400)", fontWeight: active || done ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
          );
        })}
        {error && <p className="text-sm" style={{ color: "var(--red-100)", margin: 0 }}>{error}</p>}
      </div>
    </div>
  );
}