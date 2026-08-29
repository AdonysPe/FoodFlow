"use client";

import { useEffect } from "react";
import { useLeadCapture } from "@/components/lead/LeadCaptureContext";
import {
  EXIT_INTENT_KEY,
  LEAD_SENT_KEY,
  readFlag,
  writeFlag,
} from "@/lib/leads/storage";

/** Long enough that a stray flick of the cursor on arrival does not count. */
const ARM_DELAY = 6000;

/**
 * The one attempt we make to catch someone on their way out: the cursor
 * leaves through the top of the window — towards the address bar or the tab
 * strip — and the lead form opens with its leaving copy.
 *
 * It fires once per visitor, never for someone who already left their
 * details, and never on touch devices, where "moving to leave" has no
 * equivalent and a popup would just be a popup.
 */
export default function ExitIntent() {
  const { openLeadForm } = useLeadCapture();

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (readFlag(EXIT_INTENT_KEY) || readFlag(LEAD_SENT_KEY)) return;

    let armed = false;
    const timer = setTimeout(() => {
      armed = true;
    }, ARM_DELAY);

    const onLeave = (event) => {
      if (!armed) return;
      // Only the top edge, and only a real exit: moving onto another element
      // inside the page also fires mouseout.
      if (event.relatedTarget || event.clientY > 0) return;
      // The chat panel and the form dialog both claim the screen already.
      if (document.querySelector('[role="dialog"]')) return;

      armed = false;
      writeFlag(EXIT_INTENT_KEY);
      openLeadForm({ variant: "exit" });
    };

    document.addEventListener("mouseout", onLeave);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [openLeadForm]);

  // Nothing to paint: the dialog it opens is already mounted in the shell.
  return null;
}
