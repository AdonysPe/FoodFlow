"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogoMark } from "@/components/ui/Logo";
import { IconArrowRight, IconChat, IconCheck, IconX } from "@/components/ui/Icons";
import { useChat } from "@/components/chat/ChatContext";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { buildWhatsAppUrl } from "@/lib/contact";
import { submitLead } from "@/lib/actions/leads";
import { EASE, INTRO_DELAY } from "@/lib/motion";

// Long enough to read as an answer being written, short enough that nobody
// waits for it. The indicator is what makes preset answers feel like a reply.
const TYPING_MS = 650;

// What the chat opens with, before the visitor has asked anything.
const OPENING_TOPICS = ["planes", "piloto", "incluye", "comision"];

/** Loose match of a typed question against a topic's keywords. */
function matchTopic(topics, input) {
  const text = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  let best = null;
  let bestScore = 0;

  for (const topic of topics) {
    const score = topic.keywords.reduce((n, keyword) => {
      const k = keyword
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "");
      return text.includes(k) ? n + k.length : n;
    }, 0);
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }

  return best;
}

export default function ChatWidget() {
  const { t } = useLanguage();
  const c = t.chat;
  const { open, openChat, closeChat, request, consumeRequest } = useChat();

  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState(OPENING_TOPICS);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [handoff, setHandoff] = useState(null); // null | "choice" | "email" | "sent"
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const seq = useRef(0);
  const timers = useRef([]);
  const scroller = useRef(null);
  const inputRef = useRef(null);

  const nextId = () => `m${(seq.current += 1)}`;
  const whatsappUrl = buildWhatsAppUrl(c.handoff.whatsappMessage);

  // Any pending "typing…" timer dies with the component.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const say = useCallback((items, followUps) => {
    setTyping(true);
    const timer = setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, ...items]);
      if (followUps) setSuggestions(followUps);
    }, TYPING_MS);
    timers.current.push(timer);
  }, []);

  const ask = useCallback(
    (topicId) => {
      const topic = c.topics.find((x) => x.id === topicId);
      if (!topic) return;

      setHandoff(null);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), from: "user", text: topic.question },
      ]);

      const reply = topic.answer.map((text) => ({ id: nextId(), from: "bot", text }));
      if (topic.showPlans) reply.push({ id: nextId(), from: "bot", plans: true });
      say(reply, topic.followUps ?? OPENING_TOPICS);
    },
    [c.topics, say]
  );

  const askFreeText = (value) => {
    const text = value.trim();
    if (!text) return;

    setDraft("");
    setMessages((prev) => [...prev, { id: nextId(), from: "user", text }]);

    const topic = matchTopic(c.topics, text);
    if (topic) {
      const reply = topic.answer.map((answer) => ({
        id: nextId(),
        from: "bot",
        text: answer,
      }));
      if (topic.showPlans) reply.push({ id: nextId(), from: "bot", plans: true });
      say(reply, topic.followUps ?? OPENING_TOPICS);
      return;
    }

    // Nothing matched: say so plainly and offer a human instead of guessing.
    say(
      c.fallback.map((answer) => ({ id: nextId(), from: "bot", text: answer })),
      OPENING_TOPICS
    );
    const timer = setTimeout(() => setHandoff("choice"), TYPING_MS + 60);
    timers.current.push(timer);
  };

  const sendEmail = (e) => {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!value.includes("@")) return;
    setError("");
    startTransition(async () => {
      const result = await submitLead(value);
      if (!result.ok) {
        setError(c.handoff.error);
        return;
      }
      setHandoff("sent");
      setMessages((prev) => [
        ...prev,
        { id: nextId(), from: "user", text: value },
        { id: nextId(), from: "bot", text: c.handoff.success },
      ]);
    });
  };

  // Greet on the first open, and answer straight away when something on the
  // page opened the chat on a specific question.
  useEffect(() => {
    if (!open) return;
    if (messages.length === 0 && !typing) {
      setMessages(c.greeting.map((text) => ({ id: nextId(), from: "bot", text })));
    }
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !request) return;
    ask(request.topicId);
    consumeRequest();
  }, [open, request, ask, consumeRequest]);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, handoff]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && closeChat();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeChat]);

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            onClick={() => openChat()}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.5, ease: EASE, delay: INTRO_DELAY + 0.6 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            aria-haspopup="dialog"
            className="liquid-soft group fixed bottom-5 right-5 z-[70] flex items-center gap-2.5 rounded-full py-2.5 pl-2.5 pr-5 text-[14.5px] font-semibold text-cream/90 transition-colors duration-300 hover:bg-cream/[0.1] hover:text-fg sm:bottom-6 sm:right-6"
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-chat-500/18 ring-1 ring-inset ring-chat-400/35">
              <IconChat className="h-4 w-4 text-chat-ink" />
              <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chat-400/70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-chat-400" />
              </span>
            </span>
            {c.launcher}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={c.title}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed inset-x-3 bottom-3 top-20 z-[70] flex flex-col overflow-hidden rounded-3xl border border-cream/10 bg-ink-900 shadow-panel sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[620px] sm:w-[400px]"
          >
            {/* --------------------------------------------------- header */}
            <header className="flex items-center gap-3 border-b border-cream/10 bg-ink-800/80 px-4 py-3.5">
              <LogoMark className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold text-fg">{c.title}</p>
                <p className="flex items-center gap-1.5 text-[12px] text-cream/58">
                  <span className="h-1.5 w-1.5 rounded-full bg-chat-400" />
                  {c.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={closeChat}
                aria-label={c.close}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-cream/62 transition-colors hover:bg-cream/[0.06] hover:text-fg"
              >
                <IconX className="h-4 w-4" />
              </button>
            </header>

            {/* ------------------------------------------------- messages */}
            <div
              ref={scroller}
              aria-live="polite"
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              {messages.map((message) =>
                message.plans ? (
                  <Plans key={message.id} plans={c.plans} />
                ) : (
                  <Bubble key={message.id} from={message.from}>
                    {message.text}
                  </Bubble>
                )
              )}

              {typing && <Typing label={c.typing} />}

              {handoff === "choice" && (
                <Handoff
                  copy={c.handoff}
                  whatsappUrl={whatsappUrl}
                  onEmail={() => setHandoff("email")}
                />
              )}

              {handoff === "email" && (
                <form onSubmit={sendEmail} className="rounded-2xl bg-ink-800 p-3.5">
                  <label htmlFor="chat-email" className="text-[13.5px] text-cream/70">
                    {c.handoff.emailPrompt}
                  </label>
                  <div className="mt-2.5 flex gap-2">
                    <input
                      id="chat-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={c.handoff.emailPlaceholder}
                      className="h-10 min-w-0 flex-1 rounded-lg border border-cream/10 bg-ink-950 px-3 text-[14px] text-cream placeholder:text-cream/55 outline-none focus:border-chat-400/60"
                    />
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex h-10 items-center gap-1.5 rounded-lg bg-chat-500 px-3.5 text-[13.5px] font-semibold text-on-accent disabled:opacity-60"
                    >
                      {c.handoff.emailSend}
                      <IconArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {error && <p className="mt-2 text-[12.5px] text-accent-ink">{error}</p>}
                </form>
              )}
            </div>

            {/* ------------------------------------ suggestions + input */}
            <div className="border-t border-cream/10 bg-ink-900 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cream/50">
                {c.suggestionsLabel}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {suggestions.map((id) => {
                  const topic = c.topics.find((x) => x.id === id);
                  if (!topic) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => ask(id)}
                      className="rounded-full border border-cream/14 px-3 py-1.5 text-[12.5px] text-cream/75 transition-colors hover:border-chat-400/50 hover:bg-chat-500/12 hover:text-fg"
                    >
                      {topic.question}
                    </button>
                  );
                })}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  askFreeText(draft);
                }}
                className="mt-3 flex gap-2"
              >
                <label htmlFor="chat-input" className="sr-only">
                  {c.inputLabel}
                </label>
                <input
                  id="chat-input"
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={c.inputPlaceholder}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-cream/10 bg-ink-950 px-3.5 text-[14px] text-cream placeholder:text-cream/55 outline-none transition-colors focus:border-chat-400/60"
                />
                <button
                  type="submit"
                  aria-label={c.send}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-chat-500 text-on-accent shadow-chat transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <IconArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ from, children }) {
  const isBot = from === "bot";

  return (
    <motion.p
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={
        isBot
          ? "max-w-[88%] rounded-2xl rounded-tl-md bg-ink-800 px-3.5 py-2.5 text-[14px] leading-relaxed text-cream/85"
          : "ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-chat-500 px-3.5 py-2.5 text-[14px] leading-relaxed font-medium text-on-accent"
      }
    >
      {children}
    </motion.p>
  );
}

