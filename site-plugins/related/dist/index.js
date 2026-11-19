// src/components/Related.tsx
import { pathToRoot, resolveRelative } from "@quartz-community/utils";

// src/components/Related.css
var Related_default = ".mw-related {\n  margin-top: 2.5rem;\n}\n\n.mw-related section {\n  margin-bottom: 2rem;\n}\n\n.mw-related h2 {\n  margin: 0 0 0.8rem;\n}\n\n.mw-related ul {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.mw-related li {\n  margin: 0 0 0.4rem;\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}\n\n.mw-related a.internal {\n  background: none;\n  padding: 0;\n  font-weight: inherit;\n  text-decoration: underline;\n  text-decoration-thickness: 1px;\n  text-underline-offset: 3px;\n}\n\n/* Affinity */\n.mw-affinity {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 0.6rem;\n}\n\n.mw-affinity-card {\n  display: flex;\n  align-items: center;\n  gap: 0.6rem;\n  padding: 0.4rem 0.8rem;\n  border: 1px solid var(--lightgray);\n  border-radius: 10px;\n}\n\n.mw-affinity-name {\n  font-weight: 500;\n  color: var(--dark);\n}\n\n/* Key NPCs */\n.mw-npc-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));\n  gap: 0.8rem;\n}\n\n.mw-related a.mw-npc-card {\n  display: flex;\n  flex-direction: column;\n  border: 1px solid var(--lightgray);\n  border-radius: 10px;\n  overflow: hidden;\n  text-decoration: none;\n  color: inherit;\n  transition: border-color 0.2s ease;\n}\n\n.mw-related a.mw-npc-card:hover {\n  border-color: var(--secondary);\n}\n\n.mw-npc-card img,\n.mw-npc-noimg {\n  display: block;\n  width: 100%;\n  height: 150px;\n  object-fit: cover;\n  object-position: center top;\n  margin: 0 !important;\n  border-radius: 0 !important;\n  background: var(--lightgray);\n}\n\n.mw-npc-name {\n  padding: 0.5rem 0.7rem 0;\n  font-weight: 500;\n  color: var(--dark);\n}\n\n.mw-npc-role {\n  padding: 0 0.7rem 0.6rem;\n  font-size: 0.8rem;\n  color: var(--gray);\n}\n\n/* Places and quests side by side */\n.mw-related-columns {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n  gap: 1.5rem;\n}\n\n.mw-mini-chip {\n  font-size: 0.7rem;\n  text-transform: capitalize;\n  padding: 0 0.5rem;\n  border-radius: 6px;\n  background: var(--lightgray);\n  color: var(--darkgray);\n}\n\n/* Related handouts */\n.mw-handouts {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));\n  gap: 0.8rem;\n}\n\n.mw-related a.mw-handout {\n  display: flex;\n  flex-direction: column;\n  gap: 0.3rem;\n  text-decoration: none;\n  color: var(--darkgray);\n  font-size: 0.8rem;\n  text-transform: capitalize;\n}\n\n.mw-handout img {\n  width: 100%;\n  height: 180px;\n  object-fit: cover;\n  object-position: top;\n  border: 1px solid var(--lightgray);\n  border-radius: 8px;\n  margin: 0 !important;\n}\n\n/* Moodboard: a masonry grid of the board's pins */\n.mw-mood-head {\n  display: flex;\n  justify-content: space-between;\n  align-items: baseline;\n  gap: 1rem;\n}\n\n.mw-related a.mw-mood-link {\n  font-size: 0.85rem;\n  color: var(--secondary);\n}\n\n.mw-mood-grid {\n  columns: 4 150px;\n  column-gap: 8px;\n}\n\n.mw-related a.mw-mood-tile {\n  display: block;\n  break-inside: avoid;\n  margin: 0 0 8px;\n  border-radius: 6px;\n  overflow: hidden;\n  border: 1px solid var(--lightgray);\n  background: var(--lightgray);\n  text-decoration: none;\n}\n\n.mw-mood-tile img {\n  display: block;\n  width: 100%;\n  height: auto;\n  margin: 0 !important;\n  border-radius: 0 !important;\n  transition: transform 0.25s ease;\n}\n\n.mw-mood-tile:hover img {\n  transform: scale(1.03);\n}\n\n.mw-mood-more summary {\n  cursor: pointer;\n  color: var(--secondary);\n  font-size: 0.9rem;\n  margin: 0.2rem 0 0.8rem;\n}\n";

// src/components/Related.tsx
import { jsx, jsxs } from "preact/jsx-runtime";
var props = (f) => f.frontmatter ?? {};
var titleOf = (f) => String(props(f).title ?? String(f.slug).split("/").pop());
var linkTarget = (v) => typeof v === "string" ? v.match(/^\[\[([^\]|]+)/)?.[1] : void 0;
var isPage = (f) => !!f.slug && String(f.slug) !== "index" && props(f).mw_folder !== true;
var TONES = { enemy: "bad", shunned: "low", noticed: "good", chosen: "best" };
var Related_default2 = (() => {
  const Related = ({ fileData, allFiles }) => {
    const slug = String(fileData.slug ?? "");
    const fm = fileData.frontmatter ?? {};
    if (!slug || slug === "index" || fm.mw_folder === true) return null;
    const root = pathToRoot(slug);
    const href = (target) => resolveRelative(slug, target);
    const pages = allFiles.filter(isPage);
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
        /* @__PURE__ */ jsx("div", { class: "mw-handouts", children: handouts.map((h) => {
          const src = `${root}/${h}`;
          const name = (h.split("/").pop() ?? h).replace(/\.[a-z]+$/i, "").replace(/-/g, " ");
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
  return Related;
});
export {
  Related_default2 as Related
};
