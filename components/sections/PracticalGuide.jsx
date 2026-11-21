"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ArticleHero, Chapter, Cards, Card, CardText, Callout, Checks, DataTable, Questions, TextLinks, Fine } from "@/components/seo/Article";

/**
 * The shape shared by the three practical guides (boleta electrónica, Yape y
 * Plin, Libro de Reclamaciones): the reader's question answered first, then
 * whatever of these blocks the guide's copy provides, in this order — cards,
 * steps, a checklist, a comparison, a warning, the open questions, the links
 * and the sources. A block with no copy renders nothing, so each guide is only
 * its dictionary entry (lib/i18n/dictionaries.js, found by `contentKey`) plus a
 * page.
 */
export default function PracticalGuide({ as, contentKey, path }) {
  const { t } = useLanguage();
  const c = t[contentKey];

  return (
    <>
      <ArticleHero as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} path={path} />

      <Chapter title={c.whatTitle} intro={c.whatIntro} />

      {c.cards && (
        <Chapter title={c.cardsTitle}>
          <Cards cols={3}>
            {c.cards.map((card) => (
              <Card key={card.title} eyebrow={card.eyebrow} title={card.title}>
                <CardText>{card.body}</CardText>
              </Card>
            ))}
          </Cards>
        </Chapter>
      )}

      {c.steps && (
        <Chapter title={c.stepsTitle}>
          <Cards cols={3}>
            {c.steps.map((step) => (
              <Card key={step.number} eyebrow={step.number} title={step.title}>
                <CardText>{step.body}</CardText>
              </Card>
            ))}
          </Cards>
        </Chapter>
      )}

      {c.list && (
        <Chapter title={c.listTitle}>
          <Checks items={c.list} />
        </Chapter>
      )}

      {c.compareRows && (
        <Chapter title={c.compareTitle}>
          <DataTable head={c.compareHead} rows={c.compareRows} accentCol={-1} minWidth={560} />
        </Chapter>
      )}

      {c.notForTitle && (
        <Chapter>
          <Callout title={c.notForTitle} tone="warn">
            <p className="lb-ar-p">{c.notForBody}</p>
          </Callout>
        </Chapter>
      )}

      <Questions title={c.faqTitle} items={c.faq} />

      <TextLinks links={c.links} />

      {c.fine && <Fine>{c.fine}</Fine>}
    </>
  );
}
