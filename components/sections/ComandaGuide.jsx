"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Kitchen, Phone } from "@/components/sections/Showcase";
import {
  ArticleHero,
  Chapter,
  Cards,
  Card,
  CardText,
  Callout,
  Checks,
  DataTable,
  Demo,
  DemoCard,
  Questions,
  TextLinks,
  NextStep,
  fill,
  planPrices,
} from "@/components/seo/Article";

/**
 * /comanda-digital: answers "what is a digital comanda" first (the searcher's
 * question), then shows the order travelling from the phone to the kitchen
 * with the home page's own demo, what FoodFlow's comanda really does, paper
 * against digital, and when it isn't worth it. `as` keeps the page's h1.
 */
export default function ComandaGuide({ as }) {
  const { t } = useLanguage();
  const c = t.comandaGuide;
  const story = t.landing.story;
  const prices = planPrices(t);

  return (
    <>
      <ArticleHero as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} path="/comanda-digital" />

      <Chapter title={c.whatTitle} intro={c.whatIntro}>
        <Demo note={c.demoNote}>
          <DemoCard label={c.demoLabels[0]}>
            <Phone phone={story.phone} />
          </DemoCard>
          <DemoCard label={c.demoLabels[1]}>
            <Kitchen kitchen={story.kitchen} />
          </DemoCard>
        </Demo>
      </Chapter>

      <Chapter title={c.stepsTitle}>
        <Cards cols={3}>
          {c.steps.map((step) => (
            <Card key={step.number} eyebrow={step.number} title={step.title}>
              <CardText>{step.body}</CardText>
            </Card>
          ))}
        </Cards>
      </Chapter>

      <Chapter title={c.doesTitle}>
        <Checks items={c.does} />
      </Chapter>

      <Chapter title={c.compareTitle}>
        <DataTable head={c.compareHead} rows={c.compareRows.map((row) => row.map((cell) => fill(cell, prices)))} accentCol={2} minWidth={560} />
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
          { href: "/pantalla-de-cocina", label: c.kitchenLink },
          { href: "/mesas-y-reservas", label: c.tablesLink },
          { href: "/sistema-para-restaurantes", label: c.systemLink },
        ]}
      />
    </>
  );
}
