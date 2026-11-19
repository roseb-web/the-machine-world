// Maps: turns Leaflet blocks into safe map data for the wiki.
// A Player Pages note embeds map notes (![[Vaharan - Places|Vaharan]]).
// - A party map (property party_map: true, or a note inside Player Pages) is the party's own:
//   every pin is kept, with its description. Its descriptions must be player facing.
// - A map note anywhere else is the DM's: only pins whose note is published are kept,
//   "secret" pins never are, and descriptions are dropped (they may be DM text).

export interface MapPin {
  type: string; // Leaflet marker type, e.g. "town"
  lat: number;
  lng: number;
  title: string;
  page?: string; // published page, e.g. "places/the-marrowlands/thornwick/index"
  text?: string; // short description (party maps only)
}

export interface MapData {
  title: string;
  image: string; // content path, e.g. "assets/vaharan-map-final.jpg"
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
  zoomDelta?: number;
  pins: MapPin[];
}

export interface MapContext {
  fromPath: string; // vault path of the map note
  partyMap: boolean; // true for a party map (party_map: true, or in Player Pages)
  resolveLink: (link: string, fromPath: string) => string | null;
  published: (vaultPath: string) => { to: string; title: string } | undefined;
  image: (vaultPath: string) => string; // copies an image, returns its content path
}

const LEAFLET = /```leaflet\r?\n([\s\S]*?)```/;
const NUM = (v: string | undefined) => (v !== undefined && v.trim() !== "" && !isNaN(Number(v)) ? Number(v) : undefined);

// Splits a marker line on commas, but not commas inside [[links]].
function splitMarker(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < value.length; i++) {
    if (value.startsWith("[[", i)) depth++;
    if (value.startsWith("]]", i)) depth = Math.max(0, depth - 1);
    if (value[i] === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += value[i];
  }
  parts.push(cur.trim());
  return parts;
}

export function readMap(noteText: string, title: string, ctx: MapContext): MapData | null {
  const block = noteText.match(LEAFLET)?.[1];
  if (!block) return null;
  const opts: Record<string, string> = {};
  const pins: MapPin[] = [];
  let image: string | undefined;

  for (const raw of block.split(/\r?\n/)) {
    const line = raw.trim();
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key === "image") {
      const link = value.match(/\[\[([^\]|]+)/)?.[1];
      const resolved = link ? ctx.resolveLink(link, ctx.fromPath) : null;
      if (resolved) image = ctx.image(resolved);
    } else if (key === "marker") {
      const [type, lat, lng, link = "", ...rest] = splitMarker(value);
      const latN = NUM(lat);
      const lngN = NUM(lng);
      if (latN === undefined || lngN === undefined) continue;
      if (type.toLowerCase() === "secret") continue;
      const target = link.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]$/);
      const resolved = target ? ctx.resolveLink(target[1], ctx.fromPath) : null;
      const page = resolved ? ctx.published(resolved) : undefined;
      // Description: Leaflet's 5th field. Only kept on party maps.
      const text = ctx.partyMap ? rest[0]?.replace(/^"|"$/g, "") || undefined : undefined;
      if (page) {
        pins.push({ type, lat: latN, lng: lngN, title: page.title, page: page.to, ...(text ? { text } : {}) });
      } else if (ctx.partyMap) {
        // A party map can name a place that has no page: plain text, like any unpublished link.
        const name = target ? (target[2] ?? target[1].split("/").pop()!) : link.replace(/^"|"$/g, "");
        if (name || text) pins.push({ type, lat: latN, lng: lngN, title: name || text!, ...(text ? { text } : {}) });
      }
      // DM map, no published page: dropped.
    } else {
      opts[key] = value;
    }
  }
  if (!image) return null;
  return {
    title,
    image,
    minZoom: NUM(opts.minZoom),
    maxZoom: NUM(opts.maxZoom),
    defaultZoom: NUM(opts.defaultZoom),
    zoomDelta: NUM(opts.zoomDelta),
    pins,
  };
}
