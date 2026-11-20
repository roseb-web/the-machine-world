// The set menu: fixed sections in a fixed order, instead of the folder tree.
// A section's submenu lists the published pages in it, and the section is hidden until it has any.

import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { resolveRelative } from "@quartz-community/utils"
import style from "./SetMenu.css"

export interface MenuItem {
  title: string
  page?: string // a single page, e.g. "index" or "calendar"
  section?: string // a folder of pages, e.g. "people"
}

export interface MenuGroup {
  label: string
  items: MenuItem[]
}

export interface SetMenuOptions {
  groups: MenuGroup[]
}

const defaultOptions: SetMenuOptions = {
  groups: [
    {
      label: "Explore",
      items: [
        { title: "Home", page: "index" },
        { title: "Maps", page: "maps" },
        { title: "Calendar", page: "calendar" },
        { title: "Timeline", page: "timeline" },
        { title: "Quest log", section: "quests" },
      ],
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
        { title: "Items", section: "items" },
      ],
    },
    {
      label: "The party",
      items: [
        { title: "The party", section: "party" },
        { title: "Handouts", page: "handouts" },
        { title: "Gallery", page: "gallery" },
        { title: "Session recaps", section: "sessions" },
      ],
    },
  ],
}

interface PageInfo {
  slug: string
  title: string
}

// A folder in a section's submenu, e.g. The Marrowlands > Thornwick.
interface Folder {
  path: string // e.g. "places/the-marrowlands"
  title: string
  page?: string // its own page, if it has one (e.g. Thornwick's)
  folders: Folder[]
  pages: PageInfo[]
}

function titleOf(file: QuartzComponentProps["allFiles"][number]): string {
  const fm = file.frontmatter as { title?: unknown } | undefined
  if (typeof fm?.title === "string" && fm.title) return fm.title
  const last = String(file.slug ?? "").split("/").pop() ?? ""
  return last.replace(/-/g, " ")
}

export default ((userOpts?: Partial<SetMenuOptions>) => {
  const opts: SetMenuOptions = { ...defaultOptions, ...userOpts }

  const SetMenu: QuartzComponent = ({ fileData, allFiles, displayClass }: QuartzComponentProps) => {
    const current = String(fileData.slug ?? "")
    const isFolderPage = (f: QuartzComponentProps["allFiles"][number]) =>
      (f.frontmatter as { mw_folder?: unknown } | undefined)?.mw_folder === true
    const pages: PageInfo[] = allFiles
      .filter((f) => f.slug && String(f.slug) !== "index" && !String(f.slug).startsWith("tags/") && !isFolderPage(f))
      .filter((f) => !String(f.slug).endsWith("/index") || String(f.slug).split("/").length > 2)
      .map((f) => ({ slug: String(f.slug), title: titleOf(f) }))
    const folderTitles = new Map(
      allFiles.filter((f) => String(f.slug).endsWith("/index")).map((f) => [String(f.slug).slice(0, -6), titleOf(f)]),
    )

    // Builds a section's tree from page paths. A page ending in "/index" is its folder's own page.
    const buildTree = (section: string, children: PageInfo[]): Folder => {
      const root: Folder = { path: section, title: section, folders: [], pages: [] }
      const folderAt = (path: string): Folder => {
        let node = root
        const parts = path.slice(section.length + 1).split("/").filter(Boolean)
        for (let i = 0; i < parts.length; i++) {
          const sub = `${section}/${parts.slice(0, i + 1).join("/")}`
          let next = node.folders.find((f) => f.path === sub)
          if (!next) {
            next = { path: sub, title: folderTitles.get(sub) ?? parts[i].replace(/-/g, " "), folders: [], pages: [] }
            node.folders.push(next)
          }
          node = next
        }
        return node
      }
      for (const p of children) {
        if (p.slug.endsWith("/index")) {
          const f = folderAt(p.slug.slice(0, -6))
          f.page = p.slug
          f.title = p.title
        } else {
          folderAt(p.slug.split("/").slice(0, -1).join("/")).pages.push(p)
        }
      }
      const sort = (f: Folder) => {
        f.folders.sort((a, b) => a.title.localeCompare(b.title))
        f.pages.sort((a, b) => a.title.localeCompare(b.title))
        f.folders.forEach(sort)
      }
      sort(root)
      return root
    }

    const renderFolder = (f: Folder) => (
      <ul class="mw-menu-sub">
        {f.folders.map((sub) => {
          const open = current === sub.page || current.startsWith(sub.path + "/")
          return (
            <li>
              <details open={open}>
                <summary class={open ? "mw-active-section" : ""}>
                  {sub.page ? (
                    <a href={link(sub.page)} class={current === sub.page ? "mw-active" : ""}>
                      {sub.title}
                    </a>
                  ) : (
                    sub.title
                  )}
                </summary>
                {renderFolder(sub)}
              </details>
            </li>
          )
        })}
        {f.pages.map((p) => (
          <li>
            <a href={link(p.slug)} class={current === p.slug ? "mw-active" : ""}>
              {p.title}
            </a>
          </li>
        ))}
      </ul>
    )
    const exists = new Set(allFiles.map((f) => String(f.slug)))
    const link = (target: string) => resolveRelative(current as never, target as never)

    const groups = opts.groups
      .map((group) => {
        const items = group.items
          .map((item) => {
            if (item.page) {
              if (!exists.has(item.page)) return null
              return { item, children: [] as PageInfo[], tree: null, active: current === item.page }
            }
            const prefix = `${item.section}/`
            const children = pages.filter((p) => p.slug.startsWith(prefix))
            if (children.length === 0) return null
            return { item, children, tree: buildTree(item.section!, children), active: current.startsWith(prefix) }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)
        return { label: group.label, items }
      })
      .filter((g) => g.items.length > 0)

    return (
      <nav class={`mw-menu ${displayClass ?? ""}`} aria-label="Wiki menu">
        <button type="button" class="mw-menu-toggle" aria-expanded="false">
          Menu
        </button>
        <div class="mw-menu-body">
          {groups.map((group) => (
            <div class="mw-menu-group">
              <div class="mw-menu-label">{group.label}</div>
              <ul>
                {group.items.map(({ item, children, tree, active }) =>
                  children.length === 0 ? (
                    <li>
                      <a href={link(item.page!)} class={active ? "mw-active" : ""}>
                        {item.title}
                      </a>
                    </li>
                  ) : (
                    <li>
                      <details open={active}>
                        <summary class={active ? "mw-active-section" : ""}>{item.title}</summary>
                        {tree && renderFolder(tree)}
                      </details>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    )
  }

  SetMenu.css = style

  // Phones: the menu folds away behind a "Menu" button.
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
`

  return SetMenu
}) satisfies QuartzComponentConstructor<Partial<SetMenuOptions>>
