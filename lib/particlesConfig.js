// Tuning for components/ParticleThreads.jsx. Distances are CSS px, speeds
// px per second. Two brand stops — accent-400 (bermellón) and a warm amber —
// so the field isn't a flat single-color, but the same two pigments the rest
// of the site already mixes (Pricing, the old hero glow), on both themes.

export const GRADIENT_FROM_RGB = [255, 90, 51]; // --color-accent-400
export const GRADIENT_TO_RGB = [255, 179, 92]; // warm amber

export const particlesConfig = {
  count: { desktop: 58, mobile: 30 },
  mobileBreakpoint: 768,
  particle: {
    radius: { min: 1.1, max: 2.8 },
    opacity: 0.85,
    // The dot is drawn twice: a bright core, and this larger, faint halo
    // behind it — a cheap two-fill glow instead of ctx.shadowBlur, which
    // repaints its blur every frame and is far more expensive.
    haloScale: 3.2,
    haloOpacity: 0.22,
    speed: { min: 16, max: 28 },
  },
  links: {
    distance: 190,
    opacity: 0.32,
    width: 1.1,
  },
  grab: {
    distance: 210,
    opacity: 0.55,
    width: 1.4,
  },
  fps: 30,
  maxDpr: 1.5,
};
