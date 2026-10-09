"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ArticleHero, Chapter, Callout, Checks, DataTable, Questions, TextLinks, NextStep } from "@/components/seo/Article";

/**
 * /alternativa-a-rappi, design B: the honest comparison first (what Rappi
 * gives, what it costs), then what a channel of your own is and is not.
 * `as` is forwarded so the page keeps the h1.
 */
export default function RappiAlternative({ as }) {
  const { t } = useLanguage();
  const c = t.rappiAlternative;
  const negocioPlan = t.chat.plans.items[2];

  return (
    <>
      <ArticleHero as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} />

      <Chapter>
        <Callout title={c.truthTitle}>
          <p className="lb-ar-p">{c.truthBody}</p>
        </Callout>
      </Chapter>

      <Chapter title={c.compareTitle}>
        <DataTable
          accentCol={2}
          minWidth={720}
          head={[c.compareHead, "Rappi", "FoodFlow"]}
          rows={c.rows.map((row) => [row.label, row.rappi, row.foodflow === "{price}" ? negocioPlan.price : row.foodflow])}
        />
      </Chapter>

      <Chapter>
        <Callout title={c.loseTitle} tone="warn">
          <p className="lb-ar-p">{c.loseIntro}</p>
          <Checks items={c.losses} cols={3} />
        </Callout>
      </Chapter>

      <Chapter>
        <Callout title={c.bothTitle} tone="card">
          <p className="lb-ar-p">{c.bothBody}</p>
        </Callout>
      </Chapter>

      <Questions title={c.faqTitle} items={c.faq} />

      <NextStep title={c.ctaTitle} body={c.ctaBody} href="/calculadora" button={c.ctaButton} />

      <TextLinks
        links={[
          { href: "/comisiones-rappi-pedidosya", label: c.commissionsLink },
          { href: "/vender-sin-comision", label: c.directLink },
        ]}
      />
    </>
  );
}
