"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import {
  ArticleHero,
  Chapter,
  Cards,
  Card,
  CardText,
  Callout,
  Checks,
  Questions,
  TextLinks,
  fill,
  planPrices,
} from "@/components/seo/Article";

/**
 * /piloto: the 48-hour pilot, spelled out — the three moments (call, setup,
 * first shift), what the spot includes, what we need from the restaurant,
 * what happens after (7-day trial, no minimum term, data export) and who it
 * is for. Every promise here is one the site already makes elsewhere (the
 * chat's "piloto" answer, the pricing add-ons); nothing new is invented.
 * The page closes on PilotClosing, which opens the lead form.
 */
export default function PilotGuide({ as }) {
  const { t } = useLanguage();
  const c = t.pilotGuide;
  const prices = planPrices(t);

  return (
    <>
      <ArticleHero as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} path="/piloto" />

      <Chapter title={c.stepsTitle}>
        <Cards cols={3}>
          {c.steps.map((step) => (
            <Card key={step.number} eyebrow={step.number} title={step.title}>
              <CardText>{step.body}</CardText>
            </Card>
          ))}
        </Cards>
      </Chapter>

      <Chapter title={c.includesTitle}>
        <Checks items={c.includes} />
      </Chapter>

      <Chapter title={c.needTitle}>
        <Checks items={c.need} />
      </Chapter>

      <Chapter title={c.afterTitle}>
        <Cards cols={3}>
          {c.after.map((item) => (
            <Card key={item.number} eyebrow={item.number} title={item.title}>
              <CardText>{item.body}</CardText>
            </Card>
          ))}
        </Cards>
      </Chapter>

      <Chapter>
        <Callout title={c.forTitle}>
          <p className="lb-ar-p">{c.forBody}</p>
        </Callout>
      </Chapter>

      <Questions title={c.faqTitle} items={c.faq.map((item) => ({ q: item.q, a: fill(item.a, prices) }))} />

      <TextLinks
        links={[
          { href: "/precios", label: c.pricingLink },
          { href: "/sistema-para-restaurantes", label: c.systemLink },
          { href: "/nosotros", label: c.aboutLink },
        ]}
      />
    </>
  );
}
