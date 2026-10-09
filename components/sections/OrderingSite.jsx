"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Chapter, Cards, Card, CardText, Callout, Checks, DataTable, Questions, TextLinks, NextStep } from "@/components/seo/Article";

/**
 * The second half of /web-de-pedidos, design B: how an order travels, how you
 * get paid, the honest note about traffic, the plan that includes the site
 * and the questions. The first half is `CustomSite`.
 */
export default function OrderingSite() {
  const { t } = useLanguage();
  const c = t.orderingSite;
  const negocioPlan = t.chat.plans.items[2];

  return (
    <>
      <Chapter title={c.flowTitle} intro={c.flowIntro}>
        <Cards cols={3}>
          {c.flow.map((item, i) => (
            <Card key={item.title} eyebrow={String(i + 1).padStart(2, "0")} title={item.title}>
              <CardText>{item.body}</CardText>
            </Card>
          ))}
        </Cards>
      </Chapter>

      <Chapter title={c.payTitle} intro={c.payIntro}>
        <DataTable accentCol={1} head={[c.payHeadMethod, c.payHeadCost, c.payHeadNote]} rows={c.payRows.map((r) => [r.method, r.cost, r.note])} />
      </Chapter>

      <Chapter>
        <Callout title={c.honestTitle} tone="warn">
          <p className="lb-ar-p">{c.honestBody}</p>
          <Checks items={c.traffic} />
        </Callout>
      </Chapter>

      <Chapter>
        <div className="lb-ar-plan lb-reveal">
          <div className="lb-ar-plan-head">
            <div style={{ minWidth: 0, maxWidth: 620 }}>
              <h2 className="lb-ar-callout-title">{c.planTitle}</h2>
              <p className="lb-ar-p" style={{ margin: "10px 0 0" }}>
                {c.planBody}
              </p>
            </div>
            <div className="lb-ar-plan-tag">
              <p className="lb-display lb-ar-plan-name">{negocioPlan.name}</p>
              <p className="lb-display lb-ar-plan-price">{negocioPlan.price}</p>
            </div>
          </div>
        </div>
      </Chapter>

      <Questions title={c.faqTitle} items={c.faq} />

      <NextStep title={c.ctaTitle} body={c.ctaBody} href="/precios" button={c.ctaButton} />

      <TextLinks
        links={[
          { href: "/vender-sin-comision", label: c.directLink },
          { href: "/carta-digital-qr", label: c.qrLink },
          { href: "/precios", label: c.pricingLink },
        ]}
      />
    </>
  );
}
