import type { CSSProperties } from "react";

export type IconName =
  | "shield"
  | "wallet"
  | "bolt"
  | "chart"
  | "globe"
  | "spark"
  | "terminal"
  | "arrow"
  | "arrow-up"
  | "arrow-right"
  | "check"
  | "check-circle"
  | "chevron-down"
  | "x"
  | "plus"
  | "menu"
  | "sun"
  | "moon"
  | "lock"
  | "key"
  | "scale"
  | "layers"
  | "refresh"
  | "clock"
  | "pin"
  | "coins"
  | "percent"
  | "database"
  | "pulse"
  | "users"
  | "network"
  | "snowflake"
  | "github"
  | "x-social"
  | "telegram"
  | "discord"
  | "link"
  | "doc"
  | "settings"
  | "logout";

const PATHS: Record<IconName, string> = {
  shield:
    "M12 3l7 3v5c0 4.7-3 8.6-7 10-4-1.4-7-5.3-7-10V6l7-3z",
  wallet:
    "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8M3 7h16M15 12h4",
  bolt: "M13 2L4 14h6l-1 8 9-12h-6l1-8z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  globe:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z",
  spark:
    "M12 2l2 6.5L20 10l-6 2.5L12 20l-2-7.5L4 10l6-1.5L12 2z",
  terminal:
    "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM7 9l3 3-3 3M13 15h4",
  arrow: "M3 17l6-6-6-6M9 5h12",
  "arrow-up": "M12 19V5M5 12l7-7 7 7",
  "arrow-right": "M5 12h14M13 6l6 6-6 6",
  check: "M4 12l5 5L20 6",
  "check-circle": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6",
  "chevron-down": "M6 9l6 6 6-6",
  x: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  menu: "M4 7h16M4 12h16M4 17h16",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  lock: "M5 11h14v9H5v-9zM8 11V7a4 4 0 0 1 8 0v4",
  key: "M21 6v4h-4M14 4h7M14 4l-8 8M6 14a3 3 0 1 0 3-3",
  scale: "M12 3v18M8 21h8M5 7l-3 5h6L5 7zM19 7l-3 5h6l-3-5z",
  layers: "M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5",
  refresh: "M21 12a9 9 0 1 1-2.6-6.3M21 3v6h-6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 3",
  pin: "M12 21s-7-5.7-7-11a7 7 0 0 1 14 0c0 5.3-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  coins: "M12 3c4 0 7 1.3 7 3s-3 3-7 3-7-1.3-7-3 3-3 7-3zM5 6v3c0 1.7 3 3 7 3s7-1.3 7-3V6M5 10v3c0 1.7 3 3 7 3s7-1.3 7-3v-3M5 14v3c0 1.7 3 3 7 3s7-1.3 7-3v-3",
  percent: "M19 5L5 19M6.5 6.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17.5 17.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  database:
    "M12 3c4 0 7 1.3 7 3v12c0 1.7-3 3-7 3s-7-1.3-7-3V6c0-1.7 3-3 7-3zM5 6c0 1.7 3 3 7 3s7-1.3 7-3M5 12c0 1.7 3 3 7 3s7-1.3 7-3",
  pulse:
    "M3 12h4l3-8 4 16 3-8h4",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  network:
    "M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM19 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 5v6M6 19h6M18 19h-6M12 11a2 2 0 0 0-2 2M12 11a2 2 0 0 1 2 2",
  snowflake:
    "M12 2v20M4.9 7l14.2 10M4.9 17L19.1 7M12 2l-2 2M12 2l2 2M12 22l-2-2M12 22l2-2",
  github:
    "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7.1a5.6 5.6 0 0 0-1.5-3.9 5.2 5.2 0 0 0-.1-3.9s-1.2-.4-4 1.5a13.9 13.9 0 0 0-7.3 0C6.9 2.2 5.7 2.6 5.7 2.6a5.2 5.2 0 0 0-.1 3.9 5.6 5.6 0 0 0-1.5 3.9c0 5.5 3.5 6.7 6.8 7.1a4.8 4.8 0 0 0-1 3.5V22",
  "x-social":
    "M4 4l16 16M20 4L4 20",
  telegram:
    "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  discord:
    "M18 4a15 15 0 0 0-4.5-1l-.2.4a13 13 0 0 0-3.6 0L9.5 3A15 15 0 0 0 5 4a15 15 0 0 0-3 12c1 .8 2 1.5 3.1 2l.8-1.2c-.4-.2-.9-.4-1.3-.6l.3-.3a11 11 0 0 0 10 0l.3.3c-.4.2-.9.4-1.3.6l.8 1.2a15 15 0 0 0 3.1-2 15 15 0 0 0-2.8-12zM9.6 13a1.3 1.3 0 0 0 0-2.7 1.3 1.3 0 0 0 0 2.7zM14.4 13a1.3 1.3 0 0 0 0-2.7 1.3 1.3 0 0 0 0 2.7z",
  link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
  doc: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6zM14 3v6h6M9 13h6M9 17h6",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  logout:
    "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
