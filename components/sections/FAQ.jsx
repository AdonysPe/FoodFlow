"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useChat } from "@/components/chat/ChatContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { buildWhatsAppUrl } from "@/lib/contact";

const TOPIC_ORDER = ["all", "operation", "start", "pricing"];

/** Lower-case and strip accents so "operacion" finds "Operación". */
function norm(text) {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 19.5l1.4-4A8 8 0 1 1 8.6 18.6z" />
    </svg>
  );
}

/**
 * /preguntas, design B ("Noche"), as approved in the prototype: the headline,
 * a search box and topic chips, the accordion, and a closing call that points
 * to the chat and WhatsApp.
 *
 * The questions are the dictionary's `t.faq.items`, the same six the FAQPage
 * markup publishes: every one stays on the page whatever the filter says at
 * load time (nothing is hidden until the visitor searches). `as` is forwarded
 * so /preguntas keeps the h1.
 */
export default function FAQ({ as: Heading = "h1" }) {
  const { t } = useLanguage();
  const c = t.faq;
  const { openChat } = useChat();

  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");
  const [open, setOpen] = useState(0);

  const whatsappUrl = buildWhatsAppUrl(c.closing.whatsappMessage);

  const visible = useMemo(() => {
    const needle = norm(query.trim());
    return c.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        const topicOk = topic === "all" || item.topic === topic;
        const queryOk = !needle || norm(`${item.q} ${item.a}`).includes(needle);
        return topicOk && queryOk;
      });
  }, [c.items, query, topic]);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="lb-pr-hero lb-pr-hero--left">
        <div className="lb-glow" aria-hidden style={{ top: 10, height: 460 }} />
        <div className="lb-pr-block lb-pr-block--flush">
          <p className="lb-eyebrow-accent lb-rise">{c.eyebrow}</p>
          <Heading className="lb-pr-h1">
            {c.line1.map((w, i) => (
              <span key={`a${i}`}>
                <span className="lb-word" style={{ animationDelay: `${0.05 + i * 0.07}s` }}>
                  {w}
                </span>{" "}
              </span>
            ))}
            <br />
            {c.line2.map((w, i) => {
              const last = i === c.line2.length - 1;
              return (
                <span key={`b${i}`}>
                  <span className="lb-word" style={{ animationDelay: `${0.45 + i * 0.07}s`, color: last ? undefined : "#8a8278" }}>
                    {w}
                    {last && <span style={{ color: "#ff5a33" }}>.</span>}
                  </span>
                  {last ? "" : " "}
                </span>
              );
            })}
          </Heading>

          <div className="lb-qa-tools lb-rise" style={{ animationDelay: ".85s" }}>
            <label htmlFor="faq-buscar" className="lb-sr-only">
              {c.searchLabel}
            </label>
            <div className="lb-qa-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a39b90" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-4-4" />
              </svg>
              <input
                id="faq-buscar"
                type="search"
                autoComplete="off"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={c.searchPlaceholder}
              />
            </div>
            <div className="lb-qa-topics" role="group" aria-label={c.topicsLabel}>
              {TOPIC_ORDER.map((id) => (
                <button key={id} type="button" aria-pressed={topic === id} className={topic === id ? "is-on" : undefined} onClick={() => setTopic(id)}>
                  {c.topics[id]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ the answers */}
      <section id="faq" className="lb-pr-block lb-qa-list" aria-live="polite">
        {visible.map(({ item, index }) => {
          const isOpen = open === index;
          const panelId = `faq-panel-${index}`;
          return (
            <div key={index} className={`lb-qa-item${isOpen ? " is-open" : ""}`}>
              <h3 style={{ margin: 0 }}>
                <button type="button" className="lb-qa-q" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpen(isOpen ? -1 : index)}>
                  <span className="lb-mono lb-qa-n">{String(index + 1).padStart(2, "0")}</span>
                  <span className="lb-qa-text">{item.q}</span>
                  <span className="lb-qa-topic">{c.topics[item.topic]}</span>
                  <span className="lb-qa-plus" aria-hidden>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </button>
              </h3>
              <p id={panelId} className="lb-qa-a lb-open" hidden={!isOpen}>
                {item.a}
              </p>
            </div>
          );
        })}
        {visible.length === 0 && <div className="lb-qa-none">{c.none}</div>}
      </section>

      {/* ----------------------------------------------------------- close */}
      <section className="lb-pr-block lb-qa-close">
        <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
          <h2 className="lb-h2 lb-reveal" style={{ fontSize: "clamp(40px, 5vw, 68px)" }}>
            {c.closing.line1}
            <br />
            <span>{c.closing.line2}</span>
          </h2>
          <p className="lb-reveal" style={{ margin: 0, fontSize: 18, lineHeight: 1.55, color: "#b9b1a5", maxWidth: 460 }}>
            {c.closing.description}
          </p>
          <div className="lb-reveal" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
            {whatsappUrl ? (
              <a className="lb-qa-wa" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon />
                {c.closing.whatsapp}
              </a>
            ) : (
              <button type="button" className="lb-qa-wa" onClick={() => openChat()}>
                <WhatsAppIcon />
                {c.closing.whatsapp}
              </button>
            )}
            <Link href="/precios" className="lb-text-link" style={{ minHeight: 48 }}>
              {c.closing.plans}
            </Link>
          </div>
        </div>

        <div style={{ flex: "1 1 420px", minWidth: 0, display: "flex", justifyContent: "center" }}>
          <div className="lb-qa-chat" role="img" aria-label={c.chatDemo.label}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", borderBottom: "1px solid rgba(243,239,230,0.07)" }}>
              <span style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(15,181,160,0.16)", color: "#0fb5a0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <WhatsAppIcon />
              </span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{c.chatDemo.name}</span>
                <span style={{ fontSize: 12, color: "#a39b90" }}>{c.chatDemo.status}</span>
              </span>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10, minHeight: 280 }}>
              <div className="ch c1" style={{ alignSelf: "flex-end", maxWidth: "80%", background: "#0fb5a0", color: "#0c0908", borderRadius: "18px 18px 4px 18px", padding: "11px 14px", fontSize: 14, fontWeight: 500 }}>
                {c.chatDemo.user}
              </div>
              <div style={{ display: "grid", justifyItems: "start", alignItems: "start" }}>
                <div className="ch c2" aria-hidden style={{ gridArea: "1 / 1", display: "flex", gap: 4, background: "#241d19", borderRadius: "18px 18px 18px 4px", padding: "14px 16px" }}>
                  {[0, 0.15, 0.3].map((d) => (
                    <span key={d} className="dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#cfc7bb", animationDelay: `${d}s` }} />
                  ))}
                </div>
                <div className="ch c3" style={{ gridArea: "1 / 1", maxWidth: "85%", background: "#241d19", color: "#f3efe6", borderRadius: "18px 18px 18px 4px", padding: "11px 14px", fontSize: 14, lineHeight: 1.5 }}>
                  {c.chatDemo.reply}
                </div>
              </div>
              <div className="ch c4" style={{ alignSelf: "flex-start", display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 550, border: "1px solid rgba(15,181,160,0.5)", color: "#5fd6c5", padding: "7px 12px", borderRadius: 999 }}>{c.chatDemo.chips[0]}</span>
                <span style={{ fontSize: 12, fontWeight: 550, border: "1px solid rgba(243,239,230,0.16)", color: "#cfc7bb", padding: "7px 12px", borderRadius: 999 }}>{c.chatDemo.chips[1]}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
