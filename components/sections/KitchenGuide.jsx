"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Kitchen } from "@/components/sections/Showcase";
import {
  ArticleHero,
  Chapter,
  Cards,
  Card,
  CardText,
  Callout,
  Checks,
  Demo,
  DemoCard,
  Questions,
  TextLinks,
  NextStep,
  fill,
  planPrices,
} from "@/components/seo/Article";

/**
 * /pantalla-de-cocina: what a KDS is, the home page's kitchen demo, the three
 * lanes the real board has (Nuevos, En el fuego, Listos para salir) with the
 * 8 / 15 minute colour change it really uses, and the honest limit: FoodFlow
 * doesn't print kitchen tickets today. `as` keeps the page's h1.
 */
export default function KitchenGuide({ as }) {
  const { t } = useLanguage();
  const c = t.kitchenGuide;
  const prices = planPrices(t);

  return (
    <>
      <ArticleHero as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} />

      <Chapter title={c.whatTitle} intro={c.whatIntro}>
        <Demo note={c.demoNote}>
          <DemoCard label={c.demoLabel}>
            <Kitchen kitchen={t.landing.story.kitchen} />
          </DemoCard>
        </Demo>
      </Chapter>

      <Chapter title={c.lanesTitle}>
        <Cards cols={3}>
          {c.lanes.map((lane) => (
            <Card key={lane.number} eyebrow={lane.number} title={lane.title}>
              <CardText>{lane.body}</CardText>
            </Card>
          ))}
        </Cards>
      </Chapter>

      <Chapter title={c.doesTitle}>
        <Checks items={c.does} />
      </Chapter>

      <Chapter>
        <Callout title={c.notForTitle} tone="warn">
          <p className="lb-ar-p">{c.notForBody}</p>
        </Callout>
      </Chapter>

      <NextStep title={c.planTitle} body={fill(c.planBody, prices)} href="/precios" button={c.planButton} />

      <Questions title={c.faqTitle} items={c.faq} />

      <TextLinks
        links={[
          { href: "/comanda-digital", label: c.comandaLink },
          { href: "/mesas-y-reservas", label: c.tablesLink },
          { href: "/sistema-para-restaurantes", label: c.systemLink },
        ]}
      />
    </>
  );
}
