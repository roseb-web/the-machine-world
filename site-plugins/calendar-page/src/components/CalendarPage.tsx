// Calendar and Timeline pages. The page holds the data; src/client.ts draws it in the browser.
import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { resolveRelative } from "@quartz-community/utils"
import style from "./CalendarPage.css"

declare const __CLIENT__: string

export default (() => {
  const CalendarPage: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const fm = (fileData.frontmatter ?? {}) as Record<string, unknown>
    const cal = fm.mw_calendar as { events?: { page?: string }[] } | undefined
    if (!cal || typeof cal !== "object") return null
    const slug = String(fileData.slug ?? "")
    // Links are made relative to this page here, so the browser code doesn't need to know the site's address.
    const data = {
      ...cal,
      events: (cal.events ?? []).map((e) => (e.page ? { ...e, href: resolveRelative(slug as never, e.page as never) } : e)),
    }
    const mode = fm.mw_timeline === true ? "timeline" : "calendar"
    return <div class={`mw-cal mw-cal-${mode}`} data-mode={mode} data-cal={JSON.stringify(data)} />
  }
  CalendarPage.css = style
  CalendarPage.afterDOMLoaded = __CLIENT__
  return CalendarPage
}) satisfies QuartzComponentConstructor
