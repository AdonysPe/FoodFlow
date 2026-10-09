"use client";

import RestaurantSitePreview from "@/components/RestaurantSitePreview";
import { Card, CardText, Cards } from "@/components/seo/Article";
import { useLanguage } from "@/lib/i18n/LanguageContext";

/**
 * The head of /web-de-pedidos, design B: the title, the "0% de comisión"
 * line and the three things the site does on the left; a phone with the
 * customer's own site on the right. `as` is forwarded so the page keeps
 * the h1.
 */
export default function CustomSite({ as: Heading = "h1" }) {
  const { t } = useLanguage();
  const c = t.customSite;
  const words = c.title.split(" ");

  return (
    <section id="customer-site" className="lb-pr-hero lb-pr-hero--left">
      <div className="lb-glow" aria-hidden style={{ top: 10, height: 460 }} />
      <div className="lb-pr-block lb-ar-split">
        <div className="lb-ar-split-text">
          <p className="lb-eyebrow-accent lb-rise">
            {c.productName} · {c.eyebrow}
          </p>
          <Heading className="lb-pr-h1">
            {words.map((w, i) => (
              <span key={i}>
                <span className="lb-word" style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
                  {w}
                </span>
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
            {!/[?!.…]$/.test(c.title) && <span style={{ color: "#ff5a33" }}>.</span>}
          </Heading>
          <p className="lb-ar-lead lb-rise" style={{ animationDelay: ".5s" }}>
            {c.description}
          </p>
          <p className="lb-ar-lead lb-rise" style={{ animationDelay: ".6s", color: "#ff7a57", fontWeight: 550, marginTop: 14 }}>
            {c.commission}
          </p>
        </div>

        <div className="lb-ar-split-phone lb-rise" style={{ animationDelay: ".4s" }}>
          <p className="lb-mono lb-ar-card-eyebrow" style={{ textAlign: "center", marginBottom: 16 }}>
            {c.productName} · {c.demo.brand}
          </p>
          <RestaurantSitePreview />
        </div>
      </div>

      <div className="lb-pr-block" style={{ paddingTop: 56 }}>
        <Cards cols={3}>
          {c.items.map((item, i) => (
            <Card key={i} eyebrow={String(i + 1).padStart(2, "0")} title={item.title}>
              <CardText>{item.copy}</CardText>
            </Card>
          ))}
        </Cards>
        <p className="lb-ar-fine" style={{ padding: 0, marginTop: 20 }}>
          {c.footnote}
        </p>
      </div>
    </section>
  );
}
