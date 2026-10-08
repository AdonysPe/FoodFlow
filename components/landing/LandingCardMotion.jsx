"use client";

import { useEffect } from "react";

const TARGETS = ".lb-story-card, .lb-mod-big, .lb-mod-small, .lb-pilot-card, .lb-plan, .lb-stepper";

/** Start each illustration when it is read, and preserve its place offscreen. */
export default function LandingCardMotion() {
  useEffect(() => {
    const cards = [...document.querySelectorAll(`.lb #main :is(${TARGETS})`)];
    const visible = new Set();

    const update = (card) => {
      const active = visible.has(card) && !document.hidden;
      card.dataset.lbActive = String(active);
      if (active) card.dataset.lbSeen = "true";
    };

    // Content stays visible, including when IntersectionObserver is unavailable.
    if (!("IntersectionObserver" in window)) {
      cards.forEach((card) => { card.dataset.lbActive = "true"; });
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting, intersectionRatio }) => {
        if (isIntersecting && intersectionRatio >= 0.12) visible.add(target);
        else visible.delete(target);
        update(target);
      });
    }, { threshold: [0, 0.12], rootMargin: "-64px 0px -6% 0px" });

    cards.forEach((card) => observer.observe(card));
    const onVisibilityChange = () => cards.forEach(update);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cards.forEach((card) => {
        delete card.dataset.lbActive;
        delete card.dataset.lbSeen;
      });
    };
  }, []);

  return null;
}
