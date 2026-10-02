"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { cartaPrice } from "@/lib/carta";
import { menuTemplates, resolveMenuTemplate } from "@/lib/menuTemplates";
import styles from "./PhysicalCartaView.module.css";
import marineStyles from "./PhysicalCartaCevicheria.module.css";
import chifaStyles from "./PhysicalCartaChifa.module.css";
import pizzeriaStyles from "./PhysicalCartaPizzeria.module.css";

const POLL_MS = 30_000;
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

// Height budget of one A4 sheet in millimetres, once header and footer are out.
// The first sheet carries the full masthead, later ones a short one. The costs
// are measured from the stylesheet: a heading with its spacing, a row of two
// photo cards, the full-width card an odd photo gets, a row of two text lines.
const FIRST_SHEET_MM = 212;
const NEXT_SHEET_MM = 234;
const HEADING_MM = 17;
const PHOTO_ROW_MM = 32;
const WIDE_CARD_MM = 38;
const TEXT_ROW_MM = 18;
const TEXT_SEPARATOR_MM = 11;

// Dishes with a photograph come first inside their category, so the photo cards
// form one block with no gaps and the text-only dishes close the section as a
// compact list. Each group keeps the order the owner gave it.
function menuSections(categories, items) {
  const byCategory = new Map();
  for (const item of items) {
    const key = item.categoryId ?? "__sin__";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(item);
  }
  const arrange = (list) => [...list.filter((item) => item.photoUrl), ...list.filter((item) => !item.photoUrl)];
  const sections = categories
    .filter((category) => byCategory.has(category.id))
    .map((category) => ({ id: category.id, name: category.name, items: arrange(byCategory.get(category.id)) }));
  if (byCategory.has("__sin__")) {
    sections.push({ id: "__sin__", name: "Otros", items: arrange(byCategory.get("__sin__")) });
  }
  return sections;
}

const chunkCost = (photos, texts) =>
  HEADING_MM
  + Math.floor(photos / 2) * PHOTO_ROW_MM
  + (photos % 2 ? WIDE_CARD_MM : 0)
  + (photos && texts ? TEXT_SEPARATOR_MM : 0)
  + Math.ceil(texts / 2) * TEXT_ROW_MM;

