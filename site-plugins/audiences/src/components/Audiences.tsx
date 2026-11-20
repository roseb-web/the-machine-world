// Audience views: a holder on every page, with what the browser needs after signing in:
// the page's locked sections and details (if any), its public header details (to rebuild the header
// with the locked ones added), and the way back to the site's root (for audiences.json and links).
// src/client.ts does the rest.
import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { pathToRoot } from "@quartz-community/utils"
import style from "./Audiences.css"

declare const __CLIENT__: string

// The properties the page header shows
const HEADER = ["title", "banner", "banner_focus", "photo", "player_sigil", "player_title", "player_say", "player_artist", "player_type", "player_species", "player_status", "player_faction", "player_favour", "player_standing", "player_seen", "spotify", "mw_dates", "mw_folder"]

export default (() => {
  const Audiences: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const fm = (fileData.frontmatter ?? {}) as Record<string, unknown>
    const slug = String(fileData.slug ?? "")
    const locks = Array.isArray(fm.mw_locked) ? fm.mw_locked : []
    const header = Object.fromEntries(HEADER.filter((k) => k in fm).map((k) => [k, fm[k]]))
    return (
      <div
        class="mw-aud"
        data-root={pathToRoot(slug as never)}
        data-slug={slug}
        data-locks={JSON.stringify(locks)}
        data-fm={locks.length ? JSON.stringify(header) : undefined}
        data-locked-page={fm.mw_locked_page === true ? "true" : undefined}
      />
    )
  }
  Audiences.css = style
  Audiences.afterDOMLoaded = __CLIENT__
  return Audiences
}) satisfies QuartzComponentConstructor
