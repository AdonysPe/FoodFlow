// Shared motion primitives so every section animates on the same curve.
// One easing, one distance, one duration — that consistency is what makes
// the page feel authored rather than assembled.

export const EASE = [0.16, 1, 0.3, 1];

/**
 * Seconds the load curtain (IntroOverlay) holds before it lifts. Above-the-
 * fold entrances add it so they play *as* the curtain rises instead of
 * finishing behind it. Zero it for reduced motion — the curtain is gone by
 * then and there is nothing to wait for.
 */
export const INTRO_DELAY = 0.85;

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96, y: 18 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE },
  },
};

export const stagger = (staggerChildren = 0.09, delayChildren = 0) => ({
  hidden: {},
  show: {
    transition: { staggerChildren, delayChildren },
  },
});

export const viewportOnce = { once: true, amount: 0.25, margin: "0px 0px -80px 0px" };
