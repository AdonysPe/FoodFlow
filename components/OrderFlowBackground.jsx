"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Minimal order rain for the home hero. Decorative SVG tickets fall straight
 * through the scene with a small lateral drift. There is no per-frame JS and
 * the animation pauses while the hero or browser tab is not visible.
 */

const DESKTOP_ORDERS = [
  { x: 90, drift: 28, duration: 10.8, delay: -2.1, tilt: -5, label: "M12" },
  { x: 250, drift: -22, duration: 13.2, delay: -9.4, tilt: 4, label: "WEB" },
  { x: 420, drift: 18, duration: 11.6, delay: -5.7, tilt: -3, label: "M07" },
  { x: 585, drift: -26, duration: 14.1, delay: -1.3, tilt: 5, label: "WA" },
  { x: 755, drift: 24, duration: 12.4, delay: -8.1, tilt: -4, label: "M03" },
  { x: 920, drift: -18, duration: 10.2, delay: -4.6, tilt: 3, label: "WEB" },
  { x: 1085, drift: 26, duration: 13.7, delay: -11.2, tilt: -5, label: "M18" },
  { x: 1250, drift: -24, duration: 11.1, delay: -6.8, tilt: 4, label: "WA" },
  { x: 1380, drift: 16, duration: 14.6, delay: -3.5, tilt: -2, label: "M09" },
];

const MOBILE_ORDERS = [
  { x: 575, drift: 18, duration: 11.8, delay: -3.1, tilt: -4, label: "M04" },
  { x: 665, drift: -16, duration: 14.2, delay: -10.3, tilt: 3, label: "WEB" },
  { x: 775, drift: 15, duration: 12.7, delay: -6.2, tilt: -3, label: "WA" },
  { x: 865, drift: -18, duration: 10.9, delay: -1.7, tilt: 4, label: "M11" },
];

function TicketShape({ order }) {
  return (
    <g transform={`translate(-31 -24) rotate(${order.tilt} 31 24)`}>
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
      <g transform={`translate(${order.x} 390)`} opacity="0.28">
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
        values="0;0.58;0.58;0"
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
