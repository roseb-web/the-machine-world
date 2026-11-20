// src/components/header.tsx
import { pathToRoot, resolveRelative } from "@quartz-community/utils";
import { jsx, jsxs } from "preact/jsx-runtime";
function parseLink(value) {
  const m = value.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
  if (!m) return { text: value };
  return { target: m[1], text: m[2] ?? m[1].split("/").pop() ?? m[1] };
}
function renderLink(slug, value) {
  const { target, text } = parseLink(value);
  return target ? /* @__PURE__ */ jsx("a", { href: resolveRelative(slug, target), class: "internal", children: text }) : text;
}
var TONES = {
  hostile: "bad",
  grudge: "bad",
  enemy: "bad",
  wary: "low",
  cold: "low",
  shunned: "low",
  neutral: "mid",
  friendly: "good",
  warm: "good",
  noticed: "good",
  allied: "best",
  favoured: "best",
  chosen: "best"
};
function headerView(fm, slug) {
  const str = (key) => typeof fm[key] === "string" && fm[key] ? fm[key] : void 0;
  const banner = str("banner");
  const focus = ["top", "center", "bottom"].includes(str("banner_focus") ?? "") ? str("banner_focus") : "center";
  const header = renderHeader(fm, slug, str);
  if (!banner) return header;
  return /* @__PURE__ */ jsxs("div", { class: "mw-header-wrap", children: [
    /* @__PURE__ */ jsx("img", { class: "mw-banner", src: `${pathToRoot(slug)}/${banner}`, alt: "", style: `object-position: center ${focus};` }),
    header
  ] });
}
function renderHeader(fm, slug, str) {
  const title = str("title") ?? slug.split("/").pop() ?? "";
  const renderValue = (value) => {
    const { target, text } = parseLink(value);
    return target ? /* @__PURE__ */ jsx("a", { href: resolveRelative(slug, target), class: "internal", children: text }) : text;
  };
  const chips = [];
  for (const key of ["player_type", "player_species", "player_status"]) {
    const v = str(key);
    if (v) chips.push({ text: parseLink(v).text });
  }
  const faction = str("player_faction");
  for (const [key, label] of [["player_favour", "Favour"], ["player_standing", "Standing"]]) {
    const v = str(key);
    if (v) chips.push({ text: `${label}: ${v.toLowerCase()}`, tone: TONES[v.toLowerCase()] ?? "mid" });
  }
  if (slug === "index") {
    const d = fm.game_date;
    return /* @__PURE__ */ jsxs("header", { class: "mw-header mw-home-header", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { class: "article-title", children: str("mw_welcome") ?? "Welcome" }),
        str("party_location") && /* @__PURE__ */ jsxs("p", { class: "mw-party-location", children: [
          "The party is in ",
          renderLink(slug, str("party_location"))
        ] })
      ] }),
      d && /* @__PURE__ */ jsxs("div", { class: "mw-date-card", title: d.concord || void 0, children: [
        /* @__PURE__ */ jsx("div", { class: "mw-date-day", children: d.day }),
        /* @__PURE__ */ jsxs("div", { class: "mw-date-text", children: [
          /* @__PURE__ */ jsxs("div", { class: "mw-date-month", children: [
            d.month,
            ", ",
            `${d.year} ${d.era}`.trim()
          ] }),
          /* @__PURE__ */ jsxs("div", { class: "mw-date-other", children: [
            d.weekday,
            " \xB7 ",
            d.season
          ] })
        ] })
      ] })
    ] });
  }
  const photo = str("photo");
  const sigil = photo ? void 0 : str("player_sigil");
  const subtitle = str("player_title");
  const say = str("player_say");
  const artist = photo ? str("player_artist") : void 0;
  const artistLink = artist?.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
  const seen = str("player_seen");
  const song = spotifyEmbed(str("spotify"));
  const dates = Array.isArray(fm.mw_dates) ? fm.mw_dates.filter((d) => typeof d === "string") : [];
  const hasDetails = photo || sigil || subtitle || say || chips.length > 0 || faction || seen || dates.length > 0 || song;
  if (!hasDetails) {
    return /* @__PURE__ */ jsx("h1", { class: "article-title", children: title });
  }
  const root = pathToRoot(slug);
  return /* @__PURE__ */ jsxs(
    "header",
    {
      class: `mw-header ${photo ? "mw-has-photo" : sigil ? "mw-has-sigil" : ""} ${fm.mw_folder === true ? "mw-folder-header" : ""}`,
      children: [
        photo && /* @__PURE__ */ jsxs("figure", { class: "mw-portrait-fig", children: [
          /* @__PURE__ */ jsx("img", { class: "mw-portrait", src: `${root}/${photo}`, alt: `Portrait of ${title}` }),
          artist && /* @__PURE__ */ jsxs("figcaption", { class: "mw-artist", children: [
            "Art:",
            " ",
            artistLink ? /* @__PURE__ */ jsx("a", { href: artistLink[2], class: "external", target: "_blank", rel: "noopener", children: artistLink[1] }) : artist
          ] })
        ] }),
        sigil && /* @__PURE__ */ jsx("img", { class: "mw-sigil", src: `${root}/${sigil}`, alt: "" }),
        /* @__PURE__ */ jsxs("div", { class: "mw-header-text", children: [
          /* @__PURE__ */ jsx("h1", { class: "article-title", children: title }),
          say && /* @__PURE__ */ jsxs("p", { class: "mw-say", title: "How to say it", children: [
            /* @__PURE__ */ jsx("span", { class: "mw-say-label", children: "Say it" }),
            " ",
            say
          ] }),
          subtitle && /* @__PURE__ */ jsx("p", { class: "mw-subtitle", children: subtitle }),
          (chips.length > 0 || faction) && /* @__PURE__ */ jsxs("div", { class: "mw-chips", children: [
            faction && /* @__PURE__ */ jsx("span", { class: "mw-chip", children: renderValue(faction) }),
            chips.map((c) => /* @__PURE__ */ jsx("span", { class: `mw-chip ${c.tone ? `mw-tone-${c.tone}` : ""}`, children: c.text }))
          ] }),
          seen && /* @__PURE__ */ jsxs("p", { class: "mw-seen", children: [
            "Last seen: ",
            renderValue(seen)
          ] }),
          dates.map((d) => /* @__PURE__ */ jsxs("p", { class: "mw-datecard", children: [
            /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 16 16", width: "14", height: "14", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("rect", { x: "1.5", y: "2.5", width: "13", height: "12", rx: "1.5", fill: "none", stroke: "currentColor" }),
              /* @__PURE__ */ jsx("path", { d: "M1.5 6h13M5 1v3M11 1v3", stroke: "currentColor" })
            ] }),
            d
          ] })),
          song && /* @__PURE__ */ jsx(
            "iframe",
            {
              class: "mw-song",
              title: "Theme song",
              src: song.src,
              height: song.height,
              loading: "lazy",
              frameBorder: "0",
              allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            }
          )
        ] })
      ]
    }
  );
}
function spotifyEmbed(url) {
  const m = url?.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
  if (!m) return null;
  return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator`, height: m[1] === "track" || m[1] === "episode" ? 80 : 152 };
}

// src/components/PageHeader.css
var PageHeader_default = `.mw-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
  margin-top: 0.8rem;
  padding-bottom: 1.2rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--lightgray);
}

