import type { ReactNode } from "react";

/**
 * The head of a panel screen, design B ("Noche"): the module's mono eyebrow,
 * the title with the accent full stop, one line of what the screen is for, and
 * the screen's own actions on the right. Server component: it only lays out
 * what it is given.
 */
export default function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  /** "SERVICIO · PEDIDOS" — the group and the module. */
  eyebrow: string;
  title: string;
  description?: string;
  /** Pills and buttons: the screen's live state and its main action. */
  children?: ReactNode;
}) {
  return (
    <div className="lbd-ph lbd-rise">
      <div className="lbd-ph-text">
        <span className="lbd-ph-eyebrow">{eyebrow}</span>
        <h1 className="lbd-ph-h1">
          {title}
          <span style={{ color: "#ff5a33" }}>.</span>
        </h1>
        {description ? <span className="lbd-ph-desc">{description}</span> : null}
      </div>
      {children ? <div className="lbd-ph-actions">{children}</div> : null}
    </div>
  );
}
