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

// Fired on `window` whenever the stored choice changes, same tab included
// (the native `storage` event only fires in *other* tabs). Anything that
// gates on `hasAnalyticsConsent()` — see components/Analytics.jsx — should
// also listen for this so accepting the banner takes effect without a reload.
export const CONSENT_EVENT = "foodflow-consent-change";

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
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

export function hasAnalyticsConsent() {
  return readConsent() === CONSENT.all;
}