.mw-header.mw-has-photo {
  grid-template-columns: 170px minmax(0, 1fr);
}

.mw-header .article-title {
  border-bottom: none !important;
  padding-bottom: 0 !important;
  margin: 0.2rem 0 0.2rem !important;
}

.mw-portrait {
  width: 170px;
  height: auto;
  max-height: 340px;
  object-fit: contain;
  object-position: top left;
  border-radius: 10px;
  margin: 0 !important;
}

.mw-subtitle {
  margin: 0 0 0.8rem;
  color: var(--gray);
  font-size: 1.05rem;
}

.mw-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.7rem;
}

.mw-chip {
  font-family: var(--bodyFont);
  font-size: 0.8rem;
  padding: 0.1rem 0.7rem;
  border-radius: 6px;
  background: var(--lightgray);
  color: var(--darkgray);
}

.mw-chip a {
  color: inherit;
}

.mw-header a.internal {
  background: none;
  padding: 0;
  font-weight: inherit;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.mw-tone-bad { background: color-mix(in srgb, #a33a2a 18%, transparent); color: #8a2f22; }
.mw-tone-low { background: color-mix(in srgb, #b8862b 18%, transparent); color: #7a5512; }
.mw-tone-mid { background: color-mix(in srgb, var(--gray) 22%, transparent); }
.mw-tone-good { background: color-mix(in srgb, #a46b0a 20%, transparent); color: #6e4706; }
.mw-tone-best { background: color-mix(in srgb, #5d7a2e 20%, transparent); color: #3f5a18; }

:root[saved-theme="dark"] .mw-tone-bad { color: #e08f80; }
:root[saved-theme="dark"] .mw-tone-low { color: #e0b46a; }
:root[saved-theme="dark"] .mw-tone-good { color: #e5bb68; }
:root[saved-theme="dark"] .mw-tone-best { color: #b5cf86; }

.mw-seen {
  margin: 0;
  font-size: 0.9rem;
  color: var(--gray);
}

@media (max-width: 800px) {
  .mw-header.mw-has-photo {
    grid-template-columns: 110px minmax(0, 1fr);
    gap: 1rem;
  }
  .mw-portrait {
    width: 110px;
  }
}

/* Home page: welcome title with a compact date card beside it */
.mw-home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

.mw-date-card {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.4rem 1rem;
  border: 1px solid var(--lightgray);
  border-radius: 10px;
}

.mw-date-day {
  font-family: var(--mw-title-font, var(--headerFont));
  font-size: 2rem;
  line-height: 1;
  color: var(--dark);
}

.mw-date-month {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--dark);
  line-height: 1.3;
}

.mw-date-other {
  font-size: 0.8rem;
  color: var(--gray);
  line-height: 1.3;
}

@media (max-width: 800px) {
  .mw-home-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* Banner image across the top of the page */
.mw-banner {
  display: block;
  width: 100%;
  height: 260px;
  object-fit: cover;
  border-radius: 12px;
  margin: 0.6rem 0 0 !important;
}

@media (max-width: 800px) {
  .mw-banner {
    height: 170px;
  }
}

.mw-party-location {
  margin: 0.2rem 0 0;
  color: var(--gray);
}

/* Factions and gods: a round sigil or symbol */
.mw-header.mw-has-sigil {
  grid-template-columns: 110px minmax(0, 1fr);
  align-items: center;
}

.mw-sigil {
  width: 110px;
  height: 110px;
  object-fit: contain;
  padding: 14px;
  box-sizing: border-box;
  border: 1px solid var(--lightgray);
  border-radius: 50%;
  margin: 0 !important;
}

:root[saved-theme="dark"] .mw-sigil {
  filter: invert(0.85);
}

/* A place with places inside it (e.g. Thornwick) is also a folder page.
   Its own "Places" list replaces Quartz's dated list. Folder-only pages keep the list. */
.center:has(.mw-header:not(.mw-folder-header)) .page-listing {
  display: none;
}

/* Date card: when this page's events happen */
.mw-datecard {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0.3rem 0 0;
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--lightgray);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--darkgray);
}

.mw-datecard svg {
  color: var(--secondary);
  flex-shrink: 0;
}

/* Portrait with the artist's credit underneath */
.mw-portrait-fig {
  margin: 0;
}

.mw-artist {
  margin-top: 0.35rem;
  font-size: 0.75rem;
  line-height: 1.3;
  color: var(--gray);
  max-width: 170px;
}

.mw-artist a.external {
  color: var(--gray);
  font-weight: 400;
  background: none;
  padding: 0;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

/* How to say the name */
.mw-say {
  margin: -0.2rem 0 0.4rem;
  font-size: 0.95rem;
  color: var(--darkgray);
  letter-spacing: 0.02em;
}

.mw-say-label {
  font-variant: small-caps;
  letter-spacing: 0.08em;
  color: var(--gray);
  margin-right: 0.3rem;
}

/* Theme song: Spotify's own small player, under the header text */
.mw-song {
  display: block;
  width: 100%;
  max-width: 460px;
  margin-top: 0.8rem;
  border: 0;
  border-radius: 12px;
}
`;

// src/components/PageHeader.tsx
import { jsx as jsx2 } from "preact/jsx-runtime";
var PageHeader_default2 = (() => {
  const PageHeader = (props) => {
    const fm = props.fileData.frontmatter ?? {};
    return /* @__PURE__ */ jsx2("div", { class: "mw-page-header", children: headerView(fm, String(props.fileData.slug ?? "")) });
  };
  PageHeader.css = PageHeader_default;
  return PageHeader;
});
export {
  PageHeader_default2 as PageHeader
};
