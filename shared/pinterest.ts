// Moodboards: reads pins from Pinterest (API v5) for the board links in notes' `pinterest` property.
// Read only. The token never leaves Obsidian; only image links and sizes go to the wiki.

export interface MoodPin {
  img: string; // grid image (about 600px wide)
  big: string; // larger image, opened on click
  w: number;
  h: number;
  pin: string; // the pin on Pinterest
  alt?: string;
}

export type Getter = (url: string) => Promise<{ status: number; json: unknown }>;

const API = "https://api.pinterest.com/v5";

// Loose match for names and URL slugs: "My Campaign" ~ "my-campaign"
const norm = (s: string) => decodeURIComponent(s).toLowerCase().replace(/[^a-z0-9]+/g, "");

// https://www.pinterest.co.uk/someone/my-campaign/the-old-order/ -> { user, board, section }
export function parseBoardUrl(url: string): { user: string; board: string; section?: string } | null {
  const m = String(url)
    .trim()
    .match(/^https?:\/\/(?:[a-z]{2,3}\.)?pinterest\.[a-z.]+\/([^/?#]+)\/([^/?#]+)(?:\/([^/?#]+))?\/?(?:[?#].*)?$/i);
  if (!m || m[1] === "pin") return null;
  return { user: m[1], board: m[2], ...(m[3] ? { section: m[3] } : {}) };
}

export const boardKey = (url: string) => {
  const p = parseBoardUrl(url);
  return p ? [p.user, p.board, p.section ?? ""].map(norm).join("/") : "";
};

interface Paged<T> {
  items?: T[];
  bookmark?: string | null;
}

async function all<T>(get: Getter, url: string): Promise<T[]> {
  const out: T[] = [];
  let bookmark: string | null | undefined;
  for (let i = 0; i < 20; i++) {
    const res = await get(url + (url.includes("?") ? "&" : "?") + "page_size=100" + (bookmark ? `&bookmark=${encodeURIComponent(bookmark)}` : ""));
    if (res.status === 401 || res.status === 403) throw new PinterestAuthError();
    if (res.status >= 400) throw new Error(`Pinterest said ${res.status}`);
    const page = res.json as Paged<T>;
    out.push(...(page.items ?? []));
    bookmark = page.bookmark;
    if (!bookmark) break;
  }
  return out;
}

export class PinterestAuthError extends Error {
  constructor() {
    super("The Pinterest token has expired or isn't valid. Generate a new one in the Pinterest developer portal.");
  }
}

interface ApiBoard {
  id: string;
  name: string;
  owner?: { username?: string };
}
interface ApiPin {
  id: string;
  alt_text?: string | null;
  title?: string | null;
  media?: { images?: Record<string, { url: string; width: number; height: number }> };
}

const toMoodPin = (p: ApiPin): MoodPin | null => {
  const imgs = p.media?.images ?? {};
  const grid = imgs["600x"] ?? imgs["400x300"] ?? imgs["1200x"];
  if (!grid?.url) return null;
  const big = imgs["1200x"] ?? grid;
  const alt = (p.alt_text || p.title || "").trim();
  return { img: grid.url, big: big.url, w: grid.width, h: grid.height, pin: `https://www.pinterest.com/pin/${p.id}/`, ...(alt ? { alt } : {}) };
};

// Fetches every board link. Returns pins by boardKey, and a message for each link that failed.
export async function fetchMoodboards(get: Getter, urls: string[]): Promise<{ boards: Record<string, MoodPin[]>; errors: string[] }> {
  const boards: Record<string, MoodPin[]> = {};
  const errors: string[] = [];
  const wanted = [...new Set(urls.filter((u) => parseBoardUrl(u)))];
  if (!wanted.length) return { boards, errors };

  // Boards this account can see (its own, and boards it collaborates on)
  const known = await all<ApiBoard>(get, `${API}/boards`);
  for (const url of wanted) {
    const p = parseBoardUrl(url)!;
    const board =
      known.find((b) => norm(b.name) === norm(p.board) && (!b.owner?.username || norm(b.owner.username) === norm(p.user))) ??
      known.find((b) => norm(b.name) === norm(p.board));
    if (!board) {
      errors.push(`Couldn't find the board in ${url}. Is the wiki's Pinterest account a collaborator on it?`);
      continue;
    }
    try {
      let pins: ApiPin[];
      if (p.section) {
        const sections = await all<{ id: string; title?: string; name?: string }>(get, `${API}/boards/${board.id}/sections`);
        const section = sections.find((s) => norm(s.title ?? s.name ?? "") === norm(p.section!));
        if (!section) {
          errors.push(`Couldn't find the section "${p.section}" on the board "${board.name}".`);
          continue;
        }
        pins = await all<ApiPin>(get, `${API}/boards/${board.id}/sections/${section.id}/pins`);
      } else {
        pins = await all<ApiPin>(get, `${API}/boards/${board.id}/pins`);
      }
      boards[boardKey(url)] = pins.map(toMoodPin).filter((x): x is MoodPin => x !== null);
    } catch (e) {
      if (e instanceof PinterestAuthError) throw e;
      errors.push(`${url}: ${(e as Error).message}`);
    }
  }
  return { boards, errors };
}
