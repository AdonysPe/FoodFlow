"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { cartaPrice } from "@/lib/carta";
import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";
import styles from "./PhysicalCartaView.module.css";
import marineStyles from "./PhysicalCartaCevicheria.module.css";

const POLL_MS = 30_000;
const ROWS_PER_SHEET = 7;
const cacheKey = (slug) => `foodflow:carta:${slug}`;

function readCache(slug) {
  try {
    const payload = JSON.parse(window.localStorage.getItem(cacheKey(slug)));
    return typeof payload?.version === "number" ? payload : null;
  } catch {
    return null;
  }
}

function writeCache(slug, payload) {
  try {
    window.localStorage.setItem(cacheKey(slug), JSON.stringify(payload));
  } catch {
    // Private browsing or a full store must not break the carta.
  }
}

// Preserve live prices and availability, without placing status UI on the paper.
function useLiveCarta(slug, initial) {
  const [payload, setPayload] = useState(initial);
  const versionRef = useRef(initial.version);
  const apply = useCallback((next) => {
    if (next.version === versionRef.current) return;
    versionRef.current = next.version;
    setPayload(next);
    writeCache(slug, next);
  }, [slug]);

  useEffect(() => {
    const cached = readCache(slug);
    if (cached && cached.version > versionRef.current) apply(cached);
    else writeCache(slug, initial);
    // The first server payload is tied to this slug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    let source = null;
    let poll = null;
    const stopPolling = () => {
      if (poll) window.clearInterval(poll);
      poll = null;
    };
    const startPolling = () => {
      if (poll || cancelled) return;
      const ask = async () => {
        try {
          const response = await fetch(`/api/carta/${slug}?v=${versionRef.current}`, { cache: "no-store" });
          if (cancelled || response.status === 204 || !response.ok) return;
          apply(await response.json());
        } catch {
          // EventSource retries; polling is the fallback.
        }
      };
      poll = window.setInterval(ask, POLL_MS);
      void ask();
    };
    if (typeof window.EventSource === "function") {
      source = new EventSource(`/api/carta/${slug}/stream?v=${versionRef.current}`);
      source.addEventListener("ready", stopPolling);
      source.addEventListener("carta", (event) => {
        if (cancelled) return;
        stopPolling();
        try { apply(JSON.parse(event.data)); } catch { /* The next frame carries the state. */ }
      });
      source.addEventListener("gone", () => { if (!cancelled) window.location.reload(); });
      source.onerror = startPolling;
    } else {
      startPolling();
    }
    return () => {
      cancelled = true;
      stopPolling();
      source?.close();
    };
  }, [slug, apply]);
  return payload;
}

function menuSections(categories, items) {
  const byCategory = new Map();
  for (const item of items) {
    const key = item.categoryId ?? "__sin__";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(item);
  }
  const sections = categories
    .filter((category) => byCategory.has(category.id))
    .map((category) => ({ id: category.id, name: category.name, items: byCategory.get(category.id) }));
  if (byCategory.has("__sin__")) {
    sections.push({ id: "__sin__", name: "Otros", items: byCategory.get("__sin__") });
  }
  return sections;
}

// A sheet holds seven two-column rows; oversized categories continue on a new sheet.
function paginate(sections) {
  const sheets = [];
  let current = [];
  let rows = 0;
  const finish = () => {
    if (current.length) sheets.push(current);
    current = [];
    rows = 0;
  };
  for (const section of sections) {
    for (let index = 0; index < section.items.length; ) {
      const take = Math.min(section.items.length - index, (ROWS_PER_SHEET - rows) * 2);
      if (!take) { finish(); continue; }
      current.push({ id: `${section.id}-${index}`, name: section.name, items: section.items.slice(index, index + take) });
      rows += Math.ceil(take / 2);
      index += take;
      if (rows === ROWS_PER_SHEET) finish();
    }
  }
  finish();
  return sheets.length ? sheets : [[]];
}

// The demo's three selected photographs are CC0 or public domain. Other
// restaurants fall back to one of their own uploaded photographs per section.
const DEMO_FEATURES = new Set(["Ceviche clásico", "Chaufa de mariscos", "Picarones"]);
function featuredPhotos(sheet) {
  const picks = new Set();
  for (const section of sheet) {
    const preferred = section.items.find((item) => item.photoUrl && DEMO_FEATURES.has(item.name));
    if (preferred && picks.size < 2) picks.add(preferred.id);
  }
  if (!picks.size) {
    for (const section of sheet) {
      const first = section.items.find((item) => item.photoUrl);
      if (first) picks.add(first.id);
      if (picks.size === 2) break;
    }
  }
  return picks;
}

