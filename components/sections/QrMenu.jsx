"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ArticleHero, Chapter, Cards, Card, CardText, Callout, Checks, Questions, TextLinks, NextStep } from "@/components/seo/Article";

/**
 * /carta-digital-qr, design B: how a QR carta works, the demo, what the Carta
 * plan includes, when it is not needed and the questions people ask. `as` is
 * forwarded so the page keeps the h1.
 */
export default function QrMenu({ as }) {
  const { t } = useLanguage();
  const c = t.qrMenu;
  const cartaPlan = t.chat.plans.items[0];

  return (
    <>
      <ArticleHero as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} />

      <Chapter>
        <Cards cols={3}>
          {c.steps.map((step) => (
            <Card key={step.number} eyebrow={step.number} title={step.title}>
              <CardText>{step.body}</CardText>
            </Card>
          ))}
        </Cards>
      </Chapter>

      <NextStep title={c.demoTitle} body={c.demoBody} href="/carta/tanta" button={c.demoButton} />

      <Chapter title={c.planTitle}>
        <div className="lb-ar-plan lb-reveal">
          <div className="lb-ar-plan-head">
            <div>
              <p className="lb-display lb-ar-plan-name">{cartaPlan.name}</p>
              <p className="lb-ar-card-text is-muted" style={{ margin: "4px 0 0" }}>
                {cartaPlan.tagline}
              </p>
            </div>
            <p className="lb-display lb-ar-plan-price">{cartaPlan.price}</p>
          </div>
          <Checks items={c.includes} />
        </div>
      </Chapter>

      <Chapter>
        <Callout title={c.notForTitle} tone="warn">
          <p className="lb-ar-p">{c.notForBody}</p>
        </Callout>
      </Chapter>

      <NextStep title={c.ctaTitle} body={c.ctaBody} href="/precios" button={c.ctaButton} />

      <Questions title={c.faqTitle} items={c.faq} />

      <TextLinks
        links={[
          { href: "/precios", label: c.pricingLink },
          { href: "/web-de-pedidos", label: c.orderingLink },
        ]}
      />
    </>
  );
}