// Fills each sheet by height, not by dish count: a photo card is taller than a
// text line, so counting dishes would overflow the page or leave it half empty.
// A category that does not fit continues on the next sheet under its own name.
function paginate(sections) {
  const sheets = [];
  let sheet = [];
  let used = 0;
  const budget = () => (sheets.length === 0 ? FIRST_SHEET_MM : NEXT_SHEET_MM);
  const endSheet = () => {
    if (sheet.length) sheets.push(sheet);
    sheet = [];
    used = 0;
  };

  for (const section of sections) {
    let chunk = null;
    let parts = 0;
    const commit = () => {
      if (!chunk) return;
      sheet.push(chunk);
      used += chunkCost(chunk.photos.length, chunk.texts.length);
      chunk = null;
    };
    // Dishes enter by row (two at a time), never one by one: a lone card is
    // priced as the full-width one it would become, which would turn away a
    // pair that fits perfectly well.
    const photoRows = [];
    const textRows = [];
    for (const item of section.items) {
      const rows = item.photoUrl ? photoRows : textRows;
      if (rows.length && rows.at(-1).length < 2) rows.at(-1).push(item);
      else rows.push([item]);
    }
    for (const row of [...photoRows, ...textRows]) {
      const withPhoto = Boolean(row[0].photoUrl);
      for (;;) {
        const current = chunk ?? { id: `${section.id}-${parts}`, sectionId: section.id, name: section.name, continued: parts > 0, photos: [], texts: [] };
        const cost = chunkCost(current.photos.length + (withPhoto ? row.length : 0), current.texts.length + (withPhoto ? 0 : row.length));
        if (used + cost <= budget() || (!sheet.length && !chunk)) {
          if (!chunk) { chunk = current; parts += 1; }
          (withPhoto ? chunk.photos : chunk.texts).push(...row);
          break;
        }
        commit();
        endSheet();
      }
    }
    commit();
  }
  endSheet();
  return sheets.length ? sheets : [[]];
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

function LatticeMotif({ className }) {
  return <svg className={className} viewBox="0 0 108 52" fill="none" aria-hidden="true">
    <path d="M5 5h35v35H5zM13 13h19v19H13zM68 5h35v35H68zM76 13h19v19H76zM40 22h28M23 40v8M85 40v8" />
  </svg>;
}

function WheatMotif({ className }) {
  return <svg className={className} viewBox="0 0 108 52" fill="none" aria-hidden="true">
    <path d="M54 49V3M54 14C43 12 38 8 37 1c10 1 16 5 17 13Zm0 10c11-2 16-6 17-13-10 1-16 5-17 13Zm0 10c-11-2-16-6-17-13 10 1 16 5 17 13Zm0 10c11-2 16-6 17-13-10 1-16 5-17 13Z" />
    <path d="M6 47c12-7 24-7 36 0M66 47c12-7 24-7 36 0" />
  </svg>;
}

const visualThemes = {
  criolla: { className: "", Motif: AjiMotif },
  cevicheria: { className: marineStyles.theme, Motif: CoastMotif },
  chifa: { className: chifaStyles.theme, Motif: LatticeMotif },
  pizzeria: { className: pizzeriaStyles.theme, Motif: WheatMotif },
};

function PhotoDish({ item, wide, onOpen }) {
  return (
    <div className={`${styles.card} ${wide ? styles.wide : ""} ${item.available ? "" : styles.out}`}>
      <button type="button" className={styles.thumb} onClick={() => onOpen(item.id)} aria-label={`Ver la foto de ${item.name}`}>
        <Image
          src={item.photoUrl}
          alt=""
          fill
          sizes={wide ? "(max-width: 600px) 92px, 240px" : "(max-width: 600px) 92px, 110px"}
          className={styles.photo}
          loading="eager"
        />
        {!item.available && <span className={styles.ribbon}>Agotado</span>}
      </button>
      <div className={styles.cardBody}>
        <h3>{item.name}</h3>
        {item.description && <p className={styles.description}>{item.description}</p>}
        <span className={styles.price}>{cartaPrice(item.price)}</span>
      </div>
    </div>
  );
}

function TextDish({ item }) {
  return (
    <div className={`${styles.line} ${item.available ? "" : styles.out}`}>
      <div className={styles.lineTop}>
        <h3>{item.name}</h3>
        <span className={styles.leader} aria-hidden="true" />
        <span className={styles.price}>{cartaPrice(item.price)}</span>
      </div>
      {item.description && <p className={styles.description}>{item.description}</p>}
      {!item.available && <p className={styles.soldOut}>Agotado por hoy</p>}
    </div>
  );
}

// Jump bar for the diner who is hunting for the drinks or the desserts. It is
// screen-only: the printed sheet has no use for it.
function SectionNav({ sections }) {
  const [active, setActive] = useState(sections[0]?.id);
  const barRef = useRef(null);

  useEffect(() => {
    const targets = [...document.querySelectorAll("[data-cat]")];
    if (!targets.length || typeof IntersectionObserver !== "function") return undefined;
    const inBand = new Set();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.getAttribute("data-cat");
        if (entry.isIntersecting) inBand.add(id);
        else inBand.delete(id);
      }
      const current = [...sections].reverse().find((section) => inBand.has(section.id));
      if (current) setActive(current.id);
    }, { rootMargin: "-18% 0px -68% 0px" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const bar = barRef.current;
    const chip = bar?.querySelector(`[data-chip="${CSS.escape(String(active))}"]`);
    if (!bar || !chip) return;
    bar.scrollTo({ left: chip.offsetLeft - (bar.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
  }, [active]);

  const go = (event, id) => {
    event.preventDefault();
    const target = document.getElementById(`cat-${id}`);
    if (!target) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    setActive(id);
  };

  return (
    <nav className={styles.nav} aria-label="Secciones de la carta">
      <div className={styles.navBar} ref={barRef}>
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#cat-${section.id}`}
            data-chip={section.id}
            className={`${styles.chip} ${active === section.id ? styles.chipActive : ""}`}
            aria-current={active === section.id ? "true" : undefined}
            onClick={(event) => go(event, section.id)}
          >
            {section.name}
          </a>
        ))}
      </div>
    </nav>
  );
}

