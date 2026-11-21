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
  // A folder of quests gets the quest log instead (quest-log plugin)
  if (cards.every((f) => typeof props(f).quest === "string")) return null

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

// Gallery page: player art, newest first, with filters for artist, character and session.
// The masonry layout and the filters are done in the browser (see afterDOMLoaded below).
interface GRef {
  name: string
  to?: string
}
interface GItem {
  img: string
  description?: string
  artist?: string
  date?: string
  sessions?: GRef[]
  characters?: GRef[]
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const niceDate = (d?: string) => {
  const m = d?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : d
}

function Gallery({ items, root, href }: { items: GItem[]; root: string; href: (t: string) => string }) {
  const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))]
  const artists = uniq(items.map((i) => i.artist ?? "")).sort((a, b) => a.localeCompare(b))
  const chars = uniq(items.flatMap((i) => (i.characters ?? []).map((c) => c.name))).sort((a, b) => a.localeCompare(b))
  const sessions = uniq(items.flatMap((i) => (i.sessions ?? []).map((c) => c.name))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  )
  const pick = (label: string, key: string, all: string, opts: string[]) => (
    <label>
      {label}
      <select data-filter={key}>
        <option value="">{all}</option>
        {opts.map((o) => (
          <option value={o}>{o}</option>
        ))}
      </select>
    </label>
  )
  const chip = (r: GRef, cls: string) =>
    r.to ? (
      <a href={href(r.to)} class={`internal mw-gchip ${cls}`}>
        {r.name}
      </a>
    ) : (
      <span class={`mw-gchip ${cls}`}>{r.name}</span>
    )
  return (
    <div class="mw-gallery">
      <div class="mw-gallery-filters">
        {pick("Artist", "artist", "Everyone", artists)}
        {pick("Character", "character", "Everyone", chars)}
        {pick("Session", "session", "All sessions", sessions)}
        <button type="button" class="mw-gallery-clear">
          Clear
        </button>
        <span class="mw-gallery-count">
          {items.length} {items.length === 1 ? "picture" : "pictures"}
        </span>
      </div>
      <div class="mw-gallery-grid">
        {items.map((it) => (
          <figure
            class="mw-gcard"
            data-artist={it.artist ?? ""}
            data-character={(it.characters ?? []).map((c) => c.name).join("\n")}
            data-session={(it.sessions ?? []).map((c) => c.name).join("\n")}
          >
            <a href={`${root}/${it.img}`} target="_blank" rel="noopener" class="mw-gcard-img">
              <img src={`${root}/${it.img}`} alt={it.description ?? "Player art"} />
            </a>
            <figcaption>
              {it.description && <span class="mw-gcard-desc">{it.description}</span>}
              {it.artist && <span class="mw-gcard-by">by {it.artist}</span>}
              <span class="mw-gcard-meta">
                {(it.characters ?? []).map((c) => chip(c, "mw-gchip-char"))}
                {(it.sessions ?? []).map((c) => chip(c, ""))}
                {it.date && <span class="mw-gcard-date">{niceDate(it.date)}</span>}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p class="mw-gallery-none" hidden>
        No pictures match. Try another filter.
      </p>
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
    if (Array.isArray(fm.mw_gallery)) return <Gallery items={fm.mw_gallery as GItem[]} root={root} href={href} />
    const ownLinks = new Set((fileData.links ?? []).map(String))

    // Affinity (gods): only the characters that have one set
    // The name shown is the part after "affinity_", e.g. affinity_tam -> Tam
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

// Gallery: masonry columns (each picture goes in the shortest column, newest first) and filters
document.addEventListener("nav", () => {
  const root = document.querySelector(".mw-gallery")
  if (!root || root.dataset.mwDone) return
  root.dataset.mwDone = "1"
  const grid = root.querySelector(".mw-gallery-grid")
  const cards = [...root.querySelectorAll(".mw-gcard")]
  const selects = [...root.querySelectorAll("select[data-filter]")]
  const count = root.querySelector(".mw-gallery-count")
  const none = root.querySelector(".mw-gallery-none")
  let lastWidth = 0
  const layout = () => {
    const shown = cards.filter((c) => !c.hidden)
    const n = Math.max(2, Math.floor(grid.clientWidth / 215))
    for (const c of cards) grid.appendChild(c)
    grid.querySelectorAll(".mw-gcol").forEach((c) => c.remove())
    const cols = Array.from({ length: n }, () => {
      const d = document.createElement("div")
      d.className = "mw-gcol"
      grid.appendChild(d)
      return { d, h: 0 }
    })
    for (const c of shown) {
      const col = cols.reduce((a, b) => (b.h < a.h - 1 ? b : a))
      col.d.appendChild(c)
      col.h += c.offsetHeight + 14
    }
    grid.classList.add("mw-masonry")
    lastWidth = grid.clientWidth
  }
  const filter = () => {
    const want = Object.fromEntries(selects.map((s) => [s.dataset.filter, s.value]))
    let n = 0
    for (const c of cards) {
      const ok = Object.entries(want).every(([k, v]) => !v || (c.dataset[k] || "").split("\\n").includes(v))
      c.hidden = !ok
      if (ok) n++
    }
    count.textContent = n + (n === 1 ? " picture" : " pictures")
    none.hidden = n > 0
    layout()
  }
  selects.forEach((s) => s.addEventListener("change", filter))
  root.querySelector(".mw-gallery-clear").addEventListener("click", () => {
    selects.forEach((s) => (s.value = ""))
    filter()
  })
  let queued = false
  const relayout = () => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      layout()
    })
  }
  for (const img of root.querySelectorAll("img")) {
    img.loading = "eager"
    if (!img.complete) {
      img.addEventListener("load", relayout)
      img.addEventListener("error", relayout)
    }
  }
  const ro = new ResizeObserver(() => Math.abs(grid.clientWidth - lastWidth) > 4 && relayout())
  ro.observe(grid)
  window.addCleanup?.(() => ro.disconnect())
  layout()
})
`
  return Related
}) satisfies QuartzComponentConstructor
