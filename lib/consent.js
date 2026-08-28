/**
 * Cookie consent, kept deliberately small.
 *
 * The site only sets what it needs to work (the session cookie when you sign
 * in, the language preference in local storage), so the banner is honest
 * information rather than a gate. The stored choice is what any future
 * measurement script must check before it loads: call `hasAnalyticsConsent()`
 * and do nothing when it is false.
 */
export const CONSENT_KEY = "foodflow-cookie-consent";

export const CONSENT = {
  all: "all",
  necessary: "necessary",
};

export function readConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    // Private mode or blocked storage: treat it as "not decided yet".
    return null;
  }
}

export function saveConsent(value) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Nothing to do — the banner simply shows again next visit.
  }
}

export function hasAnalyticsConsent() {
  return readConsent() === CONSENT.all;
}
