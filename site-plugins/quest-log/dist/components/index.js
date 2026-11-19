// src/components/QuestLog.tsx
import { resolveRelative } from "@quartz-community/utils";

// src/components/QuestLog.css
var QuestLog_default = '.mw-quest-log {\n  margin-top: 2rem;\n}\n\n/* Main quests: a featured card */\n.mw-quest-log a.mw-quest-main-card {\n  display: block;\n  padding: 1rem 1.2rem;\n  margin-bottom: 0.8rem;\n  border: 1px solid var(--lightgray);\n  border-left: 3px solid var(--secondary);\n  border-radius: 0 10px 10px 0;\n  background: none;\n  color: inherit;\n  text-decoration: none;\n  font-weight: normal;\n  transition: border-color 0.2s ease;\n}\n\n.mw-quest-log a.mw-quest-main-card:hover {\n  border-color: var(--secondary);\n}\n\n.mw-quest-main-title {\n  display: block;\n  margin: 0.4rem 0 0.2rem;\n  font-family: var(--headerFont);\n  font-size: 1.35rem;\n  font-weight: 600;\n  color: var(--dark);\n}\n\n.mw-quest-summary {\n  display: block;\n  font-size: 0.95rem;\n  color: var(--darkgray);\n}\n\n/* Other quests: compact rows */\n.mw-quest-list {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.mw-quest-list li {\n  display: flex;\n  align-items: center;\n  gap: 0.8rem;\n  margin: 0;\n  padding: 0.45rem 0.2rem;\n}\n\n.mw-quest-list li + li {\n  border-top: 1px solid var(--lightgray);\n}\n\n.mw-quest-type {\n  flex-shrink: 0;\n  min-width: 4.2rem;\n  text-align: center;\n  font-size: 0.72rem;\n  font-weight: 500;\n  padding: 0.05rem 0.6rem;\n  border-radius: 6px;\n  background: var(--lightgray);\n  color: var(--darkgray);\n}\n\n.mw-quest-main-card .mw-quest-type {\n  min-width: 0;\n}\n\n.mw-quest-main { background: color-mix(in srgb, #a46b0a 22%, transparent); color: #6e4706; }\n.mw-quest-personal { background: color-mix(in srgb, #6b6a3a 22%, transparent); color: #4a4926; }\n.mw-quest-faction { background: color-mix(in srgb, #8a4a5a 20%, transparent); color: #6a3040; }\n\n:root[saved-theme="dark"] .mw-quest-main { color: #e5bb68; }\n:root[saved-theme="dark"] .mw-quest-personal { color: #b8b67e; }\n:root[saved-theme="dark"] .mw-quest-faction { color: #d99aaa; }\n\n.mw-quest-log a.mw-quest-title {\n  background: none;\n  padding: 0;\n  font-weight: 500;\n  color: var(--dark);\n  text-decoration: none;\n}\n\n.mw-quest-log a.mw-quest-title:hover {\n  color: var(--secondary);\n}\n';

// src/components/QuestLog.tsx
import { jsx, jsxs } from "preact/jsx-runtime";
var ORDER = ["main", "personal", "faction", "side"];
var LABELS = { main: "Main", personal: "Personal", faction: "Faction", side: "Side" };
var QuestLog_default2 = (() => {
  const QuestLog = ({ fileData, allFiles }) => {
    const slug = String(fileData.slug ?? "");
    if (slug !== "index") return null;
    const quests = allFiles.map((f) => ({ f, fm: f.frontmatter ?? {} })).filter(({ fm }) => fm.pinned === true && fm.quest_status === "active" && typeof fm.quest === "string").sort((a, b) => ORDER.indexOf(String(a.fm.quest)) - ORDER.indexOf(String(b.fm.quest)));
    if (quests.length === 0) return null;
    const link = (f) => resolveRelative(slug, String(f.slug));
    const titleOf = (f, fm) => String(fm.title ?? f.slug);
    const main = quests.filter(({ fm }) => fm.quest === "main");
    const others = quests.filter(({ fm }) => fm.quest !== "main");
    return /* @__PURE__ */ jsxs("section", { class: "mw-quest-log", children: [
      /* @__PURE__ */ jsx("h2", { children: "Active quests" }),
      main.map(({ f, fm }) => {
        const summary = typeof f.description === "string" ? f.description.replace(/^Overview\s+/, "") : "";
        return /* @__PURE__ */ jsxs("a", { href: link(f), class: "internal mw-quest-main-card", children: [
          /* @__PURE__ */ jsx("span", { class: "mw-quest-type mw-quest-main", children: "Main quest" }),
          /* @__PURE__ */ jsx("span", { class: "mw-quest-main-title", children: titleOf(f, fm) }),
          summary && /* @__PURE__ */ jsx("span", { class: "mw-quest-summary", children: summary })
        ] });
      }),
      others.length > 0 && /* @__PURE__ */ jsx("ul", { class: "mw-quest-list", children: others.map(({ f, fm }) => {
        const type = String(fm.quest);
        return /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("span", { class: `mw-quest-type mw-quest-${type}`, children: LABELS[type] ?? type }),
          /* @__PURE__ */ jsx("a", { href: link(f), class: "internal mw-quest-title", children: titleOf(f, fm) })
        ] });
      }) })
    ] });
  };
  QuestLog.css = QuestLog_default;
  return QuestLog;
});
export {
  QuestLog_default2 as QuestLog
};
