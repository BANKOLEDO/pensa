interface LogoProps {
  light?: boolean;
  className?: string;
}

export function Mark({ size = 24, light }: { size?: number; light?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.2 19 5v5.1c0 4.9-3.1 8.9-7 10.2-3.9-1.3-7-5.3-7-10.2V5l7-2.8Z"
        fill={light ? "#fff" : "var(--accent-100)"}
      />
      <path
        d="M12 7l4 1.6v3.2c0 3-1.9 5.6-4 6.6-2.1-1-4-3.6-4-6.6V8.6L12 7Z"
        fill={light ? "var(--accent-300)" : "var(--navy-100)"}
      />
      <circle cx="12" cy="11.6" r="1.7" fill="#fff" />
    </svg>
  );
}

export function Logo({ light, className }: LogoProps) {
  return (
    <span
      className={`logo ${light ? "logo-light" : ""} ${className ?? ""}`}
      style={
        light
          ? ({ "--fg-100": "#ffffff" } as React.CSSProperties)
          : undefined
      }
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2.2 19 5v5.1c0 4.9-3.1 8.9-7 10.2-3.9-1.3-7-5.3-7-10.2V5l7-2.8Z"
          fill={light ? "#fff" : "var(--accent-100)"}
        />
        <path
          d="M12 7l4 1.6v3.2c0 3-1.9 5.6-4 6.6-2.1-1-4-3.6-4-6.6V8.6L12 7Z"
          fill={light ? "var(--accent-300)" : "var(--navy-100)"}
        />
        <circle cx="12" cy="11.6" r="1.7" fill="#fff" />
      </svg>
      <span style={{ letterSpacing: "-0.02em" }}>PENSA</span>
    </span>
  );
}
