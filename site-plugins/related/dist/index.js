// src/components/Related.tsx
import { pathToRoot, resolveRelative } from "@quartz-community/utils";

// src/components/Related.css
var Related_default = `.mw-related {
  margin-top: 2.5rem;
}

.mw-related section {
  margin-bottom: 2rem;
}

.mw-related h2 {
  margin: 0 0 0.8rem;
}

.mw-related ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mw-related li {
  margin: 0 0 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mw-related a.internal {
  background: none;
  padding: 0;
  font-weight: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

/* Affinity */
.mw-affinity {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.mw-affinity-card {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--lightgray);
  border-radius: 10px;
}

.mw-affinity-name {
  font-weight: 500;
  color: var(--dark);
}

/* Key NPCs */
.mw-npc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.8rem;
}

.mw-related a.mw-npc-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--lightgray);
  border-radius: 10px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s ease;
}

.mw-related a.mw-npc-card:hover {
  border-color: var(--secondary);
}

.mw-npc-card img,
.mw-npc-noimg {
  display: block;
  width: 100%;
  height: 150px;
  object-fit: cover;
  object-position: center top;
  margin: 0 !important;
  border-radius: 0 !important;
  background: var(--lightgray);
}

.mw-npc-name {
  padding: 0.5rem 0.7rem 0;
  font-weight: 500;
  color: var(--dark);
}

.mw-npc-role {
  padding: 0 0.7rem 0.6rem;
  font-size: 0.8rem;
  color: var(--gray);
}

/* Places and quests side by side */
.mw-related-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.mw-mini-chip {
  font-size: 0.7rem;
  text-transform: capitalize;
  padding: 0 0.5rem;
  border-radius: 6px;
  background: var(--lightgray);
  color: var(--darkgray);
}

/* Related handouts */
.mw-handouts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.8rem;
}

.mw-related a.mw-handout {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  text-decoration: none;
  color: var(--darkgray);
  font-size: 0.8rem;
  font-weight: 400;
  line-height: 1.3;
}

.mw-handout img {
  width: 100%;
  height: 180px;
  object-fit: contain;
  padding: 6px;
  box-sizing: border-box;
  background: #fff;
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  margin: 0 !important;
}

/* Moodboard: a masonry grid of the board's pins */
.mw-mood-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.mw-related a.mw-mood-link {
  font-size: 0.85rem;
  color: var(--secondary);
}

.mw-mood-grid {
  columns: 4 150px;
  column-gap: 8px;
}

.mw-related a.mw-mood-tile {
  display: block;
  break-inside: avoid;
  margin: 0 0 8px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--lightgray);
  background: var(--lightgray);
  text-decoration: none;
}

.mw-mood-tile img {
  display: block;
  width: 100%;
  height: auto;
  margin: 0 !important;
  border-radius: 0 !important;
  transition: transform 0.25s ease;
}

.mw-mood-tile:hover img {
  transform: scale(1.03);
}

.mw-mood-more summary {
  cursor: pointer;
  color: var(--secondary);
  font-size: 0.9rem;
  margin: 0.2rem 0 0.8rem;
}

/* Handouts page: a gallery of every handout, grouped under headings */
article.mw-handouts-page p:has(figure),
article.mw-handouts-page p:has(img) {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 1rem;
  align-items: start;
}

article.mw-handouts-page br {
  display: none;
}

.mw-handout-fig {
  margin: 0;
}

.mw-handout-fig a {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 220px;
  padding: 8px;
  border: 1px solid var(--lightgray);
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.2s ease;
}

.mw-handout-fig a:hover {
  border-color: var(--secondary);
}

.mw-handout-fig img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  margin: 0 !important;
  border-radius: 0 !important;
}

.mw-handout-fig figcaption {
  margin-top: 0.4rem;
  font-size: 0.85rem;
  line-height: 1.3;
  color: var(--darkgray);
}

/* Landing pages: a card for each page in the folder */
.mw-landing {
  margin-top: 0.5rem;
}

.mw-landing-overview {
  margin: 0 0 0.5rem;
}

.mw-landing-overview a.internal {
  background: none;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.mw-landing h2 {
  margin: 1.6rem 0 0.8rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--lightgray);
}

.mw-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
  gap: 1.1rem;
}

a.mw-card {
  display: flex;
  flex-direction: column;
  padding: 4px;
  border: 1.5px solid var(--secondary);
  border-radius: 10px;
  background: var(--light);
  color: var(--darkgray);
  font-weight: 400;
  text-decoration: none;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}

a.mw-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(90, 46, 30, 0.12);
}

.mw-card-inner {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--secondary) 35%, transparent);
  border-radius: 6px;
}

.mw-card-banner {
  height: 96px;
  background: center / cover no-repeat;
}

.mw-card-blank {
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-linear-gradient(
    135deg,
    color-mix(in srgb, var(--secondary) 7%, var(--light)) 0 10px,
    color-mix(in srgb, var(--secondary) 11%, var(--light)) 10px 20px
  );
}

.mw-card-blank img {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin: 0 !important;
}

.mw-card-blank span {
  font-family: var(--headerFont);
  font-size: 2rem;
  color: color-mix(in srgb, var(--secondary) 45%, transparent);
}

.mw-card-row {
  padding: 0.6rem 0.75rem;
  border-top: 1px solid var(--lightgray);
}

.mw-card-banner + .mw-card-row {
  border-top: none;
}

.mw-card-name {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.mw-card-sigil {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--secondary);
  border-radius: 50%;
  background: #fff;
  font-family: var(--headerFont);
  font-size: 0.9rem;
  color: var(--secondary);
}

.mw-card-sigil img {
  width: 74%;
  height: 74%;
  object-fit: contain;
  margin: 0 !important;
}

.mw-card-title {
  display: flex;
  flex-direction: column;
  font-family: var(--headerFont);
  font-size: 1.15rem;
  line-height: 1.2;
  color: var(--dark);
}

.mw-card-title small {
  margin-top: 2px;
  font-family: var(--bodyFont);
  font-size: 0.75rem;
  color: var(--gray);
}

.mw-card-themes {
  font-size: 0.8rem;
  letter-spacing: 0.03em;
  color: var(--gray);
}

.mw-card-themes span + span::before {
  content: "\u2022";
  margin: 0 0.4rem;
  color: var(--secondary);
}

.mw-card-more {
  margin-top: auto;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--secondary);
}

/* The cards replace Quartz's dated list on landing pages */
body:has(.mw-landing) .page-listing,
body:has(.mw-landing) .center > hr {
  display: none;
}

/* Phones: two smaller cards per row */
@media (max-width: 600px) {
  .mw-cards {
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }
  .mw-card-banner {
    height: 70px;
  }
  .mw-card-row {
    padding: 0.45rem 0.5rem;
  }
  .mw-card-name {
    gap: 0.4rem;
  }
  .mw-card-sigil {
    width: 26px;
    height: 26px;
    font-size: 0.75rem;
  }
  .mw-card-title {
    font-size: 0.98rem;
  }
  .mw-card-title small,
  .mw-card-themes,
  .mw-card-more {
    font-size: 0.7rem;
  }
}

/* Gallery: player art */
.mw-gallery-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.6rem 0.8rem;
  margin: 0.5rem 0 1.1rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--lightgray);
  border-radius: 10px;
}

.mw-gallery-filters label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gray);
}

.mw-gallery-filters select {
  min-width: 9.5rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  background: var(--light);
  color: var(--dark);
  font: inherit;
  font-size: 0.9rem;
  letter-spacing: normal;
  text-transform: none;
}

.mw-gallery-clear {
  padding: 0.3rem 0.2rem;
  border: none;
  background: none;
  color: var(--secondary);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.mw-gallery-count {
  margin-left: auto;
  padding-bottom: 0.35rem;
  font-size: 0.8rem;
  color: var(--gray);
}

/* Before the browser lays it out (or without JavaScript): plain columns */
.mw-gallery-grid {
  columns: 210px;
  column-gap: 14px;
}

.mw-gallery-grid.mw-masonry {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  columns: auto;
}

.mw-gcol {
  flex: 1 1 0;
  min-width: 0;
}

figure.mw-gcard {
  margin: 0 0 14px;
  break-inside: avoid;
  overflow: hidden;
  border: 1px solid var(--lightgray);
  border-radius: 10px;
}

.mw-masonry figure.mw-gcard {
  margin: 0 0 14px;
}

.mw-gcard[hidden] {
  display: none;
}

a.mw-gcard-img {
  display: block;
  padding: 0;
  background: none;
  line-height: 0;
}

/* The site skips drawing off-screen images (content-visibility: auto), which makes them
   measure as 0px tall. The masonry needs their real height. */
.mw-gcard-img img {
  content-visibility: visible;
  display: block;
  width: 100%;
  height: auto;
  margin: 0 !important;
  border-radius: 0;
}

.mw-gcard figcaption {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.55rem 0.7rem 0.65rem;
}

.mw-gcard-desc {
  line-height: 1.35;
}

.mw-gcard-by {
  font-size: 0.85rem;
  color: var(--secondary);
}

.mw-gcard-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}

.mw-gchip {
  padding: 0.05rem 0.5rem;
  border: 1px solid var(--lightgray);
  border-radius: 999px;
  background: none;
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--darkgray);
  text-decoration: none;
}

a.internal.mw-gchip {
  padding: 0.05rem 0.5rem;
  background: none;
  font-weight: 400;
}

.mw-gchip-char {
  border-color: color-mix(in srgb, var(--secondary) 45%, transparent);
  color: color-mix(in srgb, var(--secondary) 75%, var(--darkgray));
}

.mw-gcard-date {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--gray);
}

@media (max-width: 600px) {
  .mw-gallery-filters label {
    flex: 1 1 40%;
  }
  .mw-gallery-filters select {
    min-width: 0;
    width: 100%;
  }
  .mw-gallery-grid.mw-masonry {
    gap: 8px;
  }
  .mw-masonry figure.mw-gcard {
    margin-bottom: 8px;
  }
  .mw-gcard figcaption {
    padding: 0.4rem 0.5rem 0.5rem;
    font-size: 0.85rem;
  }
}

.mw-quest-status { color: var(--gray); font-size: 0.8em; }
`;

