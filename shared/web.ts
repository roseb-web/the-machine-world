// The people web: who belongs to which group, who knows whom, and where they are.
//
// In a person's note:
//   groups: ["[[Meridian Concord]]", "Thornwick residents"]     (one or more)
//   relations: ["[[Pell]] | friend", "[[Enok]] | family | close"] (type and strength optional)
// Their place is worked out from `where_now` (Obsidian) or their wiki folder (the wiki).
// The wiki only ever uses the party's versions: player_groups and player_relations.

export interface WebPerson {
  id: string; // unique: a vault path or wiki page
  name: string;
  title?: string;
  photo?: string; // an image URL
  pc?: boolean; // one of the party
  groups: string[]; // group ids
  area?: string; // the town or place they're in
  open?: string; // vault path (Obsidian) or page link (wiki)
}

export interface WebGroup {
  id: string;
  name: string;
  party?: boolean;
  open?: string;
}

export interface WebTie {
  a: string; // person ids
  b: string;
  type: string; // knows, friend, family...
  strength?: "close" | "loose";
}

export interface WebData {
  people: WebPerson[];
  groups: WebGroup[];
  ties: WebTie[];
}

// How each kind of tie is drawn. `arrow`: the tie has a direction (a works for b).
export interface TieStyle {
  color: string;
  dash?: string;
  width?: number;
  double?: boolean;
  arrow?: boolean;
}

export const TIE_STYLES: Record<string, TieStyle> = {
  knows: { color: "#8b7d70", width: 1.2 },
  family: { color: "#b0566e", width: 2.4 },
  friend: { color: "#4e7a5c", width: 2.4 },
  lover: { color: "#c0587a", width: 1.6, double: true },
  ally: { color: "#4f6d8f", width: 2.2 },
  "works for": { color: "#6b5a4a", width: 1.8, arrow: true },
  owes: { color: "#a46b0a", width: 1.8, dash: "2 4", arrow: true },
  rival: { color: "#9b3b2e", width: 2.2, dash: "7 5" },
  enemy: { color: "#7a1f1f", width: 3, dash: "10 5" },
  uneasy: { color: "#a46b0a", width: 2, dash: "2 5" },
};

// "[[Pell]] | friend | close" -> { target: "Pell", type: "friend", strength: "close" }
export function parseRelation(raw: unknown): { target: string; type: string; strength?: "close" | "loose" } | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = s.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]\s*(.*)$/);
  const target = (m ? m[1] : s.split("|")[0]).trim();
  const rest = (m ? m[2] : s.split("|").slice(1).join("|")).split("|").map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (!target) return null;
  const strength = rest.find((x) => x === "close" || x === "loose") as "close" | "loose" | undefined;
  const type = rest.find((x) => x !== "close" && x !== "loose") ?? "knows";
  return { target, type, ...(strength ? { strength } : {}) };
}

// "[[Meridian Concord]]" or "Thornwick residents" -> the group's name
export function groupName(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = s.match(/^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]$/);
  return (m ? (m[2] ?? m[1].split("/").pop()!) : s).trim() || null;
}

// Group ids are their names, lower-case, so "The party" and "the Party" are one group
export const groupId = (name: string) => name.trim().toLowerCase();

const SETTLEMENT = /village|town|city|hamlet|port|camp|warfront|fort|keep|isle/i;

// Climbs from a place up through `player_in` until it reaches a settlement (or runs out).
// lookup(name) gives a place's type and the place it's in.
export function areaOf(start: string | undefined, lookup: (name: string) => { type?: string; in?: string } | undefined): string | undefined {
  let name = start;
  for (let i = 0; name && i < 6; i++) {
    const p = lookup(name);
    if (!p) return name;
    if (p.type && SETTLEMENT.test(p.type)) return name;
    if (!p.in || (p.type && /region|land/i.test(p.type))) return name;
    const up = lookup(p.in);
    if (up?.type && /region/i.test(up.type)) return name;
    name = p.in;
  }
  return name;
}

// Ties are listed once each way at most; a tie to someone not in the web is dropped
export function cleanTies(ties: WebTie[], people: WebPerson[]): WebTie[] {
  const ids = new Set(people.map((p) => p.id));
  const seen = new Map<string, WebTie>();
  for (const t of ties) {
    if (!ids.has(t.a) || !ids.has(t.b) || t.a === t.b) continue;
    const key = [t.a, t.b].sort().join("\u0000");
    const had = seen.get(key);
    // A typed tie wins over a plain "knows"
    if (!had || (had.type === "knows" && t.type !== "knows")) seen.set(key, t);
  }
  return [...seen.values()];
}
