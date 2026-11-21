// Who can see each detail of a page (its subtitle, portrait...): stored in the note's wiki_visibility property,
// e.g. { player_title: "tam", photo: "tam", player_seen: "dm" }. Anything not listed is for everyone.
// The DM can always see everything a player can.

// Details that can have their own visibility: the ones the page's header shows.
// (Not the name, the wiki section or "Inside": those decide where the page itself goes.)
export const LOCKABLE_DETAILS = [
  "player_title",
  "player_say",
  "photo",
  "player_artist",
  "player_sigil",
  "player_type",
  "player_species",
  "player_status",
  "player_faction",
  "player_seen",
  "player_favour",
  "player_standing",
  "banner",
  "spotify",
];

// Details that go with another one: the banner's focus goes wherever the banner goes
export const FOLLOWS: Record<string, string> = { banner_focus: "banner" };

export const VISIBILITY_PROPERTY = "wiki_visibility";

// The note's visibility map, lower case, without "everyone" entries or details that can't be locked
export function readVisibility(props: Record<string, unknown> | null | undefined): Record<string, string> {
  const raw = props?.[VISIBILITY_PROPERTY];
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, v] of Object.entries(raw as Record<string, unknown>)) {
    const who = typeof v === "string" ? v.trim().toLowerCase() : "";
    if (who && who !== "everyone" && LOCKABLE_DETAILS.includes(key)) out[key] = who;
  }
  for (const [key, leader] of Object.entries(FOLLOWS)) if (out[leader]) out[key] = out[leader];
  return out;
}
