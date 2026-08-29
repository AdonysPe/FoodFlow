"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const LeadCaptureContext = createContext(null);

/**
 * Lets any button on the site open the lead form as a modal, and lets the
 * commission calculator hand its numbers to that same form.
 *
 * `payload` carries an optional `{ source, loss, variant }`:
 *   - source  "web_form" (default) or "calculadora"
 *   - loss    { mensual, anual } in whole soles, from the calculator
 *   - variant "default" or "exit" — the exit-intent copy, same fields
 */
export function LeadCaptureProvider({ children }) {
  const [request, setRequest] = useState(null);

  const openLeadForm = useCallback((payload = {}) => {
    setRequest({
      source: payload.source ?? "web_form",
      loss: payload.loss ?? null,
      variant: payload.variant ?? "default",
      at: Date.now(),
    });
  }, []);

  const closeLeadForm = useCallback(() => setRequest(null), []);

  const value = useMemo(
    () => ({ request, open: request !== null, openLeadForm, closeLeadForm }),
    [request, openLeadForm, closeLeadForm]
  );

  return (
    <LeadCaptureContext.Provider value={value}>{children}</LeadCaptureContext.Provider>
  );
}

export function useLeadCapture() {
  const ctx = useContext(LeadCaptureContext);
  if (!ctx) throw new Error("useLeadCapture must be used within a LeadCaptureProvider");
  return ctx;
}
