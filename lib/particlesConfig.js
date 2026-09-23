// Tuning for components/ParticleThreads.jsx. Distances are CSS px, speeds
// px per second. The accent is --color-accent-400, the same pigment in both
// themes, so the field reads on warm black and on paper alike.

export const PARTICLE_RGB = "255, 90, 51";

export const particlesConfig = {
  count: { desktop: 36, mobile: 22 },
  mobileBreakpoint: 768,
  particle: {
    radius: { min: 0.5, max: 1.5 },
    opacity: 0.3,
    speed: { min: 18, max: 30 },
  },
  links: {
    distance: 170,
    opacity: 0.14,
    width: 1,
  },
  grab: {
    distance: 180,
    opacity: 0.3,
  },
  fps: 30,
  maxDpr: 1.5,
};
