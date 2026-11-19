// src/components/SetMenu.tsx
import { resolveRelative } from "@quartz-community/utils";

// src/components/SetMenu.css
var SetMenu_default = '.mw-menu {\n  font-family: var(--bodyFont);\n  font-size: 0.95rem;\n}\n\n.mw-menu ul {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n\n.mw-menu li {\n  margin: 0;\n}\n\n.mw-menu-label {\n  font-size: 0.75rem;\n  font-weight: 500;\n  text-transform: uppercase;\n  letter-spacing: 0.08em;\n  color: var(--gray);\n  margin: 1.2rem 0 0.3rem;\n}\n\n.mw-menu-group:first-child .mw-menu-label {\n  margin-top: 0.4rem;\n}\n\n.mw-menu a,\n.mw-menu summary {\n  display: block;\n  padding: 0.15rem 0;\n  color: var(--dark);\n  font-weight: 500;\n  text-decoration: none;\n  background: none;\n  cursor: pointer;\n}\n\n.mw-menu summary {\n  list-style: none;\n}\n\n.mw-menu summary::-webkit-details-marker {\n  display: none;\n}\n\n.mw-menu summary::after {\n  content: "\u203A";\n  display: inline-block;\n  margin-left: 0.4rem;\n  color: var(--gray);\n  transition: transform 0.2s ease;\n}\n\n.mw-menu details[open] > summary::after {\n  transform: rotate(90deg);\n}\n\n.mw-menu a:hover,\n.mw-menu summary:hover {\n  color: var(--secondary);\n}\n\n.mw-menu-sub {\n  border-left: 1px solid var(--lightgray);\n  margin: 0.1rem 0 0.4rem 0.3rem !important;\n  padding-left: 0.8rem !important;\n}\n\n.mw-menu-sub a {\n  font-weight: 400;\n  color: var(--darkgray);\n}\n\n.mw-menu .mw-active,\n.mw-menu .mw-active-section {\n  color: var(--secondary);\n}\n\n.mw-menu-toggle {\n  display: none;\n}\n\n@media (max-width: 800px) {\n  .mw-menu-toggle {\n    display: block;\n    font-family: var(--bodyFont);\n    font-size: 0.9rem;\n    font-weight: 500;\n    color: var(--dark);\n    background: none;\n    border: 1px solid var(--lightgray);\n    border-radius: 6px;\n    padding: 0.3rem 0.8rem;\n    cursor: pointer;\n  }\n\n  .mw-menu .mw-menu-body {\n    display: none;\n  }\n\n  .mw-menu.mw-open .mw-menu-body {\n    display: block;\n  }\n}\n\n/* Folders inside a section (e.g. The Marrowlands > Thornwick): same look as pages */\n.mw-menu-sub summary {\n  font-weight: 400;\n  color: var(--darkgray);\n}\n\n/* A folder with its own page: the name is a link, the arrow opens the list */\n.mw-menu summary > a {\n  display: inline;\n  padding: 0;\n}\n\n.mw-menu-sub .mw-active-section > a:not(.mw-active) {\n  color: var(--darkgray);\n}\n';

