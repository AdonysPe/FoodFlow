"use client";

import { useEffect, useRef } from "react";
import { PARTICLE_RGB, particlesConfig as cfg } from "@/lib/particlesConfig";

/**
 * Ambient hero background: a slow constellation of points that link into
 * threads when close, and reach for the cursor (tsparticles' "grab" mode) —
 * plain Canvas 2D, no particle library to download.
 *
 * Load-time budget is the whole point: setup (particle generation, the
 * first frame) is pushed to `requestIdleCallback` so it never competes with
 * hydration or the hero's own entrance animation, the frame rate is capped
 * (a background this subtle doesn't need 120Hz), DPR is capped, and the loop
 * pauses outright when the tab is hidden, the canvas scrolls out of view, or
 * `prefers-reduced-motion` is set (one static frame instead).
 *
 * Numbers live in lib/particlesConfig.js.
 */

function between({ min, max }) {
  return min + Math.random() * (max - min);
}

function buildParticles(width, height, count) {
  const particles = [];
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = between(cfg.particle.speed);
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: between(cfg.particle.radius),
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

function line(ctx, ax, ay, bx, by, alpha) {
  ctx.strokeStyle = `rgba(${PARTICLE_RGB}, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
}

function draw(ctx, particles, width, height, pointer) {
  const { links, grab } = cfg;
  ctx.clearRect(0, 0, width, height);
  ctx.lineWidth = links.width;

  for (let i = 0; i < particles.length; i += 1) {
    const a = particles[i];
    for (let j = i + 1; j < particles.length; j += 1) {
      const b = particles[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < links.distance) {
        line(ctx, a.x, a.y, b.x, b.y, (1 - dist / links.distance) * links.opacity);
      }
    }

    if (pointer.active) {
      const dist = Math.hypot(a.x - pointer.x, a.y - pointer.y);
      if (dist < grab.distance) {
        line(ctx, a.x, a.y, pointer.x, pointer.y, (1 - dist / grab.distance) * grab.opacity);
      }
    }
  }

  ctx.fillStyle = `rgba(${PARTICLE_RGB}, ${cfg.particle.opacity})`;
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

    let cleanupInner = () => {};
    const cancelIdle = onIdle(() => {
      cleanupInner = setup(mount);
    });

    return () => {
      cancelIdle();
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
  const pointer = { x: 0, y: 0, active: false };

  const layout = () => {
    width = mount.clientWidth;
    height = mount.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const small = width < cfg.mobileBreakpoint;
    particles = buildParticles(width, height, small ? cfg.count.mobile : cfg.count.desktop);
    // Resizing the canvas wipes it; the animated loop repaints on its next
    // frame, the static one has to be told.
    if (reduceMotion) draw(ctx, particles, width, height, pointer);
  };
  layout();

  const onPointerMove = (e) => {
    const rect = mount.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
    pointer.active = pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
  };
  const release = () => {
    pointer.active = false;
  };
  // A finger lifting leaves no hover behind, so it shouldn't leave threads.
  const onPointerUp = (e) => {
    if (e.pointerType !== "mouse") release();
  };
  const root = document.documentElement;
  if (!reduceMotion) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    root.addEventListener("pointerleave", release, { passive: true });
  }

  let raf = 0;
  let visible = document.visibilityState === "visible";
  let onScreen = true;
  let last = performance.now();
  const frameBudget = 1000 / cfg.fps;

  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    if (!visible || !onScreen || !width || !height) return;
    const elapsed = now - last;
    if (elapsed < frameBudget) return;
    last = now;
    step(particles, width, height, Math.min(elapsed, 100) / 1000);
    draw(ctx, particles, width, height, pointer);
  };

  if (!reduceMotion) raf = requestAnimationFrame(tick);

  const ro = new ResizeObserver(layout);
  ro.observe(mount);

  const onVisibility = () => {
    visible = document.visibilityState === "visible";
    // Don't let the time spent hidden arrive as one giant step.
    if (visible) last = performance.now();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
  });
  io.observe(mount);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", release);
    root.removeEventListener("pointerleave", release);
    document.removeEventListener("visibilitychange", onVisibility);
    ro.disconnect();
    io.disconnect();
    if (canvas.parentNode === mount) mount.removeChild(canvas);
  };
}
