"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  CARTA_DAYS,
  CARTA_DAYS_SHORT,
  cartaPrice,
  isOpenAt,
  todayLabel,
  whatsappLink,
} from "@/lib/carta";
import OrderFlowDisclaimer from "@/components/public/OrderFlowDisclaimer";

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

  // Scroll-spy by measurement rather than IntersectionObserver: the observer
  // is silently unreliable inside some embedded webviews, and a menu whose
  // category pills stop tracking looks broken.
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
          // 140px clears the sticky header + the pill rail.
          if (node.getBoundingClientRect().top <= 140) current = section.id;
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

  const now = useMemo(() => new Date(), []);
  const open = isOpenAt(venue.hours, now);
  const wa = whatsappLink(
    venue.whatsapp,
    `Hola ${venue.name}, vi su carta y quisiera hacer un pedido.`
  );

  const jump = (id) => {
    const node = sectionRefs.current.get(id);
    if (!node) return;
    setActiveCat(id);
    const top = node.getBoundingClientRect().top + window.scrollY - 118;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-ink-950 pb-28">
      {/* ------------------------------------------------------ the venue */}
      <header className="border-b border-fg/[0.07] px-5 pb-5 pt-7">
        <div className="mx-auto flex max-w-2xl items-start gap-4">
          {venue.logoUrl && (
            <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-fg/[0.1] bg-fg/[0.04]">
              <Image
                src={venue.logoUrl}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                priority
              />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-fg">
              {venue.name}
            </h1>
            {venue.tagline && (
              <p className="mt-0.5 text-[13.5px] leading-snug text-fg/50">{venue.tagline}</p>
            )}

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
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
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-2xl">
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
      </header>

      {/* --------------------------------------------------- the category rail */}
      {sections.length > 1 && (
        <nav
          aria-label="Categorías"
          className="sticky top-0 z-30 border-b border-fg/[0.07] bg-ink-950/90 backdrop-blur-xl"
        >
          <ul className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => jump(section.id)}
                  aria-current={activeCat === section.id ? "true" : undefined}
                  className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                    activeCat === section.id
                      ? "border-accent-400/55 bg-accent-400/15 text-accent-label"
                      : "border-fg/[0.1] bg-fg/[0.03] text-fg/55"
                  }`}
                >
                  {section.name}
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

        {sections.map((section) => (
          <section
            key={section.id}
            ref={(node) => {
              if (node) sectionRefs.current.set(section.id, node);
              else sectionRefs.current.delete(section.id);
            }}
            className="scroll-mt-32 pt-7"
          >
            <h2 className="font-display text-[17px] font-bold tracking-[-0.01em] text-fg">
              {section.name}
            </h2>
            <ul className="mt-3 flex flex-col">
              {section.items.map((item) => (
                <CartaItem key={item.id} item={item} onZoom={setZoom} />
              ))}
            </ul>
          </section>
        ))}

        <div className="pt-10">
          <OrderFlowDisclaimer />
        </div>
        <p className="pb-6 pt-5 text-center text-[11.5px] text-fg/25">
          Carta en línea de {venue.name} · hecha con FoodFlow
        </p>
      </main>

      {/* -------------------------------------------------------- the extras */}
      <LiveBadge status={status} flash={flash} />

      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="fixed inset-x-5 bottom-5 z-40 mx-auto flex h-13 max-w-sm items-center justify-center gap-2 rounded-2xl bg-linear-to-b from-accent-400 to-accent-600 px-5 py-3.5 text-[15px] font-bold text-on-accent shadow-lift active:scale-[0.98]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden>
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
          </svg>
          Pedir por WhatsApp
        </a>
      )}

      {zoom && <PhotoZoom item={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

/* --------------------------------------------------------------- one dish */

function CartaItem({ item, onZoom }) {
  const sold = !item.available;

  return (
    <li
      className={`flex gap-3.5 border-b border-fg/[0.06] py-3.5 last:border-b-0 ${
        sold ? "opacity-55" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="text-[15px] font-semibold leading-snug text-fg">{item.name}</h3>
          {sold && (
            <span className="mt-0.5 shrink-0 rounded-md border border-fg/15 bg-fg/[0.06] px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-fg/55">
              Agotado
            </span>
          )}
        </div>
        {item.description && (
          <p className="mt-1 text-[13px] leading-relaxed text-fg/45">{item.description}</p>
        )}
        <p
          className={`mt-1.5 text-[14.5px] font-bold tabular-nums ${
            sold ? "text-fg/40" : "text-accent-ink"
          }`}
        >
          {cartaPrice(item.price)}
        </p>
      </div>

      {item.photoUrl && (
        <button
          type="button"
          onClick={() => onZoom(item)}
          aria-label={`Ver foto de ${item.name}`}
          className="relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-xl border border-fg/[0.08] bg-fg/[0.04] active:scale-[0.97]"
        >
          <Image
            src={item.photoUrl}
            alt={item.name}
            fill
            // Fixed-size thumbnail, so one width is all the browser ever needs.
            sizes="86px"
            className={`object-cover ${sold ? "grayscale" : ""}`}
            loading="lazy"
          />
        </button>
      )}
    </li>
  );
}

function PhotoZoom({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.name}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-5 backdrop-blur-sm"
    >
      <figure className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
      </figure>
    </div>
  );
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
