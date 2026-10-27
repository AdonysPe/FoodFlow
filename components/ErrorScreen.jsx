import { lbFontClasses } from "@/components/landing/lbFonts";

/**
 * The full-page screen for a missing route (404) and a crashed one (500),
 * drawn in design B. A kitchen ticket stands in for the illustration: the
 * page that was "ordered" and what happened to it.
 *
 * It sits outside the marketing shell on purpose — an error page should load
 * with as little as possible, so no chat, no nav, no providers. The actions
 * come in as children because the 500 needs a client `reset()` button.
 */
export default function ErrorScreen({ code, lead, last, copy, lines, foot, children, footnote }) {
  return (
    <div data-theme="dark" className={`${lbFontClasses} lb lb-site lb-er`}>
      <div aria-hidden className="lb-er-glow" />

      <header className="lb-er-top">
        <a href="/" className="lb-er-logo lb-display">
          FoodFlow<i aria-hidden />
        </a>
      </header>

      <main className="lb-er-main">
        <div className="lb-er-art lb-rise" aria-hidden>
          <div className="lb-er-ticket">
            <div className="lb-er-ticket-head">
              <span>Comanda</span>
              <span>#{code}</span>
            </div>
            <hr />
            {lines.map((line) => (
              <div key={line.text} className={line.tone ? `is-${line.tone}` : undefined}>
                {line.text}
              </div>
            ))}
            <hr />
            <div className="lb-er-ticket-foot">
              <span>{foot}</span>
              <span className="lb-er-caret">_</span>
            </div>
            <span className="lb-er-badge lb-display">{code}</span>
          </div>
        </div>

        <div className="lb-er-copy">
          <p className="lb-eyebrow-accent lb-rise">Error {code}</p>
          <h1 className="lb-er-h1">
            <span className="lb-word" style={{ animationDelay: ".05s" }}>{lead}</span>{" "}
            <span className="lb-word" style={{ animationDelay: ".16s", color: "var(--lb-mute)" }}>
              {last}
              <span style={{ color: "var(--lb-accent)" }}>.</span>
            </span>
          </h1>
          <p className="lb-er-text lb-rise" style={{ animationDelay: ".25s" }}>
            {copy}
          </p>
          <div className="lb-er-actions lb-rise" style={{ animationDelay: ".35s" }}>
            {children}
          </div>
          {footnote && (
            <p className="lb-er-foot lb-rise" style={{ animationDelay: ".42s" }}>
              {footnote}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
