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
        { title: "Quest log", section: "quests" },
      ],
    },
    {
      label: "The world",
      items: [
        { title: "Places", section: "places" },
        { title: "People", section: "people" },
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
        { title: "Session recaps", section: "sessions" },
      ],
    },
  ],
}

interface PageInfo {
  slug: string
  title: string
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
    const pages: PageInfo[] = allFiles
      .filter((f) => f.slug && !String(f.slug).endsWith("/index") && !String(f.slug).startsWith("tags/"))
      .map((f) => ({ slug: String(f.slug), title: titleOf(f) }))
    const exists = new Set(allFiles.map((f) => String(f.slug)))
    const link = (target: string) => resolveRelative(current as never, target as never)

    const groups = opts.groups
      .map((group) => {
        const items = group.items
          .map((item) => {
            if (item.page) {
              if (!exists.has(item.page)) return null
              return { item, children: [] as PageInfo[], active: current === item.page }
            }
            const prefix = `${item.section}/`
            const children = pages
              .filter((p) => p.slug.startsWith(prefix))
              .sort((a, b) => a.title.localeCompare(b.title))
            if (children.length === 0) return null
            return { item, children, active: current.startsWith(prefix) }
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
                {group.items.map(({ item, children, active }) =>
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
                        <ul class="mw-menu-sub">
                          {children.map((p) => (
                            <li>
                              <a href={link(p.slug)} class={current === p.slug ? "mw-active" : ""}>
                                {p.title}
                              </a>
                            </li>
                          ))}
                        </ul>
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
    }
    btn.addEventListener("click", toggle)
    window.addCleanup(() => btn.removeEventListener("click", toggle))
  }
})
`

  return SetMenu
}) satisfies QuartzComponentConstructor<Partial<SetMenuOptions>>