// src/components/SetMenu.tsx
import { jsx, jsxs } from "preact/jsx-runtime";
var defaultOptions = {
  groups: [
    {
      label: "Explore",
      items: [
        { title: "Home", page: "index" },
        { title: "Maps", page: "maps" },
        { title: "Calendar", page: "calendar" },
        { title: "Quest log", section: "quests" }
      ]
    },
    {
      label: "The world",
      items: [
        { title: "Places", section: "places" },
        { title: "People", section: "people" },
        { title: "Factions", section: "factions" },
        { title: "Lore", section: "lore" },
        { title: "Gods", section: "gods" },
        { title: "Items", section: "items" }
      ]
    },
    {
      label: "The party",
      items: [
        { title: "The party", section: "party" },
        { title: "Session recaps", section: "sessions" }
      ]
    }
  ]
};
function titleOf(file) {
  const fm = file.frontmatter;
  if (typeof fm?.title === "string" && fm.title) return fm.title;
  const last = String(file.slug ?? "").split("/").pop() ?? "";
  return last.replace(/-/g, " ");
}
var SetMenu_default2 = ((userOpts) => {
  const opts = { ...defaultOptions, ...userOpts };
  const SetMenu = ({ fileData, allFiles, displayClass }) => {
    const current = String(fileData.slug ?? "");
    const isFolderPage = (f) => f.frontmatter?.mw_folder === true;
    const pages = allFiles.filter((f) => f.slug && String(f.slug) !== "index" && !String(f.slug).startsWith("tags/") && !isFolderPage(f)).filter((f) => !String(f.slug).endsWith("/index") || String(f.slug).split("/").length > 2).map((f) => ({ slug: String(f.slug), title: titleOf(f) }));
    const folderTitles = new Map(
      allFiles.filter((f) => String(f.slug).endsWith("/index")).map((f) => [String(f.slug).slice(0, -6), titleOf(f)])
    );
    const buildTree = (section, children) => {
      const root = { path: section, title: section, folders: [], pages: [] };
      const folderAt = (path) => {
        let node = root;
        const parts = path.slice(section.length + 1).split("/").filter(Boolean);
        for (let i = 0; i < parts.length; i++) {
          const sub = `${section}/${parts.slice(0, i + 1).join("/")}`;
          let next = node.folders.find((f) => f.path === sub);
          if (!next) {
            next = { path: sub, title: folderTitles.get(sub) ?? parts[i].replace(/-/g, " "), folders: [], pages: [] };
            node.folders.push(next);
          }
          node = next;
        }
        return node;
      };
      for (const p of children) {
        if (p.slug.endsWith("/index")) {
          const f = folderAt(p.slug.slice(0, -6));
          f.page = p.slug;
          f.title = p.title;
        } else {
          folderAt(p.slug.split("/").slice(0, -1).join("/")).pages.push(p);
        }
      }
      const sort = (f) => {
        f.folders.sort((a, b) => a.title.localeCompare(b.title));
        f.pages.sort((a, b) => a.title.localeCompare(b.title));
        f.folders.forEach(sort);
      };
      sort(root);
      return root;
    };
    const renderFolder = (f) => /* @__PURE__ */ jsxs("ul", { class: "mw-menu-sub", children: [
      f.folders.map((sub) => {
        const open = current === sub.page || current.startsWith(sub.path + "/");
        return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("details", { open, children: [
          /* @__PURE__ */ jsx("summary", { class: open ? "mw-active-section" : "", children: sub.page ? /* @__PURE__ */ jsx("a", { href: link(sub.page), class: current === sub.page ? "mw-active" : "", children: sub.title }) : sub.title }),
          renderFolder(sub)
        ] }) });
      }),
      f.pages.map((p) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: link(p.slug), class: current === p.slug ? "mw-active" : "", children: p.title }) }))
    ] });
    const exists = new Set(allFiles.map((f) => String(f.slug)));
    const link = (target) => resolveRelative(current, target);
    const groups = opts.groups.map((group) => {
      const items = group.items.map((item) => {
        if (item.page) {
          if (!exists.has(item.page)) return null;
          return { item, children: [], tree: null, active: current === item.page };
        }
        const prefix = `${item.section}/`;
        const children = pages.filter((p) => p.slug.startsWith(prefix));
        if (children.length === 0) return null;
        return { item, children, tree: buildTree(item.section, children), active: current.startsWith(prefix) };
      }).filter((x) => x !== null);
      return { label: group.label, items };
    }).filter((g) => g.items.length > 0);
    return /* @__PURE__ */ jsxs("nav", { class: `mw-menu ${displayClass ?? ""}`, "aria-label": "Wiki menu", children: [
      /* @__PURE__ */ jsx("button", { type: "button", class: "mw-menu-toggle", "aria-expanded": "false", children: "Menu" }),
      /* @__PURE__ */ jsx("div", { class: "mw-menu-body", children: groups.map((group) => /* @__PURE__ */ jsxs("div", { class: "mw-menu-group", children: [
        /* @__PURE__ */ jsx("div", { class: "mw-menu-label", children: group.label }),
        /* @__PURE__ */ jsx("ul", { children: group.items.map(
          ({ item, children, tree, active }) => children.length === 0 ? /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: link(item.page), class: active ? "mw-active" : "", children: item.title }) }) : /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("details", { open: active, children: [
            /* @__PURE__ */ jsx("summary", { class: active ? "mw-active-section" : "", children: item.title }),
            tree && renderFolder(tree)
          ] }) })
        ) })
      ] })) })
    ] });
  };
  SetMenu.css = SetMenu_default;
  SetMenu.afterDOMLoaded = `
document.addEventListener("nav", () => {
  for (const btn of document.querySelectorAll(".mw-menu-toggle")) {
    const nav = btn.closest(".mw-menu")
    const toggle = () => {
      const open = nav.classList.toggle("mw-open")
      btn.setAttribute("aria-expanded", String(open))
    }
    btn.addEventListener("click", toggle)
    window.addCleanup(() => btn.removeEventListener("click", toggle))
  }
})
`;
  return SetMenu;
});
export {
  SetMenu_default2 as SetMenu
};
