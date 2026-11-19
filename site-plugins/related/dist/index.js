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
var Related_default2 = (() => {
  const Related = ({ fileData, allFiles }) => {
    const slug = String(fileData.slug ?? "");
    const fm = fileData.frontmatter ?? {};
    if (!slug || slug === "index") return null;
    const root = pathToRoot(slug);
    const href = (target) => resolveRelative(slug, target);
    const pages = allFiles.filter(isPage);
    if (fm.mw_folder === true) return /* @__PURE__ */ jsx(Landing, { slug, root, href, allFiles });
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
    const quests = pages.filter(
      (f) => typeof props(f).quest === "string" && String(f.slug) !== slug && (f.links ?? []).map(String).includes(slug)
    );
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
            /* @__PURE__ */ jsx("a", { href: href(String(f.slug)), class: "internal", children: titleOf(f) })
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
`;
  return Related;
});
export {
  Related_default2 as Related
};