function AjiMotif({ className }) {
  return (
    <svg className={className} viewBox="0 0 108 52" fill="none" aria-hidden="true">
      <path d="M27 20c8-7 19-3 20 6 1 11-15 18-37 19 10-8 14-18 17-25Z" />
      <path d="M30 18c0-8 6-13 14-12M33 19c5-4 10-5 16-3-3 4-7 6-12 6" />
      <path d="M49 25c17-5 32-1 47 10M64 26c5-10 13-11 19-8-3 6-9 9-17 9M75 29c7-1 13 2 19 6" />
      <circle cx="99" cy="37" r="1.2" />
    </svg>
  );
}

function CoastMotif({ className }) {
  return <svg className={className} viewBox="0 0 108 52" fill="none" aria-hidden="true">
    <path d="M4 28c13-8 25-8 38 0s25 8 38 0c8-5 16-5 24-1M4 40c13-8 25-8 38 0s25 8 38 0c8-5 16-5 24-1" />
    <path d="M43 12c8-8 22-8 30 0-8 8-22 8-30 0ZM43 12l-9-5v10l9-5ZM62 11h.01" />
  </svg>;
}

const visualThemes = {
  criolla: { className: "", Motif: AjiMotif, eyebrow: "Cocina de nuestra tierra" },
  cevicheria: { className: marineStyles.theme, Motif: CoastMotif, eyebrow: "Cocina de nuestro mar" },
};

function Dish({ item, featured }) {
  return (
    <div className={styles.dish}>
      {featured && (
        <div className={styles.photoWrap}>
          <Image src={item.photoUrl} alt={item.name} fill sizes="(max-width: 600px) 42vw, 260px" className={styles.photo} loading="eager" />
        </div>
      )}
      <div className={styles.dishTop}>
        <h3>{item.name}</h3>
        <span className={styles.price}>{cartaPrice(item.price)}</span>
      </div>
      {item.description && <p className={styles.description}>{item.description}</p>}
      {!item.available && <p className={styles.soldOut}>Agotado por hoy</p>}
    </div>
  );
}

export default function PhysicalCartaView({ initial }) {
  const { venue, categories, items, template } = useLiveCarta(initial.venue.slug, initial);
  const templateKey = resolveMenuTemplate(template);
  const { className: themeClass, Motif, eyebrow } = visualThemes[templateKey];
  const sheets = useMemo(() => paginate(menuSections(categories, items)), [categories, items]);

  return (
    <main id="main" className={`${styles.stage} ${themeClass}`}>
      {sheets.map((sheet, pageIndex) => {
        const featured = featuredPhotos(sheet);
        return (
          <article className={styles.sheet} key={`${venue.slug}-${pageIndex}`} aria-label={`Carta, hoja ${pageIndex + 1} de ${sheets.length}`}>
            <div className={styles.paperGrain} aria-hidden="true" />
            <div className={styles.inner}>
              <header className={`${styles.header} ${pageIndex > 0 ? styles.continuation : ""}`}>
                <div className={styles.topRule} aria-hidden="true"><span /></div>
                <p className={styles.eyebrow}>{eyebrow}</p>
                <h1>{venue.name}</h1>
                <p className={styles.tagline}>{venue.tagline || menuTemplates[templateKey].subtitle}</p>
                <Motif className={styles.headerMotif} />
              </header>
              <div className={styles.sections}>
                {sheet.length === 0 && <p className={styles.empty}>Pronto compartiremos nuestra carta.</p>}
                {sheet.map((section) => (
                  <section className={styles.section} key={section.id}>
                    <div className={styles.sectionHeading}>
                      <span className={styles.sectionFlourish} aria-hidden="true">✦</span>
                      <h2>{section.name}</h2>
                      <span className={styles.sectionLine} aria-hidden="true" />
                    </div>
                    <div className={styles.dishes}>
                      {section.items.map((item) => <Dish key={item.id} item={item} featured={featured.has(item.id)} />)}
                    </div>
                  </section>
                ))}
              </div>
              <footer className={styles.footer}>
                <span className={styles.footerLine} aria-hidden="true" />
                <Motif className={styles.footerMotif} />
                <span className={styles.pageNumber}>{String(pageIndex + 1).padStart(2, "0")} / {String(sheets.length).padStart(2, "0")}</span>
              </footer>
            </div>
          </article>
        );
      })}
    </main>
  );
}
