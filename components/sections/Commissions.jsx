"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ArticleHero, Chapter, Cards, Card, CardText, Callout, Ledger, Questions, TextLinks, NextStep, Fine } from "@/components/seo/Article";

/**
 * The commissions explainer, design B — the page a restaurant owner lands on
 * after typing "cuánto cobra Rappi de comisión" into Google.
 *
 * It answers the question first and sells second, which is the only way this
 * kind of page earns the position: someone comparing rates leaves the moment
 * it turns into a brochure. The pitch is the last block, after the reader has
 * what they came for.
 *
 * Every figure here is a RANGE, and the disclaimer at the bottom says so.
 * Real rates are negotiated venue by venue and change over time, so quoting a
 * single number as fact would be both wrong and the kind of claim a reader
 * can disprove with their own invoice.
 *
 * `as` follows the same contract as the other route-leading sections: the
 * page hands it "h1" because nothing above it on /comisiones-rappi-pedidosya
 * would otherwise be one.
 */
export default function Commissions({ as }) {
  const { t } = useLanguage();
  const c = t.commissions;

  return (
    <>
      <ArticleHero as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} />

      {/* ------------------------------------------------ what each app takes */}
      <Chapter title={c.ratesTitle} intro={c.ratesNote}>
        <Cards cols={3}>
          {c.rates.map((rate) => (
            <Card key={rate.app} eyebrow={rate.app} big={rate.range} hl={rate.highlight}>
              <CardText muted>{rate.label}</CardText>
              <CardText>{rate.detail}</CardText>
            </Card>
          ))}
        </Cards>
      </Chapter>

      {/* ------------------------------------------ what the percentage hides */}
      <Chapter title={c.hiddenTitle} intro={c.hiddenIntro}>
        <div className="lb-ar-hidden">
          {c.hidden.map((item, i) => (
            <div key={item.title} className="lb-ar-hidden-item lb-reveal">
              <span className="lb-display lb-ar-hidden-n" aria-hidden>
                {i + 1}
              </span>
              <div style={{ minWidth: 0 }}>
                <h3 className="lb-ar-card-title">{item.title}</h3>
                <p className="lb-ar-card-text">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Chapter>

      {/* --------------------------------------------------- worked example */}
      <Chapter title={c.exampleTitle}>
        <div className="lb-ar-example">
          <div className="lb-ar-plan lb-reveal" style={{ flex: "3 1 420px" }}>
            <p className="lb-ar-p" style={{ margin: 0 }}>
              {c.exampleIntro}
            </p>
            <Ledger rows={c.exampleRows} />
            <p className="lb-ar-example-foot">{c.exampleFooter}</p>
          </div>
          <div style={{ flex: "2 1 300px", minWidth: 0 }}>
            <Callout>
              <p className="lb-ar-p">{c.exampleAside}</p>
            </Callout>
          </div>
        </div>
      </Chapter>

      {/* -------------------------------------------------------- what to do */}
      <Chapter title={c.optionsTitle} intro={c.optionsIntro}>
        <Cards cols={2}>
          {c.options.map((opt) => (
            <Card key={opt.title} title={opt.title}>
              <CardText>{opt.body}</CardText>
            </Card>
          ))}
        </Cards>
        {/* The reader who got this far wants the how, not more of the what. */}
        <Link href="/vender-sin-comision" className="lb-text-link lb-ar-inline-link" style={{ marginTop: 24 }}>
          {c.optionsLinkLabel} ›
        </Link>
      </Chapter>

      {/* Open markup, not an accordion: these four answers are the ones the
          FAQPage schema declares, and Google wants them present in the HTML
          rather than behind a click. */}
      <Questions title={c.faqTitle} items={c.faq} />

      <NextStep title={c.ctaTitle} body={c.ctaBody} href="/calculadora" button={c.ctaButton} />

      <TextLinks links={[{ href: "/alternativa-a-rappi", label: t.rappiAlternative.eyebrow }]} />
      <Fine>
        {c.disclaimer}{" "}
        <Link href="/precios" className="lb-ar-underline">
          {t.pricing.eyebrow}
        </Link>
      </Fine>
    </>
  );
}