// A native <dialog>: it traps focus, closes on Esc and hands focus back to the
// photo that opened it, without any code of ours.
function DishDialog({ item, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClose={onClose}
      onClick={(event) => { if (event.target === ref.current) ref.current.close(); }}
      aria-label={item ? item.name : "Plato"}
    >
      {item && (
        <div className={`${styles.dialogCard} ${item.available ? "" : styles.out}`}>
          <div className={styles.dialogPhoto}>
            <Image src={item.photoUrl} alt={item.name} fill sizes="(max-width: 600px) 92vw, 520px" className={styles.photo} />
            {!item.available && <span className={styles.ribbon}>Agotado por hoy</span>}
          </div>
          <div className={styles.dialogBody}>
            <h2>{item.name}</h2>
            {item.description && <p className={styles.description}>{item.description}</p>}
            <span className={styles.price}>{cartaPrice(item.price)}</span>
          </div>
          <button type="button" className={styles.dialogClose} onClick={() => ref.current?.close()} aria-label="Cerrar">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
          </button>
        </div>
      )}
    </dialog>
  );
}

export default function PhysicalCartaView({ initial }) {
  const { venue, categories, items, template } = useLiveCarta(initial.venue.slug, initial);
  const templateKey = resolveMenuTemplate(template);
  const { className: themeClass, Motif } = visualThemes[templateKey];
  const sections = useMemo(() => menuSections(categories, items), [categories, items]);
  const sheets = useMemo(() => paginate(sections), [sections]);
  const [openId, setOpenId] = useState(null);
  const opened = openId ? items.find((item) => item.id === openId && item.photoUrl) ?? null : null;
  const seen = new Set();

  return (
    <main id="main" className={`${styles.stage} ${themeClass}`}>
      {sections.length > 1 && <SectionNav sections={sections} />}
      {sheets.map((sheet, pageIndex) => (
        <article className={styles.sheet} key={`${venue.slug}-${pageIndex}`} aria-label={`Carta, hoja ${pageIndex + 1} de ${sheets.length}`}>
          <div className={styles.paperGrain} aria-hidden="true" />
          <div className={styles.inner}>
            <header className={`${styles.header} ${pageIndex > 0 ? styles.continuation : ""}`}>
              <div className={styles.topRule} aria-hidden="true"><span /></div>
              <h1>{venue.name}</h1>
              <p className={styles.tagline}>{venue.tagline || menuTemplates[templateKey].subtitle}</p>
              <Motif className={styles.headerMotif} />
            </header>
            <div className={styles.sections}>
              {sheet.length === 0 && <p className={styles.empty}>Pronto compartiremos nuestra carta.</p>}
              {sheet.map((chunk) => {
                const first = !seen.has(chunk.sectionId);
                seen.add(chunk.sectionId);
                return (
                  <section
                    className={styles.section}
                    key={chunk.id}
                    id={first ? `cat-${chunk.sectionId}` : undefined}
                    data-cat={chunk.sectionId}
                  >
                    <div className={styles.sectionHeading}>
                      <span className={styles.sectionFlourish} aria-hidden="true">✦</span>
                      <h2>{chunk.name}</h2>
                      {chunk.continued && <span className={styles.continued}>continuación</span>}
                      <span className={styles.sectionLine} aria-hidden="true" />
                    </div>
                    {chunk.photos.length > 0 && (
                      <div className={styles.cards}>
                        {chunk.photos.map((item, index) => (
                          <PhotoDish
                            key={item.id}
                            item={item}
                            wide={chunk.photos.length % 2 === 1 && index === chunk.photos.length - 1}
                            onOpen={setOpenId}
                          />
                        ))}
                      </div>
                    )}
                    {chunk.texts.length > 0 && (
                      <div className={`${styles.lines} ${chunk.photos.length ? styles.afterCards : ""}`}>
                        {chunk.texts.map((item) => <TextDish key={item.id} item={item} />)}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
            <footer className={styles.footer}>
              <span className={styles.footerLine} aria-hidden="true" />
              <Motif className={styles.footerMotif} />
              <span className={styles.pageNumber}>{String(pageIndex + 1).padStart(2, "0")} / {String(sheets.length).padStart(2, "0")}</span>
            </footer>
          </div>
        </article>
      ))}
      <DishDialog item={opened} onClose={() => setOpenId(null)} />
    </main>
  );
}
