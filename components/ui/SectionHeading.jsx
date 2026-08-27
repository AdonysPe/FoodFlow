"use client";

import Reveal from "./Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className = "",
}) {
  const centered = align === "center";

  return (
    <div
      className={`flex flex-col ${centered ? "items-center text-center" : "items-start text-left"} ${className}`}
    >
      {eyebrow && (
        <Reveal>
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-cream/10 bg-cream/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-300">
            {eyebrow}
          </span>
        </Reveal>
      )}

      <Reveal delay={0.06}>
        <h2 className="font-display text-balance text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-gradient sm:text-4xl lg:text-[2.9rem]">
          {title}
        </h2>
      </Reveal>

      {description && (
        <Reveal delay={0.12}>
          <p
            className={`mt-5 text-pretty text-[15px] leading-relaxed text-cream/66 sm:text-base ${centered ? "mx-auto max-w-2xl" : "max-w-xl"}`}
          >
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
