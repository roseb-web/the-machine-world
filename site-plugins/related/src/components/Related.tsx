// The sections under a page's text: Affinity, Key NPCs, Places, Related quests and Related handouts.
// Everything is worked out from published pages, so nothing here can name an unpublished note.

import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { pathToRoot, resolveRelative } from "@quartz-community/utils"
import style from "./Related.css"

type File = QuartzComponentProps["allFiles"][number]
type Props = Record<string, unknown>

const props = (f: File) => (f.frontmatter ?? {}) as Props
const titleOf = (f: File) => String(props(f).title ?? String(f.slug).split("/").pop())
const linkTarget = (v: unknown) => (typeof v === "string" ? v.match(/^\[\[([^\]|]+)/)?.[1] : undefined)
// Real pages only: not the home page, and not folder pages (sections, or regions without a note)
const isPage = (f: File) => !!f.slug && String(f.slug) !== "index" && props(f).mw_folder !== true

const TONES: Record<string, string> = { enemy: "bad", shunned: "low", noticed: "good", chosen: "best" }

// Landing pages (Gods, Factions, Places, Lore...): a card for each page inside the folder.
// Card: banner, sigil + name + title, themes, "Read more". Pages with player_type "Overview" become a link at the top.
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined)
const listOf = (v: unknown): string[] =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : []).map((x) => String(x).trim()).filter(Boolean)
const plural = (t: string) => (/s$/i.test(t) ? t : /[^aeiou]y$/i.test(t) ? t.slice(0, -1) + "ies" : t + "s")

function Landing({ slug, root, href, allFiles }: { slug: string; root: string; href: (t: string) => string; allFiles: File[] }) {
  const inside = slug.endsWith("index") ? slug.slice(0, -"index".length) : slug + "/"
  // Direct children: pages in this folder, and the index page of each folder inside it
  const kids = allFiles
    .filter((f) => {
      const s = String(f.slug ?? "")
      if (!s.startsWith(inside) || s === slug) return false
      const rest = s.slice(inside.length)
      return !rest.includes("/") || /^[^/]+\/index$/.test(rest)
    })
    .sort((a, b) => titleOf(a).localeCompare(titleOf(b)))
  const overviews = kids.filter((f) => props(f).player_type === "Overview")
  const cards = kids.filter((f) => props(f).player_type !== "Overview")
  if (cards.length === 0 && overviews.length === 0) return null

  // Group by type only when every type has at least two cards (e.g. New gods / Old gods)
  const types = new Map<string, File[]>()
  for (const f of cards) {
    const t = str(props(f).player_type) ?? ""
    types.set(t, [...(types.get(t) ?? []), f])
  }
  const grouped = types.size > 1 && [...types.keys()].every((t) => t && types.get(t)!.length >= 2)
  const groups: [string | undefined, File[]][] = grouped
    ? [...types.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([t, fs]) => [plural(t), fs])
    : [[undefined, cards]]

  const img = (v: unknown) => {
    const p = str(v)
    return p ? (/^https?:/.test(p) ? p : `${root}/${p}`) : undefined
  }
  const card = (f: File) => {
    const p = props(f)
    const title = titleOf(f)
    const banner = img(p.banner)
    const sigil = img(p.player_sigil)
    const themes = listOf(p.player_themes)
    const sub = str(p.player_title) ?? (grouped ? undefined : str(p.player_type))
    const initial = title.replace(/^the\s+/i, "").charAt(0).toUpperCase()
    const focus = str(p.banner_focus)
    return (
      <a href={href(String(f.slug))} class="mw-card internal">
        <div class="mw-card-inner">
          {banner ? (
            <div class="mw-card-banner" style={`background-image:url('${banner}')${focus ? `;background-position:${focus}` : ""}`} />
          ) : (
            <div class="mw-card-banner mw-card-blank">
              {sigil ? <img src={sigil} alt="" /> : <span>{initial}</span>}
            </div>
          )}
          <div class="mw-card-row mw-card-name">
            {sigil && (
              <span class="mw-card-sigil">
                <img src={sigil} alt="" />
              </span>
            )}
            <span class="mw-card-title">
              {title}
              {sub && <small>{sub}</small>}
            </span>
          </div>
          {themes.length > 0 && (
            <div class="mw-card-row mw-card-themes">
              {themes.map((t) => (
                <span>{t}</span>
              ))}
            </div>
          )}
          <div class="mw-card-row mw-card-more">Read more →</div>
        </div>
      </a>
    )
  }

  return (
    <div class="mw-landing">
      {overviews.map((f) => (
        <p class="mw-landing-overview">
          <a href={href(String(f.slug))} class="internal">
            Read the overview: {titleOf(f)} →
          </a>
        </p>
      ))}
      {groups.map(([name, fs]) => (
        <section>
          {name && <h2>{name}</h2>}
          <div class="mw-cards">{fs.map(card)}</div>
        </section>
      ))}
    </div>
  )
}

