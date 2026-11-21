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
      // Locked pages ("locked/...") are never listed: the audiences plugin adds them, with a lock, after signing in
      .filter((f) => f.slug && String(f.slug) !== "index" && !String(f.slug).startsWith("tags/") && !String(f.slug).startsWith("locked/") && !isFolderPage(f))
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

    const exists = new Set(allFiles.map((f) => String(f.slug)))
    // A folder's landing page: its own page (e.g. Thornwick's), or its folder page (e.g. "The Marrowlands")
    const landingOf = (path: string, page?: string) => page ?? (exists.has(`${path}/index`) ? `${path}/index` : undefined)
    // A folder's row: the name opens its landing page, the arrow opens or closes the list
    // (clicks on the link go to the page; clicks anywhere else on the row open or close it).
    const folderRow = (title: string, landing: string | undefined, open: boolean) => (
      <summary class={open ? "mw-active-section" : ""}>
        {landing ? (
          <a href={link(landing)} class={`mw-menu-name ${current === landing ? "mw-active" : ""}`}>
            {title}
          </a>
        ) : (
          <span class="mw-menu-name">{title}</span>
        )}
        <span class="mw-menu-arrow" title="Show or hide what's inside" />
      </summary>
    )

    // data-mw-path: where signed-in readers' locked pages go (see the audiences plugin)
    const renderFolder = (f: Folder) => (
      <ul class="mw-menu-sub" data-mw-path={f.path}>
        {f.folders.map((sub) => {
          const open = current === sub.page || current.startsWith(sub.path + "/")
          return (
            <li>
              <details open={open}>
                {folderRow(sub.title, landingOf(sub.path, sub.page), open)}
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
            // Nothing in it yet: kept, hidden, in case a signed-in reader has a locked page there
            if (children.length === 0) return { item, children, tree: null, active: false, empty: true }
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
            <div class="mw-menu-group" hidden={group.items.every((i) => "empty" in i)}>
              <div class="mw-menu-label">{group.label}</div>
              <ul>
                {group.items.map(({ item, children, tree, active, ...rest }) =>
                  "empty" in rest ? (
                    <li hidden>
                      <details>
                        <summary>{item.title}</summary>
                        <ul class="mw-menu-sub" data-mw-path={item.section} />
                      </details>
                    </li>
                  ) : children.length === 0 ? (
                    <li>
                      <a href={link(item.page!)} class={active ? "mw-active" : ""}>
                        {item.title}
                      </a>
                    </li>
                  ) : (
                    <li>
                      <details open={active}>
                        {folderRow(item.title, landingOf(item.section!), active)}
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
