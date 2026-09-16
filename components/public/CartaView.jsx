"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CARTA_DAYS,
  CARTA_DAYS_SHORT,
  cartaPrice,
  isOpenAt,
  todayLabel,
} from "@/lib/carta";
import { EASE, viewportOnce } from "@/lib/motion";

const POLL_MS = 30_000;
const cacheKey = (slug) => `foodflow:carta:${slug}`;

/* ------------------------------------------------------------------ cache */

function readCache(slug) {
  try {
    const raw = window.localStorage.getItem(cacheKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.version === "number" ? parsed : null;
  } catch {
    // Private mode, blocked site data, corrupt entry — all mean "no cache".
    return null;
  }
}

function writeCache(slug, payload) {
  try {
    window.localStorage.setItem(cacheKey(slug), JSON.stringify(payload));
  } catch {
    /* a full or blocked store is not worth a broken menu */
  }
}

/* ------------------------------------------------------------ live updates */

/**
 * Keeps `payload` current.
 *
 * SSE is the fast path. Everything else — a proxy that strips event streams, a
 * captive portal, a browser without EventSource — falls back to asking the
 * JSON endpoint every 30 seconds whether the version moved, which answers 204
 * and no body when it has not.
 */
function useLiveCarta(slug, initial) {
  const [payload, setPayload] = useState(initial);
  // "live" once the stream is open, "polling" on the fallback, "offline" when
  // neither is getting through.
  const [status, setStatus] = useState("connecting");
  const [flash, setFlash] = useState(false);
  const versionRef = useRef(initial.version);

  const apply = useCallback(
    (next, { announce }) => {
      if (next.version === versionRef.current) return;
      versionRef.current = next.version;
      setPayload(next);
      writeCache(slug, next);
      if (announce) {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 2200);
      }
    },
    [slug]
  );

  // Anything newer sitting in localStorage wins over what the server rendered:
  // a page restored from the back/forward cache can be minutes stale.
  useEffect(() => {
    const cached = readCache(slug);
    if (cached && cached.version > versionRef.current) apply(cached, { announce: false });
    else writeCache(slug, initial);
    // Runs once per slug; `initial` is the server render for that same slug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    let source = null;
    let poll = null;

    const startPolling = () => {
      if (poll || cancelled) return;
      const ask = async () => {
        try {
          const res = await fetch(`/api/carta/${slug}?v=${versionRef.current}`, {
            cache: "no-store",
          });
          if (cancelled) return;
          if (res.status === 204) {
            setStatus((s) => (s === "offline" ? "polling" : s));
            return;
          }
          if (!res.ok) return;
          apply(await res.json(), { announce: true });
          setStatus("polling");
        } catch {
          if (!cancelled) setStatus("offline");
        }
      };
      poll = window.setInterval(ask, POLL_MS);
      void ask();
    };

    const stopPolling = () => {
      if (poll) window.clearInterval(poll);
      poll = null;
    };

    if (typeof window.EventSource === "function") {
      source = new EventSource(`/api/carta/${slug}/stream?v=${versionRef.current}`);

      source.addEventListener("ready", () => {
        if (cancelled) return;
        setStatus("live");
        stopPolling();
      });

      source.addEventListener("carta", (event) => {
        if (cancelled) return;
        setStatus("live");
        stopPolling();
        try {
          apply(JSON.parse(event.data), { announce: true });
        } catch {
          /* a truncated frame is dropped; the next one carries the same state */
        }
      });

      // The venue unpublished its carta while someone was reading it.
      source.addEventListener("gone", () => {
        if (!cancelled) window.location.reload();
      });

      source.onerror = () => {
        if (cancelled) return;
        // EventSource reconnects by itself; polling covers the gap and stops
        // again the moment the stream comes back.
        setStatus((s) => (s === "live" ? "polling" : s));
        startPolling();
      };
    } else {
      startPolling();
    }

    return () => {
      cancelled = true;
      stopPolling();
      source?.close();
    };
  }, [slug, apply]);

  return { payload, status, flash };
}

/* -------------------------------------------------------------------- view */

