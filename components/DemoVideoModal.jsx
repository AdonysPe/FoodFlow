"use client";

import { useEffect, useId, useRef } from "react";
import { IconX } from "@/components/ui/Icons";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function DemoVideoModal({ onClose }) {
  const { t } = useLanguage();
  const copy = t.hero.demoVideo;
  const titleId = useId();
  const dialogRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const video = videoRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    void video.play().catch(() => {
      // Native controls remain available if the browser blocks autoplay.
    });

    return () => {
      video.pause();
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  function closeOnBackdrop(event) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (
      event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom
    ) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-theme="dark"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={closeOnBackdrop}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-24px)] max-w-none overflow-hidden rounded-2xl border border-cream/15 bg-ink-950 p-0 text-cream shadow-panel backdrop:bg-black/75 backdrop:backdrop-blur-sm"
      style={{ width: "min(640px, calc(100vw - 24px), calc(100dvh - 136px))" }}
    >
      <header className="flex h-16 items-center justify-between gap-3 px-4">
        <h2 id={titleId} className="font-display text-lg font-semibold">{copy.title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-cream/70 transition-colors hover:bg-cream/10 hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400"
        >
          <IconX className="h-5 w-5" />
        </button>
      </header>
      <video
        ref={videoRef}
        src="/videos/foodflow-demo.mp4"
        poster="/videos/foodflow-demo-poster.png"
        aria-label={copy.title}
        width={1080}
        height={1080}
        autoPlay
        muted
        controls
        playsInline
        preload="metadata"
        className="block aspect-square w-full bg-black"
      >
        {copy.fallback} <a href="/videos/foodflow-demo.mp4">{copy.openVideo}</a>
      </video>
      <footer className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-xs">
        <span className="text-cream/55">{copy.duration}</span>
        <a href="#product" onClick={onClose} className="rounded text-accent-300 hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-400">
          {copy.explore} <span aria-hidden>→</span>
        </a>
      </footer>
    </dialog>
  );
}
