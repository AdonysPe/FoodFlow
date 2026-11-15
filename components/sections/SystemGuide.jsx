"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Kitchen, OwnerPanel, Phone } from "@/components/sections/Showcase";
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
 * /sistema-para-restaurantes, the pillar page: what a restaurant system does,
 * the home page's three-screen demo, one card per module linking to its own
 * guide, a buyer's checklist that applies to any provider (and FoodFlow's
 * answers to it), the three plans and who it is not for. `as` keeps the h1.
 */
export default function SystemGuide({ as }) {
  const { t } = useLanguage();
  const c = t.systemGuide;
  const story = t.landing.story;
  const plans = t.pricing.page.plans;
  const prices = planPrices(t);
  const planPrice = [prices.carta, prices.servicio, prices.negocio];

  return (
    <>
      <ArticleHero as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} path="/sistema-para-restaurantes" />

      <Chapter title={c.whatTitle} intro={c.whatIntro}>
        <Demo note={c.demoNote}>
          <DemoCard label={c.demoLabels[0]}>
            <Phone phone={story.phone} />
          </DemoCard>
          <DemoCard label={c.demoLabels[1]}>
            <Kitchen kitchen={story.kitchen} />
          </DemoCard>
          <DemoCard label={c.demoLabels[2]}>
            <OwnerPanel panel={story.panel} />
          </DemoCard>
        </Demo>
      </Chapter>

      <Chapter title={c.modulesTitle}>
        <Cards cols={3}>
          {c.modules.map((module) => (
            <Card key={module.href + module.title} title={module.title}>
              <CardText muted>{module.body}</CardText>
              <Link href={module.href} className="lb-text-link" style={{ marginTop: "auto" }}>
                {c.moduleLink} ›
              </Link>
            </Card>
          ))}
        </Cards>
      </Chapter>

      <Chapter title={c.chooseTitle} intro={c.chooseIntro}>
        <Checks items={c.choose} />
        <Callout title={c.answersTitle}>
          <Checks items={c.answers.map((line) => fill(line, prices))} />
        </Callout>
      </Chapter>

      <Chapter title={c.plansTitle}>
        <Cards cols={3}>
          {plans.map((plan, i) => (
            <Card key={plan.name} eyebrow={plan.users} big={planPrice[i]} title={plan.name} hl={i === 1}>
              <CardText muted>{plan.pitch}</CardText>
            </Card>
          ))}
        </Cards>
      </Chapter>

      <NextStep title={c.plansButton} body={t.pricing.page.sub} href="/precios" button={c.pricingLink} />

      <Chapter>
        <Callout title={c.notForTitle} tone="warn">
          <p className="lb-ar-p">{c.notForBody}</p>
        </Callout>
      </Chapter>

      <Questions title={c.faqTitle} items={c.faq.map((item) => ({ q: item.q, a: fill(item.a, prices) }))} />

      <TextLinks
        links={[
          { href: "/precios", label: c.pricingLink },
          { href: "/calculadora", label: c.calculatorLink },
        ]}
      />
    </>
  );
}
