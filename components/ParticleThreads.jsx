"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient hero background: a slow constellation of points that link into
 * threads when close enough, three.js-network-effect in spirit but plain
 * Canvas 2D — no WebGL context, no model/shader/renderer to spin up, nothing
 * to download beyond this file.
 *
 * Load-time budget is the whole point: setup (particle generation, the
 * first frame) is pushed to `requestIdleCallback` so it never competes with
 * hydration or the hero's own entrance animation, the frame rate is capped
 * at ~30fps since a background this subtle doesn't need 120Hz, DPR is capped
 * at 1.5, and the loop pauses outright when the tab is hidden, the canvas
 * scrolls out of view, or `prefers-reduced-motion` is set (one static frame
 * instead).
 */

const MAX_LINK_DIST = 130;
const POINTER_LINK_DIST = 170;
const TARGET_FPS = 30;

function buildParticles(width, height, count) {
  const particles = [];
  for (let i = 0; i < count; i += 1) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.5) * 14,
      r: 1.2 + Math.random() * 1.4,
    });
  }
  return particles;
}

function step(particles, width, height, dt) {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < 0 || p.x > width) p.vx *= -1;
    if (p.y < 0 || p.y > height) p.vy *= -1;
    p.x = Math.min(Math.max(p.x, 0), width);
    p.y = Math.min(Math.max(p.y, 0), height);
  }
}

function draw(ctx, particles, width, height, pointer) {
  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < particles.length; i += 1) {
    const a = particles[i];
    for (let j = i + 1; j < particles.length; j += 1) {
      const b = particles[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= MAX_LINK_DIST) continue;
      const alpha = (1 - dist / MAX_LINK_DIST) * 0.5;
      ctx.strokeStyle = `rgba(255, 130, 80, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    if (pointer.active) {
      const dx = a.x - pointer.x;
      const dy = a.y - pointer.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < POINTER_LINK_DIST) {
        ctx.strokeStyle = `rgba(255, 176, 92, ${(1 - dist / POINTER_LINK_DIST) * 0.55})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();
      }
    }
  }

  ctx.fillStyle = "rgba(255, 165, 130, 0.85)";
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function onIdle(fn) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout: 400 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 120);
  return () => window.clearTimeout(id);
}

export default function ParticleThreads({ className = "" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let cancelIdle = null;
    let cleanupInner = () => {};

    cancelIdle = onIdle(() => {
      cleanupInner = setup(mount);
    });

    return () => {
      cancelIdle?.();
      cleanupInner();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    />
  );
}

function setup(mount) {
  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  mount.appendChild(canvas);
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return () => mount.removeChild(canvas);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 0;
  let height = 0;
  let particles = [];

  const layout = () => {
    width = mount.clientWidth;
    height = mount.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const isSmall = width < 768;
    particles = buildParticles(width, height, isSmall ? 24 : 46);
  };
  layout();

  const pointer = { x: 0, y: 0, active: false };
  const onPointerMove = (e) => {
    const rect = mount.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
  };
  const onPointerLeave = () => {
    pointer.active = false;
  };
  if (!reduceMotion) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerLeave, { passive: true });
  }

  let raf = 0;
  let visible = true;
  let onScreen = true;
  let last = performance.now();
  const frameBudget = 1000 / TARGET_FPS;

  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    if (!visible || !onScreen || !width || !height) return;
    const elapsed = now - last;
    if (elapsed < frameBudget) return;
    const dt = Math.min(elapsed, 100) / 1000;
    last = now;
    step(particles, width, height, dt);
    draw(ctx, particles, width, height, pointer);
  };

  if (reduceMotion) {
    draw(ctx, particles, width, height, pointer);
  } else {
    raf = requestAnimationFrame(tick);
  }

  const ro = new ResizeObserver(layout);
  ro.observe(mount);

  const onVisibility = () => {
    visible = document.visibilityState === "visible";
  };
  document.addEventListener("visibilitychange", onVisibility);

  const io = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
    },
    { threshold: 0 }
  );
  io.observe(mount);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerout", onPointerLeave);
    document.removeEventListener("visibilitychange", onVisibility);
    ro.disconnect();
    io.disconnect();
    if (canvas.parentNode === mount) mount.removeChild(canvas);
  };
}
