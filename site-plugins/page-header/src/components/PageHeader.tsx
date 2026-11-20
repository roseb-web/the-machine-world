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
            <h1 class="article-title">{str("mw_welcome") ?? "Welcome"}</h1>
            {str("party_location") && (
              <p class="mw-party-location">The party is in {renderLink(slug, str("party_location")!)}</p>
            )}
          </div>
          {d && (
            <div class="mw-date-card" title={d.concord || undefined}>
              <div class="mw-date-day">{d.day}</div>
              <div class="mw-date-text">
                <div class="mw-date-month">
                  {d.month}, {`${d.year} ${d.era}`.trim()}
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
    const sigil = photo ? undefined : str("player_sigil")
    const subtitle = str("player_title")
    // How to say the name, e.g. "loo-KAS-tra"
    const say = str("player_say")
    // Who drew the portrait: plain text, or a markdown link [Name](https://...)
    const artist = photo ? str("player_artist") : undefined
    const artistLink = artist?.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)
    const seen = str("player_seen")
    const song = spotifyEmbed(str("spotify"))
    // Date cards: when this page's events happen (added by the export from Calendarium)
    const dates = Array.isArray(fm.mw_dates) ? (fm.mw_dates as unknown[]).filter((d): d is string => typeof d === "string") : []
    const hasDetails = photo || sigil || subtitle || say || chips.length > 0 || faction || seen || dates.length > 0 || song

    if (!hasDetails) {
      return <h1 class="article-title">{title}</h1>
    }

    const root = pathToRoot(slug as never)
    return (
      <header
        class={`mw-header ${photo ? "mw-has-photo" : sigil ? "mw-has-sigil" : ""} ${fm.mw_folder === true ? "mw-folder-header" : ""}`}
      >
        {photo && (
          <figure class="mw-portrait-fig">
            <img class="mw-portrait" src={`${root}/${photo}`} alt={`Portrait of ${title}`} />
            {artist && (
              <figcaption class="mw-artist">
                Art:{" "}
                {artistLink ? (
                  <a href={artistLink[2]} class="external" target="_blank" rel="noopener">
                    {artistLink[1]}
                  </a>
                ) : (
                  artist
                )}
              </figcaption>
            )}
          </figure>
        )}
        {sigil && <img class="mw-sigil" src={`${root}/${sigil}`} alt="" />}
        <div class="mw-header-text">
          <h1 class="article-title">{title}</h1>
          {say && (
            <p class="mw-say" title="How to say it">
              <span class="mw-say-label">Say it</span> {say}
            </p>
          )}
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
          {dates.map((d) => (
            <p class="mw-datecard">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" fill="none" stroke="currentColor" />
                <path d="M1.5 6h13M5 1v3M11 1v3" stroke="currentColor" />
              </svg>
              {d}
            </p>
          ))}
          {song && (
            <iframe
              class="mw-song"
              title="Theme song"
              src={song.src}
              height={song.height}
              loading="lazy"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            />
          )}
        </div>
      </header>
    )
}

// A Spotify share link -> Spotify's own small player.
// "https://open.spotify.com/track/ID?si=..." (also album, playlist and episode links)
function spotifyEmbed(url: string | undefined): { src: string; height: number } | null {
  const m = url?.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]+)/)
  if (!m) return null
  return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator`, height: m[1] === "track" || m[1] === "episode" ? 80 : 152 }
}
