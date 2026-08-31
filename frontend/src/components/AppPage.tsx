import type { ReactNode } from "react";

/** Recessed bounding frame for app routes — mirrors the landing page: edges of
    the viewport show a recessed background with the app floating inside a
    rounded, hairline-bordered panel. */
export default function AppPage({ children }: { children: ReactNode }) {
  return (
    <div className="app-page">
      <div className="app-frame">{children}</div>
    </div>
  );
}
