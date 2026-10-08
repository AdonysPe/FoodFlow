"use client";

import { useLanguage } from "@/lib/i18n/LanguageContext";
import Image from "next/image";

const PHOTO = {
  ceviche: "/demo/carta/ceviche.webp",
  arroz: "/demo/carta/arroz-con-mariscos.webp",
  lomo: "/demo/carta/lomo-saltado.webp",
  chicha: "/demo/carta/chicha-morada.webp",
};

function Check({ color = "#d4401d", size = 14, width = 2.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

// Table states in the room grid: busy, free, or animated (with its delay).
const ROOM = [
  { s: "busy", seats: 2 },
  { s: "busy", seats: 4 },
  { s: "anim", seats: 4, delay: "-6s" },
  { s: "free", seats: 2 },
  { s: "anim", seats: 4, delay: "0s", focus: true },
  { s: "free", seats: 6 },
  { s: "busy", seats: 4 },
  { s: "anim", seats: 2, delay: "-3s" },
  { s: "free", seats: 2 },
  { s: "busy", seats: 4 },
  { s: "busy", seats: 4 },
  { s: "busy", seats: 6 },
];
const BOOKINGS = [
  { left: "12.5%", bg: "#3a302b", fg: "#f3efe6", weight: 400 },
  { left: "37.5%", bg: "#ff5a33", fg: "#0c0908", weight: 600 },
  { left: "50%", bg: "#f3efe6", fg: "#0c0908", weight: 600 },
];

/**
 * "Todo el turno, en un solo lugar." — five tiles, each with a small moving
 * picture of the thing it promises: the synced menu, the live room, who sees
 * what, the ordering site and the bookings. Keeps the #features anchor the
 * shared navbar points at.
 */
export default function Features() {
  const { t } = useLanguage();
  const m = t.landing.modules;
  return (
    <section id="modulos" className="lb-section" style={{ paddingTop: undefined }}>
      <span id="features" className="lb-anchor" aria-hidden />
      <div className="lb-wrap">
        <h2 className="lb-h2 lb-reveal" style={{ maxWidth: 820 }}>
          {m.title}
          <br />
          <span>{m.titleMuted}</span>
        </h2>
        <div className="lb-row lb-modules">
          <MenuTile c={m.menu} />
          <RoomTile c={m.room} />
          <TeamTile c={m.team} />
          <WebTile c={m.web} />
          <BookingsTile c={m.bookings} />
        </div>
      </div>
    </section>
  );
}

function MenuTile({ c }) {
  return (
    <div className="lb-card lb-mod-big lb-reveal">
      <span className="lb-eyebrow">{c.eyebrow}</span>
      <h3 className="lb-mod-title-lg" style={{ margin: 0 }}>
        {c.title}
      </h3>
      <span className="lb-mod-text">{c.copy}</span>
      <div className="lb-inset" style={{ marginTop: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="lb-screen-head">
          <span>{c.panelLabel}</span>
          <span>{c.panel}</span>
        </div>
        <div className="lb-menu-row">
          <Image src={PHOTO.ceviche} alt={c.dishes[0]} width={36} height={36} sizes="36px" loading="lazy" decoding="async" />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 550 }}>{c.dishes[0]}</span>
          <span style={{ fontSize: 12, color: "#a39b90" }}>{c.available}</span>
          <span className="lb-switch" style={{ background: "#ff5a33" }}>
            <i style={{ transform: "translateX(20px)" }} />
          </span>
        </div>
        <div className="lb-menu-row" style={{ border: "1px solid rgba(255,90,51,0.35)" }}>
          <Image src={PHOTO.arroz} alt={c.dishes[1]} width={36} height={36} sizes="36px" loading="lazy" decoding="async" />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 550 }}>{c.dishes[1]}</span>
          <span className="lb-stack" style={{ justifyItems: "end", fontSize: 12 }}>
            <span className="cyc lbl1" style={{ color: "#a39b90" }}>
              {c.available}
            </span>
            <span className="cyc lbl2" style={{ color: "#ff7a57", fontWeight: 550 }}>
              {c.soldOutToday}
            </span>
          </span>
          <span className="lb-switch cyc track">
            <i className="cyc knob" />
          </span>
        </div>
        <div className="lb-mono" style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 2px", fontSize: 11, letterSpacing: "0.06em", color: "#8a8278", textTransform: "uppercase" }}>
          <span style={{ flex: 1, height: 1, background: "rgba(243,239,230,0.1)" }} />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
          {c.reaches}
          <span style={{ flex: 1, height: 1, background: "rgba(243,239,230,0.1)" }} />
        </div>
        <div className="lb-tables3">
          {c.tables.map((table, i) => (
            <div key={i} className="lb-table-card">
              <span className="lb-mono" style={{ fontSize: 11, fontWeight: 600, color: "#d7d0c5", padding: "0 2px", textTransform: "uppercase" }}>
                {table}
              </span>
              <div style={{ position: "relative", borderRadius: 10, overflow: "hidden" }}>
                <Image className="cyc dish" src={PHOTO.arroz} alt="" width={160} height={70} sizes="(max-width: 640px) 28vw, (max-width: 1040px) 26vw, 160px" loading="lazy" decoding="async" style={{ animationDelay: `${0.1 + i * 0.2}s` }} />
                <span className="lb-sold cyc badge" style={{ animationDelay: `${0.1 + i * 0.2}s` }}>
                  {c.soldOut}
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#a39b90", padding: "0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.dishes[1]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoomTile({ c }) {
  const dots = [
    { background: "#f3efe6" },
    { background: "#ff5a33" },
    { border: "1.5px solid #a39b90" },
  ];
  return (
    <div className="lb-card lb-mod-big lb-reveal">
      <span className="lb-eyebrow">{c.eyebrow}</span>
      <h3 className="lb-mod-title-lg" style={{ margin: 0 }}>
        {c.title}
      </h3>
      <span className="lb-mod-text">{c.copy}</span>
      <div className="lb-inset" style={{ marginTop: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="lb-screen-head">
          <span>{c.name}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span className="lb-dot lb-pulse" />
            {c.live}
          </span>
        </div>
        <div className="lb-room">
          {ROOM.map((table, i) => (
            <span
              key={i}
              className={`tb${table.s === "busy" ? " is-busy" : ""}${table.s === "anim" ? " tbl" : ""}`}
              style={{
                animationDelay: table.delay,
                outline: table.focus ? "1px dashed rgba(255,122,87,0.6)" : undefined,
                outlineOffset: table.focus ? 3 : undefined,
              }}
            >
              <span className="tbn">{String(i + 1).padStart(2, "0")}</span>
              <span className="tbs">
                {table.seats} {c.people}
              </span>
            </span>
          ))}
        </div>
        <div className="lb-feed" role="status">
          {c.feed.map((line, i) => (
            <span key={i} className={`fd fd${i + 1}`}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", boxSizing: "border-box", flexShrink: 0, ...dots[i] }} />
              <span>
                <strong style={{ fontWeight: 600 }}>{c.table}</strong> · {line}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="lb-legend">
        {c.legend.map((label, i) => (
          <span key={i}>
            <i style={[{ background: "#f3efe6" }, { background: "#ff5a33" }, { border: "1.5px solid rgba(243,239,230,0.35)" }][i]} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function TeamTile({ c }) {
  const views = ["vA", "vB", "vC"];
  const mods = ["mA", "mAB", "mAB", "mAC", "mA", "mA"];
  const roles = ["rA", "rB", "rC"];
  return (
    <div className="lb-card lb-mod-small lb-reveal">
      <span className="lb-eyebrow">{c.eyebrow}</span>
      <h3 className="lb-mod-title" style={{ margin: 0 }}>
        {c.title}
      </h3>
      <div className="lb-inset" style={{ flex: 1, marginTop: 4, borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>
        <span className="lb-stack lb-mono" style={{ fontSize: 11, letterSpacing: "0.06em", color: "#a39b90", textTransform: "uppercase" }}>
          {c.views.map((v, i) => (
            <span key={i} className={`rc ${views[i]}`}>
              {v}
            </span>
          ))}
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, fontSize: 12, fontWeight: 550, textAlign: "center" }}>
          {c.modules.map((mod, i) => (
            <span key={i} className={`rc mod ${mods[i]}`}>
              {mod}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
        {c.roles.map((r, i) => (
          <div key={i} className={`rc rl ${roles[i]}`}>
            <span style={{ fontWeight: 550 }}>{r.role}</span>
            <span style={{ color: "#a39b90" }}>{r.sees}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WebTile({ c }) {
  const photos = [PHOTO.lomo, PHOTO.chicha];
  return (
    <div className="lb-card lb-mod-small lb-reveal">
      <span className="lb-eyebrow">{c.eyebrow}</span>
      <h3 className="lb-mod-title" style={{ margin: 0 }}>
        {c.title}
      </h3>
      <span className="lb-mod-text-sm">{c.copy}</span>
      <div className="lb-inset" style={{ position: "relative", flex: 1, marginTop: 4, borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 230 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 12px", borderBottom: "1px solid rgba(243,239,230,0.07)" }}>
          {[0, 1, 2].map((d) => (
            <span key={d} style={{ width: 8, height: 8, borderRadius: "50%", background: "#3a302b" }} />
          ))}
          <span className="lb-mono" style={{ marginLeft: 8, flex: 1, minWidth: 0, textAlign: "center", fontSize: 10, color: "#a39b90", background: "#16110f", borderRadius: 6, padding: "3px 6px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {c.url}
          </span>
        </div>
        <div style={{ flex: 1, padding: 12, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", background: "#16110f", borderRadius: 999, padding: 3, fontSize: 12, fontWeight: 550, textAlign: "center" }}>
            <span className="wc wA" style={{ borderRadius: 999, padding: "6px 0" }}>
              {c.modes[0]}
            </span>
            <span className="wc wB" style={{ borderRadius: 999, padding: "6px 0" }}>
              {c.modes[1]}
            </span>
          </div>
          {c.items.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <Image src={photos[i]} alt="" width={30} height={30} sizes="30px" loading="lazy" decoding="async" style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover" }} />
              <span style={{ flex: 1 }}>{item.name}</span>
              <span style={{ color: "#a39b90" }}>{item.price}</span>
            </div>
          ))}
          <div className="wc wpress" style={{ marginTop: 2, background: "#ff5a33", color: "#0c0908", borderRadius: 12, padding: "10px 12px", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
            <span>{c.order}</span>
            <span>{c.total}</span>
          </div>
        </div>
        <div className="wc wtoast" style={{ position: "absolute", left: 10, right: 10, bottom: 10, background: "#f3efe6", color: "#1c1a18", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, boxShadow: "0 14px 30px -10px rgba(0,0,0,0.8)" }}>
          <Check />
          <span style={{ flex: 1 }}>{c.toast}</span>
          <span style={{ fontWeight: 500, color: "#5f5a54" }}>{c.toastTo}</span>
        </div>
      </div>
    </div>
  );
}

function BookingsTile({ c }) {
  return (
    <div className="lb-card lb-mod-small lb-reveal">
      <span className="lb-eyebrow">{c.eyebrow}</span>
      <h3 className="lb-mod-title" style={{ margin: 0 }}>
        {c.title}
      </h3>
      <span className="lb-mod-text-sm">{c.copy}</span>
      <div className="lb-inset" style={{ flex: 1, marginTop: 4, borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
        <div className="lb-screen-head" style={{ letterSpacing: "0.06em" }}>
          <span>{c.tonight}</span>
          <span>{c.summary}</span>
        </div>
        <div className="lb-mono" style={{ display: "flex", paddingLeft: 58, fontSize: 10, color: "#8a8278", justifyContent: "space-between" }}>
          {["19", "20", "21", "22", "23"].map((hour) => (
            <span key={hour}>{hour}</span>
          ))}
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 8 }}>
          {c.rows.map((row, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="lb-book-label">{row.table}</span>
              <span className="lb-book-track">
                <span className="lb-book" style={{ left: BOOKINGS[i].left, width: "37.5%", background: BOOKINGS[i].bg, color: BOOKINGS[i].fg, fontWeight: BOOKINGS[i].weight }}>
                  {row.who}
                </span>
              </span>
            </div>
          ))}
          <div aria-hidden style={{ position: "absolute", top: -6, bottom: -4, left: 58, right: 0, pointerEvents: "none" }}>
            <span className="nowline" style={{ position: "absolute", top: 0, bottom: 0, width: 2, marginLeft: -1, background: "#ff7a57", borderRadius: 2, boxShadow: "0 0 10px rgba(255,90,51,0.7)" }}>
              <span style={{ position: "absolute", top: -4, left: -3, width: 8, height: 8, borderRadius: "50%", background: "#ff7a57" }} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
