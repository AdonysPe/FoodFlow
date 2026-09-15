# FoodFlow — landing page

Conversion-focused marketing site for a restaurant operations SaaS. Dark, glass,
one warm accent, motion used to explain rather than decorate.

## Stack

- **Next.js 15** (App Router, JS + JSX)
- **React 19**
- **Tailwind CSS v4** (CSS-first config — tokens live in `app/globals.css` under `@theme`)
- **Framer Motion 12** — scroll reveals, hover physics, scroll-linked transforms
- **Three.js** — ambient particle field behind the hero and final CTA

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000. `npm run build && npm start` for production.

## Structure

```
app/
  layout.jsx          fonts (Inter + Sora), metadata, skip link
  page.jsx            section composition
  globals.css         design tokens, base styles, custom utilities
components/
  MotionProvider.jsx  MotionConfig — honours prefers-reduced-motion
  OrderFlowBackground.jsx SVG order-flow field (Mesa/Web/WhatsApp -> Cocina)
  DashboardPreview.jsx the product shot — pure DOM + SVG, no screenshots
  sections/           Navbar, Hero, SocialProof, Features, Showcase,
                      HowItWorks, Benefits, CTA, Footer
  ui/                 Button, GlassCard, Reveal, SectionHeading, Container,
                      Badge, ScrollProgress, Icons
lib/
  motion.js           shared easing + variants (one curve for the whole page)
  chart.js            smoothed area-path maths for the dashboard chart
  useCountUp.js       rAF count-up that fires once on scroll into view
  i18n/
    dictionaries.js   all page copy, English and Spanish, mirrored key-for-key
    LanguageContext.jsx  provider + useLanguage() hook
```

## Language

The page ships in English and Spanish. `LanguageProvider` (wrapping the page in
`app/page.jsx`) holds the active language in a context, persists the choice to
`localStorage`, and sets `<html lang>` accordingly. `components/ui/LanguageToggle.jsx`
is the switch in the navbar (desktop and mobile). Every section reads its copy
from `useLanguage().t`, so adding a third language means adding one more entry
to `lib/i18n/dictionaries.js` — no component changes needed.

## Design decisions worth knowing

**One accent.** Everything is ink + white-at-low-opacity, with a single warm
amber (`--color-accent-*`) reserved for the primary action, live data and
positive deltas. A cool violet appears only in glows. This is what keeps the
"Start Free" button unmissable.

**One motion curve.** `lib/motion.js` exports a single easing and a small set of
variants. Every section reveals on the same curve and distance, which is the
difference between a page that feels authored and one that feels assembled.

**The dashboard is real markup.** `DashboardPreview` is built from DOM and SVG
rather than an image: it stays sharp on any display, animates its chart and bars
on scroll, and never goes stale when the product changes. It renders in two
variants (hero and showcase) from one component.

**The 3D layer is deliberately quiet.** The particle field caps DPR at 2, pauses
rendering when the tab is hidden or the canvas scrolls out of view, disposes its
geometry and material on unmount, falls back silently if WebGL is unavailable,
and renders a single static frame for users who prefer reduced motion.

## Accessibility

- `prefers-reduced-motion` is handled twice over: CSS for transitions/animations,
  and `MotionConfig reducedMotion="user"` for Framer Motion's JS-driven ones
  (CSS media queries do not reach those).
- Skip link, labelled form control, `aria-expanded` on the menu toggle, and
  `inert` on the closed mobile sheet so it stays out of the tab order.
- Decorative layers are `aria-hidden`; the dashboard carries a descriptive label.

## Wiring it up

The CTA form is demo-only — `onSubmit` in `components/sections/CTA.jsx` reads the
email off the form and flips to a success state. Point it at your signup
endpoint. Nav links, footer links and the logo marquee are placeholders.