export default function CartaView({ initial }) {
  const { payload, status, flash } = useLiveCarta(initial.venue.slug, initial);
  const { venue, categories, items } = payload;
  const reducedMotion = useReducedMotion();

  const [activeCat, setActiveCat] = useState(null);
  const [zoom, setZoom] = useState(null);
  const sectionRefs = useRef(new Map());

  // Only categories that actually have something in them, plus a bucket for
  // dishes an owner never filed.
  const sections = useMemo(() => {
    const byCat = new Map();
    for (const item of items) {
      const key = item.categoryId ?? "__sin__";
      if (!byCat.has(key)) byCat.set(key, []);
      byCat.get(key).push(item);
    }
    const ordered = categories
      .filter((c) => byCat.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, items: byCat.get(c.id) }));
    if (byCat.has("__sin__")) {
      ordered.push({ id: "__sin__", name: "Otros", items: byCat.get("__sin__") });
    }
    return ordered;
  }, [categories, items]);

  useEffect(() => {
    if (!activeCat && sections.length > 0) setActiveCat(sections[0].id);
  }, [sections, activeCat]);

  // Every category sits on the one page now — the bar is an index you jump
  // from, not a filter — so it tracks scroll position rather than clicks
  // alone. Measurement rather than IntersectionObserver: the observer is
  // silently unreliable inside some embedded webviews, and a menu whose
  // index stops tracking looks broken.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        let current = null;
        for (const section of sections) {
          const node = sectionRefs.current.get(section.id);
          if (!node) continue;
          // 150px clears the sticky header + the category bar.
          if (node.getBoundingClientRect().top <= 150) current = section.id;
        }
        if (current) setActiveCat(current);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [sections]);

  // `html` carries `overflow-x: clip` sitewide (it keeps the hero's marquee
  // and other full-bleed decoration from opening a horizontal scrollbar),
  // but Chromium won't let a document-scrolled `position: sticky` element
  // stick while the root has any non-visible overflow-x — clip included.
  // Every other sticky bar in the app lives inside the dashboard's own
  // scroll container and never hits this; the carta is the first page that
  // scrolls the plain document, so it's neutralized here only, for as long
  // as this page is mounted.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflowX;
    root.style.overflowX = "visible";
    return () => {
      root.style.overflowX = previous;
    };
  }, []);

  const now = useMemo(() => new Date(), []);
  const open = isOpenAt(venue.hours, now);

  const jump = (id) => {
    const node = sectionRefs.current.get(id);
    if (!node) return;
    setActiveCat(id);
    const top = node.getBoundingClientRect().top + window.scrollY - 128;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-ink-950 pb-14">
      {/* Ambient backdrop: two quiet glows plus the same fine grain the floor
          plan uses, fixed behind everything so the page reads as sitting on
          a material instead of flat white-on-black web background. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(44rem 32rem at 8% -10%, rgba(255,90,51,0.16), transparent 58%), radial-gradient(38rem 30rem at 98% 20%, rgba(255,90,51,0.09), transparent 60%), radial-gradient(34rem 26rem at 15% 92%, rgba(255,90,51,0.06), transparent 62%), radial-gradient(var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "auto, auto, auto, 24px 24px",
        }}
      />

      {/* ------------------------------------------------------ the venue */}
      <header className="pb-6">
        <div className="relative isolate h-28 overflow-hidden sm:h-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,90,51,0.2),transparent_45%),linear-gradient(145deg,#221411_0%,#130f0d_55%,#0c0908_100%)]" />
          {venue.logoUrl && (
            <Image
              src={venue.logoUrl}
              alt=""
              fill
              sizes="100vw"
              className="scale-110 object-cover opacity-25 blur-xl"
              priority
              aria-hidden
            />
          )}
          <div className="absolute inset-0 bg-linear-to-b from-ink-950/10 via-ink-950/45 to-ink-950" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-accent-400/25 to-transparent" />
        </div>

        <div className="relative mx-auto -mt-8 max-w-2xl px-5">
          <div className="flex items-end gap-4">
            <span className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-fg/15 bg-ink-800 font-display text-xl font-bold text-accent-label shadow-lift">
              {venue.logoUrl ? (
                <Image
                  src={venue.logoUrl}
                  alt=""
                  fill
                  sizes="72px"
                  className="object-cover"
                  priority
                />
              ) : (
                <span aria-hidden>{initialsFor(venue.name)}</span>
              )}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="font-display text-[27px] font-bold leading-tight tracking-[-0.02em] text-fg sm:text-[30px]">
                {venue.name}
              </h1>
            </div>
          </div>

          {venue.tagline && (
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-fg/55">{venue.tagline}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${
                open
                  ? "border-mint/35 bg-mint/10 text-mint-ink"
                  : "border-fg/15 bg-fg/[0.05] text-fg/50"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${open ? "bg-mint" : "bg-fg/35"}`}
                aria-hidden
              />
              {open ? "Abierto ahora" : "Cerrado"}
            </span>
            <span className="text-[12.5px] text-fg/45">{todayLabel(venue.hours, now)}</span>
          </div>

          <div className="mt-4">
            <HoursTable hours={venue.hours} today={now.getDay()} />
            {venue.address && (
              <p className="mt-3 text-[12.5px] text-fg/45">
                {venue.mapsUrl ? (
                  <a
                    href={venue.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-fg/20 underline-offset-2 hover:text-fg/70"
                  >
                    {venue.address}
                  </a>
                ) : (
                  venue.address
                )}
              </p>
            )}
          </div>

          <div aria-hidden className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-linear-to-r from-transparent to-fg/15" />
            <span className="h-[5px] w-[5px] rotate-45 bg-accent-400/70" />
            <span className="h-px flex-1 bg-linear-to-l from-transparent to-fg/15" />
          </div>
        </div>
      </header>

      {/* --------------------------------------------------- the category bar */}
      {sections.length > 1 && (
        <nav
          aria-label="Categorías"
          className="sticky top-0 z-30 border-b border-fg/[0.07] bg-ink-950/90 backdrop-blur-xl"
        >
          {/* Three across on a phone, all five on anything wider — every
              category stays on screen, none of them scroll out of reach. */}
          <ul className="mx-auto grid max-w-2xl grid-cols-3 gap-1.5 px-4 py-3 sm:grid-cols-5">
            {sections.map((section) => (
              <li key={section.id} className="contents">
                <button
                  type="button"
                  onClick={() => jump(section.id)}
                  aria-current={activeCat === section.id ? "true" : undefined}
                  className={`relative isolate overflow-hidden rounded-lg px-1.5 py-2 text-center text-[11px] font-bold uppercase tracking-[0.05em] transition-colors duration-200 ${
                    activeCat === section.id ? "text-accent-label" : "text-fg/50 hover:text-fg/75"
                  }`}
                >
                  {activeCat === section.id && (
                    <motion.span
                      layoutId="public-carta-category"
                      transition={
                        reducedMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 480, damping: 36, mass: 0.55 }
                      }
                      className="absolute inset-0 -z-10 rounded-lg bg-accent-400/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    />
                  )}
                  <span className="relative">{section.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* ---------------------------------------------------------- the menu */}
      <main className="mx-auto max-w-2xl px-5">
        {sections.length === 0 && (
          <p className="py-20 text-center text-[14px] text-fg/40">
            Esta carta todavía no tiene platos publicados.
          </p>
        )}

        {sections.map((section, sectionIndex) => (
          <section
            key={section.id}
            ref={(node) => {
              if (node) sectionRefs.current.set(section.id, node);
              else sectionRefs.current.delete(section.id);
            }}
            className="scroll-mt-36 pt-9"
          >
            <div className="flex items-center gap-3">
              <h2 className="shrink-0 font-display text-[13px] font-bold uppercase tracking-[0.13em] text-accent-label">
                {section.name}
              </h2>
              <span aria-hidden className="h-px flex-1 bg-fg/[0.09]" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
              {section.items.map((item, itemIndex) => (
                <CartaCard
                  key={item.id}
                  item={item}
                  onZoom={setZoom}
                  reducedMotion={reducedMotion}
                  priority={sectionIndex === 0 && itemIndex < 3}
                />
              ))}
            </div>
          </section>
        ))}

        <p className="pb-6 pt-12 text-center text-[11.5px] text-fg/25">
          Carta en línea de {venue.name} · hecha con FoodFlow
        </p>
      </main>

      {/* -------------------------------------------------------- the extras */}
      <LiveBadge status={status} flash={flash} />

      <AnimatePresence>
        {zoom && (
          <PhotoZoom
            item={zoom}
            onClose={() => setZoom(null)}
            reducedMotion={reducedMotion}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------------------- one dish */

function CartaCard({ item, onZoom, reducedMotion, priority }) {
  const sold = !item.available;
  const zoomable = Boolean(item.photoUrl);

  return (
    <motion.button
      type="button"
      onClick={() => zoomable && onZoom(item)}
      aria-label={zoomable ? `Ver foto de ${item.name}` : undefined}
      initial={reducedMotion ? false : { opacity: sold ? 0.35 : 0, y: 10 }}
      whileInView={reducedMotion ? undefined : { opacity: sold ? 0.55 : 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.36, ease: EASE }}
      className={`flex flex-col text-left transition-transform ${zoomable ? "active:scale-[0.98]" : ""} ${
        sold ? "opacity-55" : ""
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-fg/10 bg-fg/[0.04]">
        {item.photoUrl ? (
          <Image
            src={item.photoUrl}
            alt={item.name}
            fill
            sizes="(min-width: 640px) 200px, 45vw"
            className={`object-cover ${sold ? "grayscale" : ""}`}
            priority={priority}
            loading={priority ? undefined : "lazy"}
          />
        ) : (
          <div
            aria-hidden
            className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_28%_18%,rgba(255,162,133,0.16),transparent_38%),linear-gradient(145deg,rgba(255,90,51,0.1),rgba(255,255,255,0.02))]"
          >
            <span className="font-display text-lg font-bold tracking-[-0.02em] text-accent-label/70">
              {initialsFor(item.name)}
            </span>
          </div>
        )}
        {sold && (
          <span className="absolute left-2 top-2 rounded-md bg-ink-950/85 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-fg/70 backdrop-blur-sm">
            Agotado
          </span>
        )}
      </div>

      <h3 className="mt-2.5 text-[13.5px] font-semibold leading-snug text-fg">{item.name}</h3>
      {item.description && (
        <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-fg/45">
          {item.description}
        </p>
      )}
      <p
        className={`mt-1.5 text-[13px] font-bold tabular-nums ${
          sold ? "text-fg/35" : "text-accent-label"
        }`}
      >
        {cartaPrice(item.price)}
      </p>
    </motion.button>
  );
}

