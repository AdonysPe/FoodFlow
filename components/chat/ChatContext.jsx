"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ChatContext = createContext(null);

/**
 * Lets anything on the page open the chat — and optionally open it *on* a
 * question, e.g. `openChat("planes")` from a "see the plans" button.
 *
 * The request carries a timestamp so asking for the same topic twice still
 * registers as a new request in the widget's effect.
 */
export function ChatProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState(null);

  const openChat = useCallback((topicId = null) => {
    setOpen(true);
    if (topicId) setRequest({ topicId, at: Date.now() });
  }, []);

  const closeChat = useCallback(() => setOpen(false), []);
  const consumeRequest = useCallback(() => setRequest(null), []);

  const value = useMemo(
    () => ({ open, openChat, closeChat, request, consumeRequest }),
    [open, openChat, closeChat, request, consumeRequest]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within a ChatProvider");
  return ctx;
}
