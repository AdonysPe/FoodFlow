"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import { BookingsTile, RoomTile } from "@/components/sections/Features";
import {
  ArticleHero,
  Chapter,
  Cards,
  Card,
  CardText,
  Callout,
  Checks,
  Demo,
  Questions,
  TextLinks,
  NextStep,
  fill,
  planPrices,
} from "@/components/seo/Article";

/**
 * /mesas-y-reservas: what a digital floor plan is for, the home page's room
 * and bookings tiles, what the module really does (zones, shapes, derived
 * status, overlap check, weekly view, QR sheet) and the honest limit: guests
 * can't book online on their own yet. `as` keeps the page's h1.
 */
export default function TablesGuide({ as }) {
  const { t } = useLanguage();
  const c = t.tablesGuide;
  const modules = t.landing.modules;
  const prices = planPrices(t);

  return (
    <>
      <ArticleHero as={as} eyebrow={c.eyebrow} title={c.title} description={c.description} path="/mesas-y-reservas" />

      <Chapter title={c.whatTitle} intro={c.whatIntro}>
        <Demo note={c.demoNote}>
          <RoomTile c={modules.room} />
          <BookingsTile c={modules.bookings} />
        </Demo>
      </Chapter>

      <Chapter title={c.cardsTitle}>
        <Cards cols={3}>
          {c.cards.map((card) => (
            <Card key={card.number} eyebrow={card.number} title={card.title}>
              <CardText>{card.body}</CardText>
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
          { href: "/pantalla-de-cocina", label: c.kitchenLink },
          { href: "/sistema-para-restaurantes", label: c.systemLink },
        ]}
      />
    </>
  );
}
