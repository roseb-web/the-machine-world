// src/components/PageHeader.tsx
import { pathToRoot, resolveRelative } from "@quartz-community/utils";

// src/components/PageHeader.css
var PageHeader_default = '.mw-header {\n  display: grid;\n  grid-template-columns: minmax(0, 1fr);\n  gap: 1.5rem;\n  align-items: start;\n  margin-top: 0.8rem;\n  padding-bottom: 1.2rem;\n  margin-bottom: 1rem;\n  border-bottom: 1px solid var(--lightgray);\n}\n\n.mw-header.mw-has-photo {\n  grid-template-columns: 170px minmax(0, 1fr);\n}\n\n.mw-header .article-title {\n  border-bottom: none !important;\n  padding-bottom: 0 !important;\n  margin: 0.2rem 0 0.2rem !important;\n}\n\n.mw-portrait {\n  width: 170px;\n  height: auto;\n  max-height: 340px;\n  object-fit: contain;\n  object-position: top left;\n  border-radius: 10px;\n  margin: 0 !important;\n}\n\n.mw-subtitle {\n  margin: 0 0 0.8rem;\n  color: var(--gray);\n  font-size: 1.05rem;\n}\n\n.mw-chips {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.4rem;\n  margin-bottom: 0.7rem;\n}\n\n.mw-chip {\n  font-family: var(--bodyFont);\n  font-size: 0.8rem;\n  padding: 0.1rem 0.7rem;\n  border-radius: 6px;\n  background: var(--lightgray);\n  color: var(--darkgray);\n}\n\n.mw-chip a {\n  color: inherit;\n}\n\n.mw-header a.internal {\n  background: none;\n  padding: 0;\n  font-weight: inherit;\n  text-decoration: underline;\n  text-decoration-thickness: 1px;\n  text-underline-offset: 3px;\n}\n\n.mw-tone-bad { background: color-mix(in srgb, #a33a2a 18%, transparent); color: #8a2f22; }\n.mw-tone-low { background: color-mix(in srgb, #b8862b 18%, transparent); color: #7a5512; }\n.mw-tone-mid { background: color-mix(in srgb, var(--gray) 22%, transparent); }\n.mw-tone-good { background: color-mix(in srgb, #a46b0a 20%, transparent); color: #6e4706; }\n.mw-tone-best { background: color-mix(in srgb, #5d7a2e 20%, transparent); color: #3f5a18; }\n\n:root[saved-theme="dark"] .mw-tone-bad { color: #e08f80; }\n:root[saved-theme="dark"] .mw-tone-low { color: #e0b46a; }\n:root[saved-theme="dark"] .mw-tone-good { color: #e5bb68; }\n:root[saved-theme="dark"] .mw-tone-best { color: #b5cf86; }\n\n.mw-seen {\n  margin: 0;\n  font-size: 0.9rem;\n  color: var(--gray);\n}\n\n@media (max-width: 800px) {\n  .mw-header.mw-has-photo {\n    grid-template-columns: 110px minmax(0, 1fr);\n    gap: 1rem;\n  }\n  .mw-portrait {\n    width: 110px;\n  }\n}\n';

// src/components/PageHeader.tsx
import { jsx, jsxs } from "preact/jsx-runtime";
function parseLink(value) {
  const m = value.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
  if (!m) return { text: value };
  return { target: m[1], text: m[2] ?? m[1].split("/").pop() ?? m[1] };
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
var PageHeader_default2 = (() => {
  const PageHeader = ({ fileData }) => {
    const fm = fileData.frontmatter ?? {};
    const slug = String(fileData.slug ?? "");
    const str = (key) => typeof fm[key] === "string" && fm[key] ? fm[key] : void 0;
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
    const photo = str("photo");
    const subtitle = str("player_title");
    const seen = str("player_seen");
    const hasDetails = photo || subtitle || chips.length > 0 || faction || seen;
    if (!hasDetails) {
      return /* @__PURE__ */ jsx("h1", { class: "article-title", children: title });
    }
    const root = pathToRoot(slug);
    return /* @__PURE__ */ jsxs("header", { class: `mw-header ${photo ? "mw-has-photo" : ""}`, children: [
      photo && /* @__PURE__ */ jsx("img", { class: "mw-portrait", src: `${root}/${photo}`, alt: `Portrait of ${title}` }),
      /* @__PURE__ */ jsxs("div", { class: "mw-header-text", children: [
        /* @__PURE__ */ jsx("h1", { class: "article-title", children: title }),
        subtitle && /* @__PURE__ */ jsx("p", { class: "mw-subtitle", children: subtitle }),
        (chips.length > 0 || faction) && /* @__PURE__ */ jsxs("div", { class: "mw-chips", children: [
          faction && /* @__PURE__ */ jsx("span", { class: "mw-chip", children: renderValue(faction) }),
          chips.map((c) => /* @__PURE__ */ jsx("span", { class: `mw-chip ${c.tone ? `mw-tone-${c.tone}` : ""}`, children: c.text }))
        ] }),
        seen && /* @__PURE__ */ jsxs("p", { class: "mw-seen", children: [
          "Last seen: ",
          renderValue(seen)
        ] })
      ] })
    ] });
  };
  PageHeader.css = PageHeader_default;
  return PageHeader;
});
export {
  PageHeader_default2 as PageHeader
};
