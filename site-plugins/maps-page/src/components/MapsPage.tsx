// The Maps page: survey sheets with pins. Data comes from mw_maps (made by the export).
// The page itself is drawn here; the script below turns it into Leaflet maps in the browser.

import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { pathToRoot, resolveRelative } from "@quartz-community/utils"
import style from "./MapsPage.css"
// @ts-ignore: the browser script, bundled as plain text
import script from "./maps.inline.txt"

interface Pin {
  type: string
  lat: number
  lng: number
  title: string
  page?: string
  text?: string
}
interface MapData {
  title: string
  image: string
  minZoom?: number
  maxZoom?: number
  defaultZoom?: number
  zoomDelta?: number
  pins: Pin[]
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]
const linkTarget = (v: unknown) => (typeof v === "string" ? v.match(/^\[\[([^\]|]+)/)?.[1] : undefined)

export default (() => {
  const MapsPage: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
    const fm = (fileData.frontmatter ?? {}) as Record<string, unknown>
    const maps = Array.isArray(fm.mw_maps) ? (fm.mw_maps as MapData[]) : []
    if (!maps.length) return null
    const slug = String(fileData.slug ?? "")
    const root = pathToRoot(slug as never)
    const bySlug = new Map(allFiles.map((f) => [String(f.slug), f]))
    const home = bySlug.get("index")
    const party = linkTarget((home?.frontmatter as Record<string, unknown> | undefined)?.party_location)

    // Each pin gets what its card needs: link, type chip, first line, party flag.
    const data = maps.map((m) => ({
      ...m,
      image: `${root}/${m.image}`,
      pins: m.pins.map((p) => {
        const f = p.page ? bySlug.get(p.page) : undefined
        const pfm = (f?.frontmatter ?? {}) as Record<string, unknown>
        const summary = String(f?.description ?? "").replace(/^Overview\s*/, "")
        return {
          ...p,
          href: p.page ? resolveRelative(slug as never, p.page as never) : undefined,
          chip: typeof pfm.player_type === "string" ? pfm.player_type : undefined,
          summary: p.text ?? (summary ? summary.split(/(?<=[.!?])\s/)[0] : undefined),
          party: !!p.page && p.page === party,
        }
      }),
    }))

    return (
      <div class="mw-maps" data-maps={JSON.stringify(data)} data-leaflet={`${root}/static/leaflet/`}>
        {data.length > 1 && (
          <div class="mw-sheets" role="tablist">
            {data.map((m, i) => (
              <button type="button" role="tab" class={`mw-sheet-btn ${i === 0 ? "mw-on" : ""}`} data-sheet={i}>
                <span class="mw-sheet-no">Sheet {ROMAN[i] ?? i + 1}</span> {m.title}
              </button>
            ))}
          </div>
        )}
        <div class="mw-map-layout">
          <div class="mw-map-frame">
            <div class="mw-map" />
          </div>
          <aside class="mw-legend">
            <div class="mw-legend-title">Legend</div>
            <ul class="mw-legend-list" />
            <p class="mw-legend-hint">Hover a name to find it on the map. Click to go there.</p>
          </aside>
        </div>
      </div>
    )
  }

  MapsPage.css = style
  MapsPage.afterDOMLoaded = script
  return MapsPage
}) satisfies QuartzComponentConstructor
