"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { MenuTile } from "@/components/sections/Features";
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
  Questions,
  TextLinks,
  NextStep,
  fill,
  planPrices,
} from "@/components/seo/Article";

/**
 * /carta-digital-qr, design B. Guide first, product second: people who search
 * "carta digital QR" mostly want to know how to make one, so the page opens
 * with the four steps (true with any tool), PDF vs Instagram vs a web menu
 * and the printed backup, and only then shows how FoodFlow does it — the
 * synced-menu demo, the three set-up steps, the public demo carta, the Carta
 * plan and when it isn't needed. `as` is forwarded so the page keeps the h1.
 */
export default function QrMenu({ as }) {
  const { t } = useLanguage();
  const c = t.qrMenu;
  const cartaPlan = t.chat.plans.items[0];
  const prices = planPrices(t);

  return (
    <>
      <ArticleHero as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} />

      <Chapter title={c.howTitle} intro={c.howIntro}>
        <Cards cols={2}>
          {c.how.map((step) => (
            <Card key={step.number} eyebrow={step.number} title={step.title}>
              <CardText>{step.body}</CardText>
            </Card>
          ))}
        </Cards>
      </Chapter>

      <Chapter title={c.formatTitle}>
        <DataTable head={c.formatHead} rows={c.formatRows.map((row) => row.map((cell) => fill(cell, prices)))} accentCol={3} minWidth={680} />
      </Chapter>

      <Chapter>
        <Callout title={c.backupTitle}>
          <p className="lb-ar-p">{c.backupBody}</p>
        </Callout>
      </Chapter>

      <Chapter>
        <Demo note={c.demoNote}>
          <MenuTile c={t.landing.modules.menu} />
        </Demo>
      </Chapter>

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
          { href: "/sistema-para-restaurantes", label: t.comandaGuide.systemLink },
        ]}
      />
    </>
  );
}
