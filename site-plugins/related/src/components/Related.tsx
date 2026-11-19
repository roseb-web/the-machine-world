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

export default (() => {
  const Related: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const slug = String(fileData.slug ?? "")
    const fm = (fileData.frontmatter ?? {}) as Props
    if (!slug || slug === "index" || fm.mw_folder === true) return null
    const root = pathToRoot(slug as never)
    const href = (target: string) => resolveRelative(slug as never, target as never)
    const pages = allFiles.filter(isPage)
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

    if (!affinity.length && !npcs.length && !places.length && !quests.length && !handouts.length) return null

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
              {handouts.map((h) => {
                const src = `${root}/${h}`
                const name = (h.split("/").pop() ?? h).replace(/\.[a-z]+$/i, "").replace(/-/g, " ")
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
      </div>
    )
  }

  Related.css = style
  return Related
}) satisfies QuartzComponentConstructor