export default (() => {
  const Related: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const slug = String(fileData.slug ?? "")
    const fm = (fileData.frontmatter ?? {}) as Props
    if (!slug || slug === "index") return null
    const root = pathToRoot(slug as never)
    const href = (target: string) => resolveRelative(slug as never, target as never)
    const pages = allFiles.filter(isPage)
    if (fm.mw_folder === true) return <Landing slug={slug} root={root} href={href} allFiles={allFiles} />
    const ownLinks = new Set((fileData.links ?? []).map(String))

    // Affinity (gods): only the characters that have one set
    // The name shown is the part after "affinity_", e.g. affinity_neri -> Neri
    const affinity = Object.keys(fm)
      .filter((key) => key.startsWith("affinity_") && typeof fm[key] === "string" && fm[key])
      .map((key): [string, string] => [key, key.slice(9).charAt(0).toUpperCase() + key.slice(10)])

    // Key NPCs: people whose faction or last-seen place is this page
    const npcs = pages.filter(
      (f) =>
        String(f.slug).startsWith("people/") &&
        String(f.slug) !== slug &&
        (linkTarget(props(f).player_faction) === slug || linkTarget(props(f).player_seen) === slug),
    )

    // Places: on a place with places inside it, the ones directly inside.
    // On other pages, the places this page links to.
    const inside = slug.endsWith("/index") ? slug.slice(0, -"index".length) : null
    const places = slug.startsWith("places/")
      ? inside
        ? pages.filter((f) => {
            const s = String(f.slug)
            if (s === slug || !s.startsWith(inside)) return false
            const rest = s.slice(inside.length)
            return !rest.includes("/") || /^[^/]+\/index$/.test(rest)
          })
        : []
      : pages.filter((f) => String(f.slug).startsWith("places/") && ownLinks.has(String(f.slug)))

    // Quests that link here
    const quests = pages.filter(
      (f) => typeof props(f).quest === "string" && String(f.slug) !== slug && (f.links ?? []).map(String).includes(slug),
    )

    // Handouts listed on this page
    const handouts = (Array.isArray(fm.player_handouts) ? fm.player_handouts : [fm.player_handouts]).filter(
      (h): h is string => typeof h === "string" && h.length > 0,
    )

    // Moodboard: pins fetched from Pinterest when publishing (mw_moodboard), for the page's `pinterest` link
    type Pin = { img: string; big: string; w: number; h: number; pin: string; alt?: string }
    const mood = (Array.isArray(fm.mw_moodboard) ? (fm.mw_moodboard as Pin[]) : []).filter((p) => p && typeof p.img === "string")
    const boardUrl = typeof fm.pinterest === "string" && /^https:\/\/([a-z]{2,3}\.)?pinterest\./i.test(fm.pinterest) ? fm.pinterest : undefined
    const SHOWN = 12
    const tile = (p: Pin) => (
      <a href={p.big} class="mw-mood-tile" target="_blank" rel="noopener">
        <img src={p.img} width={p.w} height={p.h} alt={p.alt ?? ""} loading="lazy" />
      </a>
    )

    if (!affinity.length && !npcs.length && !places.length && !quests.length && !handouts.length && !mood.length) return null

    return (
      <div class="mw-related">
        {affinity.length > 0 && (
          <section>
            <h2>Affinity</h2>
            <div class="mw-affinity">
              {affinity.map(([key, name]) => {
                const label = String(fm[key])
                return (
                  <div class="mw-affinity-card">
                    <span class="mw-affinity-name">{name}</span>
                    <span class={`mw-chip mw-tone-${TONES[label.toLowerCase()] ?? "mid"}`}>{label}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {npcs.length > 0 && (
          <section>
            <h2>Key NPCs</h2>
            <div class="mw-npc-grid">
              {npcs.map((f) => {
                const p = props(f)
                return (
                  <a href={href(String(f.slug))} class="internal mw-npc-card">
                    {typeof p.photo === "string" ? (
                      <img src={`${root}/${p.photo}`} alt="" />
                    ) : (
                      <span class="mw-npc-noimg" />
                    )}
                    <span class="mw-npc-name">{titleOf(f)}</span>
                    {typeof p.player_title === "string" && <span class="mw-npc-role">{p.player_title}</span>}
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {(places.length > 0 || quests.length > 0) && (
          <div class="mw-related-columns">
            {places.length > 0 && (
              <section>
                <h2>Places</h2>
                <ul>
                  {places.map((f) => (
                    <li>
                      <a href={href(String(f.slug))} class="internal">{titleOf(f)}</a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {quests.length > 0 && (
              <section>
                <h2>Related quests</h2>
                <ul>
                  {quests.map((f) => (
                    <li>
                      <span class="mw-mini-chip">{String(props(f).quest)}</span>
                      <a href={href(String(f.slug))} class="internal">{titleOf(f)}</a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        {handouts.length > 0 && (
          <section>
            <h2>Related handouts</h2>
            <div class="mw-handouts">
              {handouts.map((h, i) => {
                const src = `${root}/${h}`
                const names = Array.isArray(fm.mw_handout_names) ? (fm.mw_handout_names as string[]) : []
                const name = names[i] ?? (h.split("/").pop() ?? h).replace(/\.[a-z]+$/i, "").replace(/-/g, " ")
                return (
                  <a href={src} class="mw-handout" target="_blank" rel="noopener">
                    <img src={src} alt={name} loading="lazy" />
                    <span>{name}</span>
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {mood.length > 0 && (
          <section class="mw-mood">
            <div class="mw-mood-head">
              <h2>Moodboard</h2>
              {boardUrl && (
                <a href={boardUrl} class="external mw-mood-link" target="_blank" rel="noopener">
                  Open on Pinterest
                </a>
              )}
            </div>
            <div class="mw-mood-grid">{mood.slice(0, SHOWN).map(tile)}</div>
            {mood.length > SHOWN && (
              <details class="mw-mood-more">
                <summary>Show {mood.length - SHOWN} more</summary>
                <div class="mw-mood-grid">{mood.slice(SHOWN).map(tile)}</div>
              </details>
            )}
          </section>
        )}
      </div>
    )
  }

  Related.css = style
  // Handouts page (a Player Page with cssclasses: mw-handouts-page): each image gets its caption
  // (the text after | in the note) underneath, and opens full size when clicked.
  Related.afterDOMLoaded = `
document.addEventListener("nav", () => {
  for (const img of document.querySelectorAll("article.mw-handouts-page img:not([data-mw-done])")) {
    img.dataset.mwDone = "1"
    const fig = document.createElement("figure")
    fig.className = "mw-handout-fig"
    const a = document.createElement("a")
    a.href = img.getAttribute("src")
    a.target = "_blank"
    a.rel = "noopener"
    img.replaceWith(fig)
    a.appendChild(img)
    fig.appendChild(a)
    const text = img.getAttribute("alt")
    if (text) {
      const cap = document.createElement("figcaption")
      cap.textContent = text
      fig.appendChild(cap)
    }
  }
})
`
  return Related
}) satisfies QuartzComponentConstructor
