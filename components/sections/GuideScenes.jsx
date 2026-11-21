"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
// Scroll scenes for the guides. Imported here, so only the pages that mount
// a scene load it; the home page's own scenes live in app/home.css.
import "@/app/guide-scenes.css";

/**
 * Two pinned scroll scenes for the guides, built like the home page's: the
 * copy is real text in the HTML, the motion is CSS scroll timelines only,
 * and without them (older browsers, reduced motion, phones) each scene is a
 * still, stacked section.
 *
 *   <CevicheScene />   /carta-digital-qr: a ceviche assembles on the plate.
 *   <ComandasScene />  /comanda-digital:  tickets are dealt onto the board.
 */

// [kind, left %, top %, fly-in x px, fly-in y px, spin deg]: where each
// ingredient rests on the bowl, and where it comes from.
const PIECES = [
  ["choclo", 14, 40, -460, -120, -140],
  ["camote", 62, 62, 380, 300, 120],
  ["fish", 36, 30, -300, -380, -200],
  ["fish", 50, 27, 120, -460, 160],
  ["fish", 30, 45, -520, 60, 260],
  ["fish", 46, 42, 40, -300, -90],
  ["fish", 58, 40, 480, -200, 220],
  ["fish", 38, 57, -240, 420, -260],
  ["fish", 52, 55, 300, 380, 180],
  ["onion", 25, 28, -420, -320, 90],
  ["onion", 60, 23, 420, -380, -120],
  ["onion", 64, 50, 540, 80, 200],
  ["onion", 24, 58, -480, 300, -60],
  ["cil", 44, 37, -120, -500, 0],
  ["cil", 57, 51, 260, 480, 0],
  ["cil", 34, 53, -380, 460, 0],
  ["cil", 48, 64, 60, 520, 0],
  ["cil", 41, 24, -60, -540, 0],
  ["aji", 54, 34, 360, -460, 140],
  ["aji", 42, 49, -300, 200, -140],
];

// Ingredient labels: [side, left/right %, top %]. Text comes from the copy.
const LABELS = [
  ["l", -4, 14],
  ["r", -6, 22],
  ["l", -8, 46],
  ["r", -4, 72],
];

export function CevicheScene() {
  const { t } = useLanguage();
  const c = t.landing.scenes.ceviche;
  // The dish and its price are the ones the home page's phone already shows.
  const dish = t.landing.story.phone.items[0];

  return (
    <section className="lg-track lg-cv-track" aria-labelledby="lg-cv-title">
      <div className="lg-stage lg-cv-stage">
        <div className="lg-wrap lg-cv-grid">
          <div className="lg-cv-copy">
            <p className="lg-tag">{c.eyebrow}</p>
            <h2 id="lg-cv-title" className="lb-h2">
              {c.title}
              <span className="lg-block">{c.titleMuted}</span>
            </h2>
            <p className="lb-lede lg-lede">{c.lede}</p>
            <div className="lg-price">
              <span>
                <b>{dish.name}</b> <span className="lg-muted">· {dish.price}</span>
              </span>
              <span className="lb-pill-btn lb-pill-btn--sm" aria-hidden>
                {c.add}
              </span>
            </div>
          </div>

          <div className="lg-table3d">
            <div className="lg-dish" role="img" aria-label={c.aria}>
              <span className="lg-pc lg-plate" />
              <span className="lg-pc lg-bowl lg-fly" style={{ "--x": "0px", "--y": "260px", "--r": "0deg" }} />
              {PIECES.map(([kind, left, top, x, y, r], i) => (
                <span
                  key={i}
                  className={`lg-pc lg-${kind} lg-fly`}
                  style={{ left: `${left}%`, top: `${top}%`, "--x": `${x}px`, "--y": `${y}px`, "--r": `${r}deg` }}
                />
              ))}
            </div>
            {c.labels.map((label, i) => {
              const [side, offset, top] = LABELS[i];
              return (
                <span
                  key={label}
                  className={`lg-lbl is-${side}`}
                  style={{ [side === "l" ? "left" : "right"]: `${offset}%`, top: `${top}%`, "--lx": side === "l" ? "-30px" : "30px" }}
                >
                  {side === "r" && <i aria-hidden />}
                  {label}
                  {side === "l" && <i aria-hidden />}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ComandasScene() {
  const { t } = useLanguage();
  const c = t.landing.scenes.comandas;

  return (
    <section className="lg-track lg-cm-track" aria-labelledby="lg-cm-title">
      <div className="lg-stage lg-cm-stage">
        <div className="lg-wrap">
          <div className="lg-cm-head">
            <div>
              <p className="lg-tag">{c.eyebrow}</p>
              <h2 id="lg-cm-title" className="lb-h2">
                {c.title}
                <span className="lg-block">{c.titleMuted}</span>
              </h2>
            </div>
            <p className="lb-lede lg-lede lg-cm-lede">{c.lede}</p>
          </div>

          <div className="lg-board">
            {c.tickets.map((ticket, i) => (
              <article
                key={ticket.label}
                className="lg-tix"
                style={{ "--i": i, "--col": i % 4, "--row": Math.floor(i / 4), "--r": `${[-8, 6, -3, 10, 4, -11, 7, -5][i % 8]}deg` }}
              >
                <b>
                  {ticket.label}
                  <span className={`lg-st is-${ticket.tone}`}>{ticket.state}</span>
                </b>
                {ticket.lines.map((line) => (
                  <span key={line} className="lg-line">
                    {line}
                  </span>
                ))}
              </article>
            ))}
          </div>
          <p className="lg-note">{c.note}</p>
        </div>
      </div>
    </section>
  );
}