// src/components/Related.tsx
import { jsx, jsxs } from "preact/jsx-runtime";
var props = (f) => f.frontmatter ?? {};
var titleOf = (f) => String(props(f).title ?? String(f.slug).split("/").pop());
var linkTarget = (v) => typeof v === "string" ? v.match(/^\[\[([^\]|]+)/)?.[1] : void 0;
var isPage = (f) => !!f.slug && String(f.slug) !== "index" && props(f).mw_folder !== true;
var TONES = { enemy: "bad", shunned: "low", noticed: "good", chosen: "best" };
var str = (v) => typeof v === "string" && v.trim() ? v.trim() : void 0;
var listOf = (v) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((x) => String(x).trim()).filter(Boolean);
var plural = (t) => /s$/i.test(t) ? t : /[^aeiou]y$/i.test(t) ? t.slice(0, -1) + "ies" : t + "s";
function Landing({ slug, root, href, allFiles }) {
  const inside = slug.endsWith("index") ? slug.slice(0, -"index".length) : slug + "/";
  const kids = allFiles.filter((f) => {
    const s = String(f.slug ?? "");
    if (!s.startsWith(inside) || s === slug) return false;
    const rest = s.slice(inside.length);
    return !rest.includes("/") || /^[^/]+\/index$/.test(rest);
  }).sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
  const overviews = kids.filter((f) => props(f).player_type === "Overview");
  const cards = kids.filter((f) => props(f).player_type !== "Overview");
  if (cards.length === 0 && overviews.length === 0) return null;
  if (cards.every((f) => typeof props(f).quest === "string")) return null;
  const types = /* @__PURE__ */ new Map();
  for (const f of cards) {
    const t = str(props(f).player_type) ?? "";
    types.set(t, [...types.get(t) ?? [], f]);
  }
  const grouped = types.size > 1 && [...types.keys()].every((t) => t && types.get(t).length >= 2);
  const groups = grouped ? [...types.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([t, fs]) => [plural(t), fs]) : [[void 0, cards]];
  const img = (v) => {
    const p = str(v);
    return p ? /^https?:/.test(p) ? p : `${root}/${p}` : void 0;
  };
  const card = (f) => {
    const p = props(f);
    const title = titleOf(f);
    const banner = img(p.banner);
    const sigil = img(p.player_sigil);
    const themes = listOf(p.player_themes);
    const sub = str(p.player_title) ?? (grouped ? void 0 : str(p.player_type));
    const initial = title.replace(/^the\s+/i, "").charAt(0).toUpperCase();
    const focus = str(p.banner_focus);
    return /* @__PURE__ */ jsx("a", { href: href(String(f.slug)), class: "mw-card internal", children: /* @__PURE__ */ jsxs("div", { class: "mw-card-inner", children: [
      banner ? /* @__PURE__ */ jsx("div", { class: "mw-card-banner", style: `background-image:url('${banner}')${focus ? `;background-position:${focus}` : ""}` }) : /* @__PURE__ */ jsx("div", { class: "mw-card-banner mw-card-blank", children: sigil ? /* @__PURE__ */ jsx("img", { src: sigil, alt: "" }) : /* @__PURE__ */ jsx("span", { children: initial }) }),
      /* @__PURE__ */ jsxs("div", { class: "mw-card-row mw-card-name", children: [
        sigil && /* @__PURE__ */ jsx("span", { class: "mw-card-sigil", children: /* @__PURE__ */ jsx("img", { src: sigil, alt: "" }) }),
        /* @__PURE__ */ jsxs("span", { class: "mw-card-title", children: [
          title,
          sub && /* @__PURE__ */ jsx("small", { children: sub })
        ] })
      ] }),
      themes.length > 0 && /* @__PURE__ */ jsx("div", { class: "mw-card-row mw-card-themes", children: themes.map((t) => /* @__PURE__ */ jsx("span", { children: t })) }),
      /* @__PURE__ */ jsx("div", { class: "mw-card-row mw-card-more", children: "Read more \u2192" })
    ] }) });
  };
  return /* @__PURE__ */ jsxs("div", { class: "mw-landing", children: [
    overviews.map((f) => /* @__PURE__ */ jsx("p", { class: "mw-landing-overview", children: /* @__PURE__ */ jsxs("a", { href: href(String(f.slug)), class: "internal", children: [
      "Read the overview: ",
      titleOf(f),
      " \u2192"
    ] }) })),
    groups.map(([name, fs]) => /* @__PURE__ */ jsxs("section", { children: [
      name && /* @__PURE__ */ jsx("h2", { children: name }),
      /* @__PURE__ */ jsx("div", { class: "mw-cards", children: fs.map(card) })
    ] }))
  ] });
}
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var niceDate = (d) => {
  const m = d?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : d;
};
function Gallery({ items, root, href }) {
  const uniq = (xs) => [...new Set(xs.filter(Boolean))];
  const artists = uniq(items.map((i) => i.artist ?? "")).sort((a, b) => a.localeCompare(b));
  const chars = uniq(items.flatMap((i) => (i.characters ?? []).map((c) => c.name))).sort((a, b) => a.localeCompare(b));
  const sessions = uniq(items.flatMap((i) => (i.sessions ?? []).map((c) => c.name))).sort(
    (a, b) => a.localeCompare(b, void 0, { numeric: true })
  );
  const pick = (label, key, all, opts) => /* @__PURE__ */ jsxs("label", { children: [
    label,
    /* @__PURE__ */ jsxs("select", { "data-filter": key, children: [
      /* @__PURE__ */ jsx("option", { value: "", children: all }),
      opts.map((o) => /* @__PURE__ */ jsx("option", { value: o, children: o }))
    ] })
  ] });
  const chip = (r, cls) => r.to ? /* @__PURE__ */ jsx("a", { href: href(r.to), class: `internal mw-gchip ${cls}`, children: r.name }) : /* @__PURE__ */ jsx("span", { class: `mw-gchip ${cls}`, children: r.name });
  return /* @__PURE__ */ jsxs("div", { class: "mw-gallery", children: [
    /* @__PURE__ */ jsxs("div", { class: "mw-gallery-filters", children: [
      pick("Artist", "artist", "Everyone", artists),
      pick("Character", "character", "Everyone", chars),
      pick("Session", "session", "All sessions", sessions),
      /* @__PURE__ */ jsx("button", { type: "button", class: "mw-gallery-clear", children: "Clear" }),
      /* @__PURE__ */ jsxs("span", { class: "mw-gallery-count", children: [
        items.length,
        " ",
        items.length === 1 ? "picture" : "pictures"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { class: "mw-gallery-grid", children: items.map((it) => /* @__PURE__ */ jsxs(
      "figure",
      {
        class: "mw-gcard",
        "data-artist": it.artist ?? "",
        "data-character": (it.characters ?? []).map((c) => c.name).join("\n"),
        "data-session": (it.sessions ?? []).map((c) => c.name).join("\n"),
        children: [
          /* @__PURE__ */ jsx("a", { href: `${root}/${it.img}`, target: "_blank", rel: "noopener", class: "mw-gcard-img", children: /* @__PURE__ */ jsx("img", { src: `${root}/${it.img}`, alt: it.description ?? "Player art" }) }),
          /* @__PURE__ */ jsxs("figcaption", { children: [
            it.description && /* @__PURE__ */ jsx("span", { class: "mw-gcard-desc", children: it.description }),
            it.artist && /* @__PURE__ */ jsxs("span", { class: "mw-gcard-by", children: [
              "by ",
              it.artist
            ] }),
            /* @__PURE__ */ jsxs("span", { class: "mw-gcard-meta", children: [
              (it.characters ?? []).map((c) => chip(c, "mw-gchip-char")),
              (it.sessions ?? []).map((c) => chip(c, "")),
              it.date && /* @__PURE__ */ jsx("span", { class: "mw-gcard-date", children: niceDate(it.date) })
            ] })
          ] })
        ]
      }
    )) }),
    /* @__PURE__ */ jsx("p", { class: "mw-gallery-none", hidden: true, children: "No pictures match. Try another filter." })
  ] });
}
var Related_default2 = (() => {
  const Related = ({ fileData, allFiles }) => {
    const slug = String(fileData.slug ?? "");
    const fm = fileData.frontmatter ?? {};
    if (!slug || slug === "index") return null;
    const root = pathToRoot(slug);
    const href = (target) => resolveRelative(slug, target);
    const pages = allFiles.filter(isPage);
    if (fm.mw_folder === true) return /* @__PURE__ */ jsx(Landing, { slug, root, href, allFiles });
    if (Array.isArray(fm.mw_gallery)) return /* @__PURE__ */ jsx(Gallery, { items: fm.mw_gallery, root, href });
    const ownLinks = new Set((fileData.links ?? []).map(String));
    const affinity = Object.keys(fm).filter((key) => key.startsWith("affinity_") && typeof fm[key] === "string" && fm[key]).map((key) => [key, key.slice(9).charAt(0).toUpperCase() + key.slice(10)]);
    const npcs = pages.filter(
      (f) => String(f.slug).startsWith("people/") && String(f.slug) !== slug && (linkTarget(props(f).player_faction) === slug || linkTarget(props(f).player_seen) === slug)
    );
    const inside = slug.endsWith("/index") ? slug.slice(0, -"index".length) : null;
    const places = slug.startsWith("places/") ? inside ? pages.filter((f) => {
      const s = String(f.slug);
      if (s === slug || !s.startsWith(inside)) return false;
      const rest = s.slice(inside.length);
      return !rest.includes("/") || /^[^/]+\/index$/.test(rest);
    }) : [] : pages.filter((f) => String(f.slug).startsWith("places/") && ownLinks.has(String(f.slug)));
    const connectedTo = (f) => (Array.isArray(props(f).player_connected) ? props(f).player_connected : []).some(
      (c) => !!c && typeof c === "object" && c.to === slug
    );
    const quests = pages.filter(
      (f) => typeof props(f).quest === "string" && String(f.slug) !== slug && ((f.links ?? []).map(String).includes(slug) || connectedTo(f))
    );
    const questStatus = (f) => {
      const s = typeof props(f).quest_status === "string" ? String(props(f).quest_status).trim().toLowerCase().replace(/[-_]+/g, " ") : "";
      return s && s !== "active" ? s.charAt(0).toUpperCase() + s.slice(1) : "";
    };
    const handouts = (Array.isArray(fm.player_handouts) ? fm.player_handouts : [fm.player_handouts]).filter(
      (h) => typeof h === "string" && h.length > 0
    );
    const mood = (Array.isArray(fm.mw_moodboard) ? fm.mw_moodboard : []).filter((p) => p && typeof p.img === "string");
    const boardUrl = typeof fm.pinterest === "string" && /^https:\/\/([a-z]{2,3}\.)?pinterest\./i.test(fm.pinterest) ? fm.pinterest : void 0;
    const SHOWN = 12;
    const tile = (p) => /* @__PURE__ */ jsx("a", { href: p.big, class: "mw-mood-tile", target: "_blank", rel: "noopener", children: /* @__PURE__ */ jsx("img", { src: p.img, width: p.w, height: p.h, alt: p.alt ?? "", loading: "lazy" }) });
    if (!affinity.length && !npcs.length && !places.length && !quests.length && !handouts.length && !mood.length) return null;
    return /* @__PURE__ */ jsxs("div", { class: "mw-related", children: [
      affinity.length > 0 && /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("h2", { children: "Affinity" }),
        /* @__PURE__ */ jsx("div", { class: "mw-affinity", children: affinity.map(([key, name]) => {
          const label = String(fm[key]);
          return /* @__PURE__ */ jsxs("div", { class: "mw-affinity-card", children: [
            /* @__PURE__ */ jsx("span", { class: "mw-affinity-name", children: name }),
            /* @__PURE__ */ jsx("span", { class: `mw-chip mw-tone-${TONES[label.toLowerCase()] ?? "mid"}`, children: label })
          ] });
        }) })
      ] }),
      npcs.length > 0 && /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("h2", { children: "Key NPCs" }),
        /* @__PURE__ */ jsx("div", { class: "mw-npc-grid", children: npcs.map((f) => {
          const p = props(f);
          return /* @__PURE__ */ jsxs("a", { href: href(String(f.slug)), class: "internal mw-npc-card", children: [
            typeof p.photo === "string" ? /* @__PURE__ */ jsx("img", { src: `${root}/${p.photo}`, alt: "" }) : /* @__PURE__ */ jsx("span", { class: "mw-npc-noimg" }),
            /* @__PURE__ */ jsx("span", { class: "mw-npc-name", children: titleOf(f) }),
            typeof p.player_title === "string" && /* @__PURE__ */ jsx("span", { class: "mw-npc-role", children: p.player_title })
          ] });
        }) })
      ] }),
      (places.length > 0 || quests.length > 0) && /* @__PURE__ */ jsxs("div", { class: "mw-related-columns", children: [
        places.length > 0 && /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { children: "Places" }),
          /* @__PURE__ */ jsx("ul", { children: places.map((f) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: href(String(f.slug)), class: "internal", children: titleOf(f) }) })) })
        ] }),
        quests.length > 0 && /* @__PURE__ */ jsxs("section", { children: [
          /* @__PURE__ */ jsx("h2", { children: "Related quests" }),
          /* @__PURE__ */ jsx("ul", { children: quests.map((f) => /* @__PURE__ */ jsxs("li", { children: [
            /* @__PURE__ */ jsx("span", { class: "mw-mini-chip", children: String(props(f).quest) }),
            /* @__PURE__ */ jsx("a", { href: href(String(f.slug)), class: "internal", children: titleOf(f) }),
            questStatus(f) && /* @__PURE__ */ jsxs("small", { class: "mw-quest-status", children: [
              " \xB7 ",
              questStatus(f)
            ] })
          ] })) })
        ] })
      ] }),
      handouts.length > 0 && /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("h2", { children: "Related handouts" }),
        /* @__PURE__ */ jsx("div", { class: "mw-handouts", children: handouts.map((h, i) => {
          const src = `${root}/${h}`;
          const names = Array.isArray(fm.mw_handout_names) ? fm.mw_handout_names : [];
          const name = names[i] ?? (h.split("/").pop() ?? h).replace(/\.[a-z]+$/i, "").replace(/-/g, " ");
          return /* @__PURE__ */ jsxs("a", { href: src, class: "mw-handout", target: "_blank", rel: "noopener", children: [
            /* @__PURE__ */ jsx("img", { src, alt: name, loading: "lazy" }),
            /* @__PURE__ */ jsx("span", { children: name })
          ] });
        }) })
      ] }),
      mood.length > 0 && /* @__PURE__ */ jsxs("section", { class: "mw-mood", children: [
        /* @__PURE__ */ jsxs("div", { class: "mw-mood-head", children: [
          /* @__PURE__ */ jsx("h2", { children: "Moodboard" }),
          boardUrl && /* @__PURE__ */ jsx("a", { href: boardUrl, class: "external mw-mood-link", target: "_blank", rel: "noopener", children: "Open on Pinterest" })
        ] }),
        /* @__PURE__ */ jsx("div", { class: "mw-mood-grid", children: mood.slice(0, SHOWN).map(tile) }),
        mood.length > SHOWN && /* @__PURE__ */ jsxs("details", { class: "mw-mood-more", children: [
          /* @__PURE__ */ jsxs("summary", { children: [
            "Show ",
            mood.length - SHOWN,
            " more"
          ] }),
          /* @__PURE__ */ jsx("div", { class: "mw-mood-grid", children: mood.slice(SHOWN).map(tile) })
        ] })
      ] })
    ] });
  };
  Related.css = Related_default;
  Related.afterDOMLoaded = `
document.addEventListener("nav", () => {
  for (const img of document.querySelectorAll("article.mw-handouts-page img:not([data-mw-done])")) {
    img.dataset.mwDone = "1"
    const fig = document.createElement("figure")
    fig.className = "mw-handout-fig"
    const a = document.createElement("a")
    a.href = img.getAttribute("src")
    a.target = "_blank"
    a.rel = "noopener"
    img.replaceWith(fig)
    a.appendChild(img)
    fig.appendChild(a)
    const text = img.getAttribute("alt")
    if (text) {
      const cap = document.createElement("figcaption")
      cap.textContent = text
      fig.appendChild(cap)
    }
  }
})

// Gallery: masonry columns (each picture goes in the shortest column, newest first) and filters
document.addEventListener("nav", () => {
  const root = document.querySelector(".mw-gallery")
  if (!root || root.dataset.mwDone) return
  root.dataset.mwDone = "1"
  const grid = root.querySelector(".mw-gallery-grid")
  const cards = [...root.querySelectorAll(".mw-gcard")]
  const selects = [...root.querySelectorAll("select[data-filter]")]
  const count = root.querySelector(".mw-gallery-count")
  const none = root.querySelector(".mw-gallery-none")
  let lastWidth = 0
  const layout = () => {
    const shown = cards.filter((c) => !c.hidden)
    const n = Math.max(2, Math.floor(grid.clientWidth / 215))
    for (const c of cards) grid.appendChild(c)
    grid.querySelectorAll(".mw-gcol").forEach((c) => c.remove())
    const cols = Array.from({ length: n }, () => {
      const d = document.createElement("div")
      d.className = "mw-gcol"
      grid.appendChild(d)
      return { d, h: 0 }
    })
    for (const c of shown) {
      const col = cols.reduce((a, b) => (b.h < a.h - 1 ? b : a))
      col.d.appendChild(c)
      col.h += c.offsetHeight + 14
    }
    grid.classList.add("mw-masonry")
    lastWidth = grid.clientWidth
  }
  const filter = () => {
    const want = Object.fromEntries(selects.map((s) => [s.dataset.filter, s.value]))
    let n = 0
    for (const c of cards) {
      const ok = Object.entries(want).every(([k, v]) => !v || (c.dataset[k] || "").split("\\n").includes(v))
      c.hidden = !ok
      if (ok) n++
    }
    count.textContent = n + (n === 1 ? " picture" : " pictures")
    none.hidden = n > 0
    layout()
  }
  selects.forEach((s) => s.addEventListener("change", filter))
  root.querySelector(".mw-gallery-clear").addEventListener("click", () => {
    selects.forEach((s) => (s.value = ""))
    filter()
  })
  let queued = false
  const relayout = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      layout()
    })
  }
  for (const img of root.querySelectorAll("img")) {
    img.loading = "eager"
    if (!img.complete) {
      img.addEventListener("load", relayout)
      img.addEventListener("error", relayout)
    }
  }
  const ro = new ResizeObserver(() => Math.abs(grid.clientWidth - lastWidth) > 4 && relayout())
  ro.observe(grid)
  window.addCleanup?.(() => ro.disconnect())
  layout()
})
`;
  return Related;
});
export {
  Related_default2 as Related
};
