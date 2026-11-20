// The People web page. The page holds the data; src/client.ts draws it in the browser.
import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "@quartz-community/types"
import { pathToRoot, resolveRelative } from "@quartz-community/utils"
import style from "./PeopleWebPage.css"

declare const __CLIENT__: string

export default (() => {
  const PeopleWebPage: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const fm = (fileData.frontmatter ?? {}) as Record<string, unknown>
    const web = fm.mw_web as { people?: { open?: string; photo?: string }[]; groups?: { open?: string }[] } | undefined
    if (!web || typeof web !== "object") return null
    const slug = String(fileData.slug ?? "")
    // Links and pictures are made relative to this page here, so the browser code doesn't need the site's address.
    const rel = (to?: string) => (to ? resolveRelative(slug as never, to as never) : undefined)
    const root = pathToRoot(slug as never)
    const data = {
      ...web,
      people: (web.people ?? []).map((p) => ({ ...p, open: rel(p.open), photo: p.photo ? `${root}/${p.photo}` : undefined })),
      groups: (web.groups ?? []).map((g) => ({ ...g, open: rel(g.open) })),
    }
    return <div class="mw-web-page" data-web={JSON.stringify(data)} />
  }
  PeopleWebPage.css = style
  PeopleWebPage.afterDOMLoaded = __CLIENT__
  return PeopleWebPage
}) satisfies QuartzComponentConstructor
