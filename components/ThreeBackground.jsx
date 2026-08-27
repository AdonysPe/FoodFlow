"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Ambient particle field.
 *
 * Deliberately restrained: a slow-drifting cloud of additive points that
 * parallaxes toward the cursor. Rendering is paused when the tab is hidden
 * or the canvas scrolls out of view, DPR is capped at 2, and users with
 * `prefers-reduced-motion` get a single static frame instead of a loop.
 */

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  attribute float aScale;
  attribute float aSeed;

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec3 p = position;
    float t = uTime * 0.14;
    float s = aSeed * 6.2831;

    // gentle organic drift, each particle on its own phase
    p.x += sin(t + s) * 0.42;
    p.y += cos(t * 0.86 + s * 1.31) * 0.42;
    p.z += sin(t * 0.63 + s * 2.17) * 0.42;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * aScale * (9.0 / max(-mv.z, 0.001));

    // fade with depth so the field dissolves into the background
    float depth = clamp((-mv.z - 2.0) / 16.0, 0.0, 1.0);
    vAlpha = smoothstep(1.0, 0.05, depth);
    vColor = mix(uColorA, uColorB, smoothstep(0.0, 1.0, aSeed));
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    float mask = smoothstep(0.5, 0.06, d);
    if (mask < 0.01) discard;
    gl_FragColor = vec4(vColor, mask * vAlpha * 0.75);
  }
`;

export default function ThreeBackground({ className = "", density = 1 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Bail out gracefully if WebGL is unavailable — the CSS gradients below
    // are designed to stand on their own.
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 100);
    camera.position.z = 9;

    const group = new THREE.Group();
    scene.add(group);

    // ---------------------------------------------------------------- points
    const isSmall = width < 768;
    const count = Math.round((isSmall ? 1100 : 2600) * density);

    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const seeds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      // Distribute inside a flattened sphere so the cloud reads as a band
      // rather than a ball, then push some particles to the rim.
      const r = 5 + Math.pow(Math.random(), 0.6) * 7;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) * 1.35;
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.62;
      positions[i * 3 + 2] = r * Math.cos(phi) * 0.9;

      scales[i] = 0.35 + Math.random() * 1.4;
      seeds[i] = Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: isSmall ? 2.6 : 3.4 },
        uColorA: { value: new THREE.Color("#ff5a33") },
        uColorB: { value: new THREE.Color("#ffb35c") },
      },
    });

    const points = new THREE.Points(geometry, material);
    group.add(points);

    // ------------------------------------------------------------- interaction
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    const onPointerMove = (e) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!reduceMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    // ------------------------------------------------------------------ loop
    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;
    let onScreen = true;

    const renderFrame = () => {
      const elapsed = clock.getElapsedTime();
      material.uniforms.uTime.value = elapsed;

      pointer.x += (target.x - pointer.x) * 0.035;
      pointer.y += (target.y - pointer.y) * 0.035;

      group.rotation.y = elapsed * 0.035 + pointer.x * 0.28;
      group.rotation.x = Math.sin(elapsed * 0.12) * 0.05 - pointer.y * 0.18;

      renderer.render(scene, camera);
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible || !onScreen) return;
      renderFrame();
    };

    if (reduceMotion) {
      renderer.render(scene, camera);
    } else {
      tick();
    }

    // ---------------------------------------------------------------- resize
    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      if (visible) clock.getDelta();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    io.observe(mount);

    // --------------------------------------------------------------- cleanup
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      io.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [density]);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
