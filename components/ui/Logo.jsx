/**
 * FoodFlow mark: three tines — the three order channels — converging into a
 * single stem. It is a fork and it is the product's one idea (dine-in,
 * pickup and delivery arriving in one queue) in the same shape.
 *
 * `pathLength="1"` normalises every stroke to a length of 1, so the intro
 * overlay can draw them with a single `stroke-dashoffset: 1 → 0` animation
 * regardless of their real geometry.
 */
export function LogoMark({ className = "h-8 w-8", tile = true }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      {tile && <rect width="32" height="32" rx="9" className="fill-accent-400" />}
      <g
        className={tile ? "stroke-on-accent" : "stroke-accent-400"}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M10 8v5c0 3 6 2 6 5" pathLength="1" />
        <path d="M16 8v16" pathLength="1" />
        <path d="M22 8v5c0 3-6 2-6 5" pathLength="1" />
      </g>
    </svg>
  );
}

export default LogoMark;
