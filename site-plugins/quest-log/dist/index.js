// src/components/QuestLog.tsx
import { resolveRelative } from "@quartz-community/utils";

// src/components/QuestLog.css
var QuestLog_default = '.mw-quest-log {\n  margin-top: 2rem;\n}\n\n.mw-quest-log ul {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  border: 1px solid var(--lightgray);\n  border-radius: 10px;\n}\n\n.mw-quest {\n  display: flex;\n  gap: 0.9rem;\n  align-items: flex-start;\n  padding: 0.9rem 1.1rem;\n  margin: 0;\n}\n\n.mw-quest + .mw-quest {\n  border-top: 1px solid var(--lightgray);\n}\n\n.mw-quest-type {\n  flex-shrink: 0;\n  min-width: 4.5rem;\n  text-align: center;\n  font-size: 0.75rem;\n  font-weight: 500;\n  padding: 0.1rem 0.6rem;\n  border-radius: 6px;\n  margin-top: 0.2rem;\n  background: var(--lightgray);\n  color: var(--darkgray);\n}\n\n.mw-quest-main { background: color-mix(in srgb, #a46b0a 22%, transparent); color: #6e4706; }\n.mw-quest-personal { background: color-mix(in srgb, #6b6a3a 22%, transparent); color: #4a4926; }\n.mw-quest-faction { background: color-mix(in srgb, #8a4a5a 20%, transparent); color: #6a3040; }\n\n:root[saved-theme="dark"] .mw-quest-main { color: #e5bb68; }\n:root[saved-theme="dark"] .mw-quest-personal { color: #b8b67e; }\n:root[saved-theme="dark"] .mw-quest-faction { color: #d99aaa; }\n\n.mw-quest-log a.mw-quest-title {\n  font-family: var(--headerFont);\n  font-size: 1.05rem;\n  font-weight: 600;\n  background: none;\n  padding: 0;\n  color: var(--dark);\n  text-decoration: none;\n}\n\n.mw-quest-log a.mw-quest-title:hover {\n  color: var(--secondary);\n}\n\n.mw-quest-summary {\n  margin: 0.2rem 0 0;\n  font-size: 0.9rem;\n  color: var(--gray);\n}\n';

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
    return /* @__PURE__ */ jsxs("section", { class: "mw-quest-log", children: [
      /* @__PURE__ */ jsx("h2", { children: "Active quests" }),
      /* @__PURE__ */ jsx("ul", { children: quests.map(({ f, fm }) => {
        const type = String(fm.quest);
        const summary = typeof f.description === "string" ? f.description.replace(/^Overview\s+/, "") : "";
        return /* @__PURE__ */ jsxs("li", { class: "mw-quest", children: [
          /* @__PURE__ */ jsx("span", { class: `mw-quest-type mw-quest-${type}`, children: LABELS[type] ?? type }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("a", { href: resolveRelative(slug, String(f.slug)), class: "internal mw-quest-title", children: String(fm.title ?? f.slug) }),
            summary && /* @__PURE__ */ jsx("p", { class: "mw-quest-summary", children: summary })
          ] })
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
