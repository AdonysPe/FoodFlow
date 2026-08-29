/**
 * Two flags kept in local storage, both about not repeating ourselves:
 * whether this visitor already left their details, and whether they have
 * already seen the notice that appears when they move to leave.
 *
 * Every access is wrapped: private windows and blocked storage throw on
 * read, and a visitor with storage off should still get a working page.
 */
export const LEAD_SENT_KEY = "foodflow-lead-sent";
export const EXIT_INTENT_KEY = "foodflow-exit-intent";

export function readFlag(key) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeFlag(key) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // Storage is off: the flag simply does not survive the visit.
  }
}