function Typing({ label }) {
  return (
    <p
      className="flex w-fit items-center gap-1.5 rounded-2xl rounded-tl-md bg-ink-800 px-3.5 py-3"
      aria-label={label}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
          className="h-1.5 w-1.5 rounded-full bg-cream/70"
        />
      ))}
    </p>
  );
}

function Plans({ plans }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="space-y-2.5"
    >
      {plans.items.map((plan) => (
        <div
          key={plan.name}
          className={`rounded-2xl border p-3.5 ${
            plan.badge
              ? "border-accent-400/45 bg-accent-400/[0.07]"
              : "border-cream/10 bg-ink-800"
          }`}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-[15.5px] font-bold text-fg">{plan.name}</p>
            <p className="font-display text-[15.5px] font-bold text-accent-icon">
              {plan.price}
              <span className="text-[12px] font-medium text-cream/58">{plan.period}</span>
            </p>
          </div>
          <p className="mt-1 text-[12.5px] text-cream/62">{plan.tagline}</p>
          {plan.badge && (
            <span className="mt-2 inline-block rounded-full bg-accent-400 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-on-accent">
              {plan.badge}
            </span>
          )}
          <ul className="mt-2.5 space-y-1.5">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-2 text-[13px] leading-snug text-cream/70">
                <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-icon" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="text-[12px] leading-relaxed text-cream/55">{plans.note}</p>
    </motion.div>
  );
}

function Handoff({ copy, whatsappUrl, onEmail }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="rounded-2xl bg-ink-800 p-3.5"
    >
      <p className="text-[13.5px] text-cream/75">{copy.intro}</p>
      <div className="mt-3 flex flex-col gap-2">
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-chat-500 px-3 py-2.5 text-[13.5px] font-semibold text-on-accent"
          >
            {copy.whatsapp}
            <IconArrowRight className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={onEmail}
          className="rounded-lg border border-cream/14 px-3 py-2.5 text-[13.5px] font-medium text-cream/80 transition-colors hover:border-cream/25 hover:text-fg"
        >
          {copy.email}
        </button>
      </div>
    </motion.div>
  );
}
