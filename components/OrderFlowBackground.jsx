"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Minimal order rain for the home hero. Decorative SVG tickets fall straight
 * through the scene with a small lateral drift. There is no per-frame JS and
 * the animation pauses while the hero or browser tab is not visible.
 */

const DESKTOP_ORDERS = [
  { x: 55, drift: 24, duration: 12.8, delay: -4.1, tilt: -5, label: "M12", opacity: 0.5 },
  { x: 155, drift: -18, duration: 15.2, delay: -11.4, tilt: 3, label: "COCINA", kind: "kitchen", opacity: 0.42, scale: 0.88 },
  { x: 270, drift: -22, duration: 13.2, delay: -9.4, tilt: 4, label: "WEB", opacity: 0.54 },
  { x: 385, drift: 15, duration: 16.1, delay: -2.7, tilt: -3, label: "COCINA", kind: "kitchen", opacity: 0.38, scale: 0.78 },
  { x: 495, drift: 18, duration: 11.6, delay: -5.7, tilt: -3, label: "M07", opacity: 0.46 },
  { x: 605, drift: -20, duration: 14.8, delay: -12.1, tilt: 5, label: "COCINA", kind: "kitchen", opacity: 0.34, scale: 0.82 },
  { x: 720, drift: 22, duration: 14.1, delay: -1.3, tilt: -4, label: "WA", opacity: 0.4 },
  { x: 825, drift: -17, duration: 16.6, delay: -7.2, tilt: 3, label: "COCINA", kind: "kitchen", opacity: 0.36, scale: 0.74 },
  { x: 935, drift: 24, duration: 12.4, delay: -8.1, tilt: -4, label: "M03", opacity: 0.5 },
  { x: 1040, drift: -15, duration: 14.5, delay: -3.6, tilt: 4, label: "COCINA", kind: "kitchen", opacity: 0.4, scale: 0.86 },
  { x: 1150, drift: -18, duration: 10.2, delay: -4.6, tilt: 3, label: "WEB", opacity: 0.48 },
  { x: 1250, drift: 19, duration: 15.8, delay: -13.2, tilt: -4, label: "COCINA", kind: "kitchen", opacity: 0.34, scale: 0.76 },
  { x: 1340, drift: -20, duration: 13.7, delay: -10.2, tilt: -5, label: "M18", opacity: 0.48 },
  { x: 1410, drift: 14, duration: 17.1, delay: -6.4, tilt: 3, label: "COCINA", kind: "kitchen", opacity: 0.3, scale: 0.7 },
];

const MOBILE_ORDERS = [
  { x: 560, drift: 14, duration: 13.8, delay: -4.1, tilt: -4, label: "M04", opacity: 0.42, scale: 0.88 },
  { x: 615, drift: -12, duration: 16.2, delay: -11.3, tilt: 3, label: "COCINA", kind: "kitchen", opacity: 0.34, scale: 0.7 },
  { x: 680, drift: 13, duration: 14.7, delay: -7.2, tilt: -3, label: "WEB", opacity: 0.38, scale: 0.8 },
  { x: 750, drift: -12, duration: 17.1, delay: -2.7, tilt: 4, label: "COCINA", kind: "kitchen", opacity: 0.3, scale: 0.68 },
  { x: 815, drift: 12, duration: 13.9, delay: -9.2, tilt: -3, label: "WA", opacity: 0.38, scale: 0.82 },
  { x: 870, drift: -14, duration: 15.6, delay: -5.4, tilt: 3, label: "COCINA", kind: "kitchen", opacity: 0.32, scale: 0.72 },
];

