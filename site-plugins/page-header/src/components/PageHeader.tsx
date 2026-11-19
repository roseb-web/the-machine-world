// The page header: title, plus the portrait, subtitle and chips from the player properties.
// Replaces Quartz's plain article title. Pages without player properties just get the title.

import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { pathToRoot, resolveRelative } from "@quartz-community/utils"
import style from "./PageHeader.css"

type Props = Record<string, unknown>

// "[[people/pell|Pell]]" -> { target: "people/pell", text: "Pell" }. Plain text stays plain.
function parseLink(value: string): { target?: string; text: string } {
  const m = value.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/)
  if (!m) return { text: value }
  return { target: m[1], text: m[2] ?? m[1].split("/").pop() ?? m[1] }
}

function renderLink(slug: string, value: string) {
  const { target, text } = parseLink(value)
  return target ? <a href={resolveRelative(slug as never, target as never)} class="internal">{text}</a> : text
}

// Each fixed label gets a tone, from bad to good.
const TONES: Record<string, string> = {
  hostile: "bad", grudge: "bad", enemy: "bad",
  wary: "low", cold: "low", shunned: "low",
  neutral: "mid",
  friendly: "good", warm: "good", noticed: "good",
  allied: "best", favoured: "best", chosen: "best",
}

export default (() => {
  const PageHeader: QuartzComponent = (props: QuartzComponentProps) => {
    const fm = (props.fileData.frontmatter ?? {}) as Props
    const slug = String(props.fileData.slug ?? "")
    const str = (key: string) => (typeof fm[key] === "string" && fm[key] ? (fm[key] as string) : undefined)
    const banner = str("banner")
    const focus = ["top", "center", "bottom"].includes(str("banner_focus") ?? "") ? str("banner_focus") : "center"
    const header = renderHeader(props, fm, slug, str)
    if (!banner) return header
    return (
      <div class="mw-header-wrap">
        <img
          class="mw-banner"
          src={`${pathToRoot(slug as never)}/${banner}`}
          alt=""
          style={`object-position: center ${focus};`}
        />
        {header}
      </div>
    )
  }

  PageHeader.css = style
  return PageHeader
}) satisfies QuartzComponentConstructor

function renderHeader(
  { fileData }: QuartzComponentProps,
  fm: Props,
  slug: string,
  str: (key: string) => string | undefined,
) {
    const title = str("title") ?? slug.split("/").pop() ?? ""

    const renderValue = (value: string) => {
      const { target, text } = parseLink(value)
      return target ? <a href={resolveRelative(slug as never, target as never)} class="internal">{text}</a> : text
    }

    const chips: { text: string; tone?: string; label?: string }[] = []
    for (const key of ["player_type", "player_species", "player_status"]) {
      const v = str(key)
      if (v) chips.push({ text: parseLink(v).text })
    }
    const faction = str("player_faction")
    for (const [key, label] of [["player_favour", "Favour"], ["player_standing", "Standing"]] as const) {
      const v = str(key)
      if (v) chips.push({ text: `${label}: ${v.toLowerCase()}`, tone: TONES[v.toLowerCase()] ?? "mid" })
    }

    // The home page: a welcome title and today's in-game date.
    if (slug === "index") {
      const d = fm.game_date as
        | { day: number; month: string; year: number; era: string; weekday: string; concord: string; season: string }
        | undefined
      return (
        <header class="mw-header mw-home-header">
          <div>
            <h1 class="article-title">Welcome to Vaharan</h1>
            {str("party_location") && (
              <p class="mw-party-location">The party is in {renderLink(slug, str("party_location")!)}</p>
            )}
          </div>
          {d && (
            <div class="mw-date-card" title={d.concord}>
              <div class="mw-date-day">{d.day}</div>
              <div class="mw-date-text">
                <div class="mw-date-month">
                  {d.month}, {d.year} {d.era}
                </div>
                <div class="mw-date-other">
                  {d.weekday} · {d.season}
                </div>
              </div>
            </div>
          )}
        </header>
      )
    }

    const photo = str("photo")
    const subtitle = str("player_title")
    const seen = str("player_seen")
    const hasDetails = photo || subtitle || chips.length > 0 || faction || seen

    if (!hasDetails) {
      return <h1 class="article-title">{title}</h1>
    }

    const root = pathToRoot(slug as never)
    return (
      <header class={`mw-header ${photo ? "mw-has-photo" : ""}`}>
        {photo && <img class="mw-portrait" src={`${root}/${photo}`} alt={`Portrait of ${title}`} />}
        <div class="mw-header-text">
          <h1 class="article-title">{title}</h1>
          {subtitle && <p class="mw-subtitle">{subtitle}</p>}
          {(chips.length > 0 || faction) && (
            <div class="mw-chips">
              {faction && <span class="mw-chip">{renderValue(faction)}</span>}
              {chips.map((c) => (
                <span class={`mw-chip ${c.tone ? `mw-tone-${c.tone}` : ""}`}>{c.text}</span>
              ))}
            </div>
          )}
          {seen && <p class="mw-seen">Last seen: {renderValue(seen)}</p>}
        </div>
      </header>
    )
}
