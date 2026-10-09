"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ArticleHero, Chapter, Cards, Card, CardText, Callout, Checks, DataTable, Questions, TextLinks, NextStep, Fine } from "@/components/seo/Article";

/**
 * /vender-sin-comision, design B. Pairs with /comisiones-rappi-pedidosya:
 * that page is the diagnosis, this one is what to do about it. Channels,
 * how to get paid, who delivers, when the apps are still right, a four-week
 * plan and the questions. `as` is forwarded so the page keeps the h1.
 */
export default function SellDirect({ as }) {
  const { t } = useLanguage();
  const c = t.sellDirect;

  return (
    <>
      <ArticleHero as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} />

      <Chapter>
        <Callout title={c.costTitle}>
          <p className="lb-ar-p">{c.costBody}</p>
          <Link href="/comisiones-rappi-pedidosya" className="lb-text-link lb-ar-inline-link">
            {c.costLinkLabel} ›
          </Link>
        </Callout>
      </Chapter>

      <Chapter title={c.channelsTitle} intro={c.channelsIntro}>
        <div className="lb-ar-channels">
          {c.channels.map((ch) => (
            <div key={ch.step} className="lb-ar-channel lb-reveal">
              <span className="lb-display lb-ar-channel-n" aria-hidden>
                {ch.step}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 className="lb-ar-card-title">{ch.title}</h3>
                <p className="lb-ar-card-text">{ch.body}</p>
                {/* The trade-off, stated where the reader is deciding. */}
                <p className="lb-ar-card-text is-muted">{ch.catch}</p>
              </div>
              <div className="lb-ar-channel-cost">
                <span className="lb-mono lb-ar-card-eyebrow">{c.costLabel}</span>
                <span className="lb-display">{ch.cost}</span>
              </div>
            </div>
          ))}
        </div>
      </Chapter>

      <Chapter title={c.payTitle} intro={c.payIntro}>
        <DataTable accentCol={1} minWidth={620} head={[c.payHeadMethod, c.payHeadFee, c.payHeadNote]} rows={c.payRows.map((r) => [r.method, r.fee, r.note])} />
      </Chapter>

      <Chapter title={c.deliveryTitle} intro={c.deliveryIntro}>
        <Cards cols={3}>
          {c.delivery.map((item) => (
            <Card key={item.title} title={item.title}>
              <CardText>{item.body}</CardText>
            </Card>
          ))}
        </Cards>
      </Chapter>

      <Chapter>
        <Callout title={c.keepTitle} tone="card">
          <p className="lb-ar-p">{c.keepIntro}</p>
          <Checks items={c.keep} />
          <p className="lb-ar-keep-close">{c.keepClose}</p>
        </Callout>
      </Chapter>

      <Chapter title={c.planTitle} intro={c.planIntro}>
        <div className="lb-ar-weeks">
          {c.plan.map((week) => (
            <div key={week.week} className="lb-ar-week lb-reveal">
              <span className="lb-mono lb-ar-card-eyebrow" style={{ color: "#ff7a57" }}>
                {week.week}
              </span>
              <h3 className="lb-ar-card-title">{week.title}</h3>
              <p className="lb-ar-card-text">{week.body}</p>
            </div>
          ))}
        </div>
      </Chapter>

      <Questions title={c.faqTitle} items={c.faq} />

      <NextStep title={c.ctaTitle} body={c.ctaBody} href="/calculadora" button={c.ctaButton} />

      <TextLinks
        links={[
          { href: "/alternativa-a-rappi", label: t.rappiAlternative.eyebrow },
          { href: "/web-de-pedidos", label: t.orderingSite.eyebrow },
        ]}
      />
      <Fine>{c.disclaimer}</Fine>
    </>
  );
}