function TicketShape({ order }) {
  if (order.kind === "kitchen") {
    return (
      <g transform={`scale(${order.scale ?? 1}) translate(-19 -38) rotate(${order.tilt} 19 38)`}>
        <path
          d="M4 0h30a4 4 0 0 1 4 4v66l-4-3-4 3-4-3-4 3-4-3-4 3-4-3-4 3V4a4 4 0 0 1 4-4Z"
          fill="var(--color-ink-800)"
          fillOpacity="0.88"
          stroke="#ffb08c"
          strokeOpacity="0.48"
        />
        <rect x="5" y="5" width="28" height="11" rx="4" fill="#ff5a33" fillOpacity="0.2" />
        <circle cx="10" cy="10.5" r="2" fill="#30d158" />
        <text x="15" y="13" fill="var(--color-cream)" fillOpacity="0.72" fontSize="5.5" fontWeight="700">
          KDS
        </text>
        <path
          d="M8 24h22M8 30h16M8 39h22M8 45h19M8 54h13"
          stroke="var(--color-cream)"
          strokeOpacity="0.28"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M27 55h4v4h-4Z" fill="#ff5a33" fillOpacity="0.34" />
      </g>
    );
  }

  return (
    <g transform={`scale(${order.scale ?? 1}) translate(-31 -24) rotate(${order.tilt} 31 24)`}>
      <rect
        width="62"
        height="48"
        rx="8"
        fill="var(--color-ink-800)"
        fillOpacity="0.9"
        stroke="#ff8a52"
        strokeOpacity="0.54"
      />
      <path d="M1 9a8 8 0 0 1 8-8h44a8 8 0 0 1 8 8v3H1Z" fill="#ff5a33" fillOpacity="0.18" />
      <circle cx="9" cy="7" r="2.4" fill="#30d158" />
      <text
        x="16"
        y="10"
        fill="var(--color-cream)"
        fillOpacity="0.82"
        fontSize="7.2"
        fontWeight="700"
        letterSpacing="0.5"
      >
        {order.label}
      </text>
      <path
        d="M8 21h28M8 28h42M8 35h23"
        stroke="var(--color-cream)"
        strokeOpacity="0.3"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="49" cy="39" r="4" fill="#ff5a33" fillOpacity="0.3" />
    </g>
  );
}

function FallingTicket({ order, animate }) {
  if (!animate) {
    return (
      <g transform={`translate(${order.x} 390)`} opacity={order.opacity * 0.65}>
        <TicketShape order={order} />
      </g>
    );
  }

  const path = `M${order.x} -70 C${order.x + order.drift} 210 ${order.x - order.drift} 590 ${order.x + order.drift * 0.35} 970`;

  return (
    <g opacity="0">
      <TicketShape order={order} />
      <animateMotion
        path={path}
        dur={`${order.duration}s`}
        begin={`${order.delay}s`}
        repeatCount="indefinite"
        rotate="0"
      />
      <animate
        attributeName="opacity"
        values={`0;${order.opacity};${order.opacity};0`}
        keyTimes="0;0.1;0.86;1"
        dur={`${order.duration}s`}
        begin={`${order.delay}s`}
        repeatCount="indefinite"
      />
    </g>
  );
}

function OrderRain({ orders, animate }) {
  return orders.map((order) => (
    <FallingTicket key={`${order.x}-${order.delay}`} order={order} animate={animate} />
  ));
}

export default function OrderFlowBackground({ className = "" }) {
  const svgRef = useRef(null);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fadeId = `order-rain-fade-${rawId}`;
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setAnimate(!media.matches);
    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !animate) return;

    let onScreen = true;
    const syncPlayback = () => {
      if (document.visibilityState === "visible" && onScreen) svg.unpauseAnimations?.();
      else svg.pauseAnimations?.();
    };
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      syncPlayback();
    });

    observer.observe(svg);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, [animate]);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.7" />
            <stop offset="42%" stopColor="white" stopOpacity="0.48" />
            <stop offset="82%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`${fadeId}-mask`}>
            <rect width="1440" height="900" fill={`url(#${fadeId})`} />
          </mask>
        </defs>

        <g mask={`url(#${fadeId}-mask)`}>
          <g className="hidden md:block">
            <OrderRain orders={DESKTOP_ORDERS} animate={animate} />
          </g>
          <g className="md:hidden">
            <OrderRain orders={MOBILE_ORDERS} animate={animate} />
          </g>
        </g>
      </svg>
    </div>
  );
}
