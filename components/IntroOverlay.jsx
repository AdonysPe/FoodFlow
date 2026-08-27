import { LogoMark } from "@/components/ui/Logo";

/**
 * Load curtain: the mark draws itself, then the panel lifts away.
 *
 * Server component on purpose — the animation is pure CSS (see the intro
 * block in globals.css), so it starts with the first paint rather than after
 * hydration, and it never depends on JS to get out of the way. It is
 * `pointer-events-none` throughout, so it can be clicked and scrolled through
 * while it plays, and `aria-hidden` keeps it out of the accessibility tree.
 */
export default function IntroOverlay() {
  return (
    <div
      aria-hidden="true"
      className="intro-curtain pointer-events-none fixed inset-0 z-[80] flex flex-col items-center justify-center gap-5 bg-ink-950"
    >
      <LogoMark className="intro-mark h-16 w-16" />
      <span className="intro-word font-display text-[17px] font-bold tracking-[-0.02em] text-white">
        FoodFlow
      </span>
      <span className="intro-bar block h-0.5 w-24 rounded-full bg-accent-400" />
    </div>
  );
}