function PhotoZoom({ item, onClose, reducedMotion }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm"
    >
      <motion.figure
        initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.26, ease: EASE }}
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
          <Image src={item.photoUrl} alt={item.name} fill sizes="100vw" className="object-cover" />
        </div>
        <figcaption className="mt-3 text-center">
          <p className="text-[15px] font-semibold text-white">{item.name}</p>
          <p className="mt-0.5 text-[14px] font-bold text-white/70">{cartaPrice(item.price)}</p>
        </figcaption>
        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-4 block rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-medium text-white"
        >
          Cerrar
        </button>
      </motion.figure>
    </motion.div>
  );
}

function initialsFor(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toLocaleUpperCase("es-PE");
}

/* ------------------------------------------------------------- the extras */

function HoursTable({ hours, today }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-[12.5px] font-medium text-fg/40 underline decoration-fg/15 underline-offset-2 hover:text-fg/65"
      >
        {open ? "Ocultar horario" : "Ver horario completo"}
      </button>
      {open && (
        <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12.5px]">
          {hours.map((h) => (
            <div key={h.day} className="contents">
              <dt className={h.day === today ? "font-semibold text-fg/80" : "text-fg/40"}>
                <span className="sm:hidden">{CARTA_DAYS_SHORT[h.day]}</span>
                <span className="hidden sm:inline">{CARTA_DAYS[h.day]}</span>
              </dt>
              <dd
                className={`tabular-nums ${h.day === today ? "font-medium text-fg/70" : "text-fg/35"}`}
              >
                {h.closed ? "Cerrado" : `${h.open} – ${h.close}`}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/**
 * A quiet corner light: green while the stream is open, amber on the polling
 * fallback, grey when nothing is getting through. It shouts once — briefly —
 * when the menu actually changes under the diner's eyes, because a price that
 * silently rewrites itself reads as a glitch.
 */
function LiveBadge({ status, flash }) {
  if (flash) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-5">
        <span className="rounded-full border border-mint/35 bg-mint/15 px-3.5 py-1.5 text-[12.5px] font-semibold text-mint-ink backdrop-blur-xl">
          Carta actualizada
        </span>
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-5">
        <span className="rounded-full border border-fg/15 bg-ink-900/90 px-3.5 py-1.5 text-[12px] font-medium text-fg/50 backdrop-blur-xl">
          Sin conexión · mostrando la última carta guardada
        </span>
      </div>
    );
  }

  return null;
}
