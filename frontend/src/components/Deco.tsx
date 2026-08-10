import type { ReactNode } from "react";
import { motion } from "motion/react";

/** Scroll-triggered fade + rise reveal. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Staggered reveal container — children become staggered motion items. */
export function RevealGroup({
  children,
  gap = 16,
  className,
  delay = 0,
}: {
  children: ReactNode;
  gap?: number;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      style={{ display: "grid", gap }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Single child of RevealGroup. */
export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Four hairline corner squares placed on a `position:relative` bordered box. */
export function Corners() {
  return (
    <>
      <span className="corner corner-tl" aria-hidden="true" />
      <span className="corner corner-tr" aria-hidden="true" />
      <span className="corner corner-bl" aria-hidden="true" />
      <span className="corner corner-br" aria-hidden="true" />
    </>
  );
}

/** Centered eyebrow + title + sub. */
export function SectionTitle({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div
      className="stack-4"
      style={{
        maxWidth: 760,
        marginInline: "auto",
        textAlign: "center",
        marginBottom: "clamp(40px, 6vw, 64px)",
      }}
    >
      <div className="eyebrow accent-text">{eyebrow}</div>
      <h2 className="title">{title}</h2>
      {sub && <p className="text-lg muted">{sub}</p>}
    </div>
  );
}

/** Left-aligned heading with a mono index number. */
export function BorderedHead({
  n,
  title,
  sub,
}: {
  n?: string;
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="stack-3" style={{ marginBottom: 36 }}>
      <div className="row gap-3">
        {n && <span className="mono-sm muted">{n}</span>}
        <h2 className="heading heading-lg">{title}</h2>
      </div>
      {sub && (
        <p className="text muted" style={{ maxWidth: 620 }}>
          {sub}
        </p>
      )}
    </div>
  );
}
