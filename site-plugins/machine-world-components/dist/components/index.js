// src/components/SetMenu.tsx
import { resolveRelative } from "@quartz-community/utils";

// src/components/SetMenu.css
var SetMenu_default = `.mw-menu {
  font-family: var(--bodyFont);
  font-size: 0.95rem;
}

.mw-menu ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mw-menu li {
  margin: 0;
}

.mw-menu-label {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--gray);
  margin: 1.2rem 0 0.3rem;
}

.mw-menu-group:first-child .mw-menu-label {
  margin-top: 0.4rem;
}

.mw-menu a,
.mw-menu summary {
  display: block;
  padding: 0.15rem 0;
  color: var(--dark);
  font-weight: 500;
  text-decoration: none;
  background: none;
  cursor: pointer;
}

.mw-menu summary {
  list-style: none;
}

.mw-menu summary::-webkit-details-marker {
  display: none;
}

.mw-menu summary::after {
  content: "\u203A";
  display: inline-block;
  margin-left: 0.4rem;
  color: var(--gray);
  transition: transform 0.2s ease;
}

.mw-menu details[open] > summary::after {
  transform: rotate(90deg);
}

.mw-menu a:hover,
.mw-menu summary:hover {
  color: var(--secondary);
}

.mw-menu-sub {
  border-left: 1px solid var(--lightgray);
  margin: 0.1rem 0 0.4rem 0.3rem !important;
  padding-left: 0.8rem !important;
}

.mw-menu-sub a {
  font-weight: 400;
  color: var(--darkgray);
}

.mw-menu .mw-active,
.mw-menu .mw-active-section {
  color: var(--secondary);
}

.mw-menu-toggle {
  display: none;
}

@media (max-width: 800px) {
  .mw-menu-toggle {
    display: block;
    font-family: var(--bodyFont);
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--dark);
    background: none;
    border: 1px solid var(--lightgray);
    border-radius: 6px;
    padding: 0.3rem 0.8rem;
    cursor: pointer;
  }

  .mw-menu .mw-menu-body {
    display: none;
  }

  .mw-menu.mw-open .mw-menu-body {
    display: block;
  }
}

/* Folders inside a section (e.g. The Marrowlands > Thornwick): same look as pages */
.mw-menu-sub summary {
  font-weight: 400;
  color: var(--darkgray);
}

/* A folder with its own page: the name is a link, the arrow opens the list */
.mw-menu summary > a {
  display: inline;
  padding: 0;
}

.mw-menu-sub .mw-active-section > a:not(.mw-active) {
  color: var(--darkgray);
}

/* Folder rows: the name is a link to the folder's landing page, the arrow is its own button */
.mw-menu summary {
  display: flex;
  align-items: center;
  gap: 0.15rem;
}
.mw-menu summary::after {
  content: none;
}
.mw-menu summary > .mw-menu-name {
  display: inline;
  padding: 0.05rem 0.35rem;
  margin-left: -0.35rem;
  border-radius: 6px;
  color: inherit;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.mw-menu summary > a.mw-menu-name:hover {
  background: color-mix(in srgb, var(--secondary) 14%, transparent);
  color: var(--secondary);
}
.mw-menu summary > a.mw-menu-name.mw-active {
  color: var(--secondary);
}
.mw-menu summary:hover {
  color: inherit;
}
.mw-menu-arrow {
  flex: none;
  width: 1.5rem;
  height: 1.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--gray);
  transition: background-color 0.15s ease, color 0.15s ease;
}
.mw-menu-arrow::before {
  content: "\u203A";
  font-size: 1.1rem;
  line-height: 1;
  transition: transform 0.2s ease;
}
.mw-menu details[open] > summary > .mw-menu-arrow::before {
  transform: rotate(90deg);
}
.mw-menu-arrow:hover {
  background: var(--lightgray);
  color: var(--dark);
}
@media (max-width: 800px) {
  .mw-menu-arrow { width: 2rem; height: 2rem; }
}
`;

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
        { title: "Timeline", page: "timeline" },
        { title: "Quest log", section: "quests" }
      ]
    },
    {
      label: "The world",
      items: [
        { title: "Places", section: "places" },
        { title: "People", section: "people" },
        { title: "People web", page: "people-web" },
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
        { title: "Handouts", page: "handouts" },
        { title: "Gallery", page: "gallery" },
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
    const pages = allFiles.filter((f) => f.slug && String(f.slug) !== "index" && !String(f.slug).startsWith("tags/") && !String(f.slug).startsWith("locked/") && !isFolderPage(f)).filter((f) => !String(f.slug).endsWith("/index") || String(f.slug).split("/").length > 2).map((f) => ({ slug: String(f.slug), title: titleOf(f) }));
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
    const exists = new Set(allFiles.map((f) => String(f.slug)));
    const landingOf = (path, page) => page ?? (exists.has(`${path}/index`) ? `${path}/index` : void 0);
    const folderRow = (title, landing, open) => /* @__PURE__ */ jsxs("summary", { class: open ? "mw-active-section" : "", children: [
      landing ? /* @__PURE__ */ jsx("a", { href: link(landing), class: `mw-menu-name ${current === landing ? "mw-active" : ""}`, children: title }) : /* @__PURE__ */ jsx("span", { class: "mw-menu-name", children: title }),
      /* @__PURE__ */ jsx("span", { class: "mw-menu-arrow", title: "Show or hide what's inside" })
    ] });
    const renderFolder = (f) => /* @__PURE__ */ jsxs("ul", { class: "mw-menu-sub", "data-mw-path": f.path, children: [
      f.folders.map((sub) => {
        const open = current === sub.page || current.startsWith(sub.path + "/");
        return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("details", { open, children: [
          folderRow(sub.title, landingOf(sub.path, sub.page), open),
          renderFolder(sub)
        ] }) });
      }),
      f.pages.map((p) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: link(p.slug), class: current === p.slug ? "mw-active" : "", children: p.title }) }))
    ] });
    const link = (target) => resolveRelative(current, target);
    const groups = opts.groups.map((group) => {
      const items = group.items.map((item) => {
        if (item.page) {
          if (!exists.has(item.page)) return null;
          return { item, children: [], tree: null, active: current === item.page };
        }
        const prefix = `${item.section}/`;
        const children = pages.filter((p) => p.slug.startsWith(prefix));
        if (children.length === 0) return { item, children, tree: null, active: false, empty: true };
        return { item, children, tree: buildTree(item.section, children), active: current.startsWith(prefix) };
      }).filter((x) => x !== null);
      return { label: group.label, items };
    }).filter((g) => g.items.length > 0);
    return /* @__PURE__ */ jsxs("nav", { class: `mw-menu ${displayClass ?? ""}`, "aria-label": "Wiki menu", children: [
      /* @__PURE__ */ jsx("button", { type: "button", class: "mw-menu-toggle", "aria-expanded": "false", children: "Menu" }),
      /* @__PURE__ */ jsx("div", { class: "mw-menu-body", children: groups.map((group) => /* @__PURE__ */ jsxs("div", { class: "mw-menu-group", hidden: group.items.every((i) => "empty" in i), children: [
        /* @__PURE__ */ jsx("div", { class: "mw-menu-label", children: group.label }),
        /* @__PURE__ */ jsx("ul", { children: group.items.map(
          ({ item, children, tree, active, ...rest }) => "empty" in rest ? /* @__PURE__ */ jsx("li", { hidden: true, children: /* @__PURE__ */ jsxs("details", { children: [
            /* @__PURE__ */ jsx("summary", { children: item.title }),
            /* @__PURE__ */ jsx("ul", { class: "mw-menu-sub", "data-mw-path": item.section })
          ] }) }) : children.length === 0 ? /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("a", { href: link(item.page), class: active ? "mw-active" : "", children: item.title }) }) : /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("details", { open: active, children: [
            folderRow(item.title, landingOf(item.section), active),
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
      btn.textContent = open ? "Close" : "Menu"
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
