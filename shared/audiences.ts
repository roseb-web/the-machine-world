// Audience views: locking the sections meant for one player, or for the DM.
//
// - Each audience (a player, or "dm") has a password, set in the plugin. It never leaves Obsidian.
// - A password becomes a key with PBKDF2 (slow on purpose, so passwords are hard to guess).
// - Each locked section is scrambled with its own random key (AES-GCM). That key is then locked
//   ("wrapped") once for the section's audience and once for the DM, so either can open it.
//   The wraps aren't labelled, so the published files don't say who a section is for.
// - audiences.json holds a "check" per audience: their name, locked with their key. Signing in
//   tries the password against each, which tells the wiki who you are.
// The same code runs in Obsidian (to lock) and in the browser (to open).

export interface LockedSection {
  id: number;
  aud: string; // "neri", or "dm"
  name: string; // how it's shown to the DM: "Neri", "DM"
  kind: "overview" | "content" | "known";
  title: string;
  md: string; // Markdown, with links already pointing at wiki pages ("wiki:people/pell")
}

export interface SealedSection {
  id: number;
  data: string; // iv + scrambled section, base64
  wraps: string[]; // the section's key, locked for each audience that can open it, base64
}

export interface AudienceIndex {
  v: 1;
  salt: string; // base64
  iterations: number;
  checks: string[]; // each audience's { aud, name }, locked with its key, base64
}

export const ITERATIONS = 250_000;
const subtle = () => globalThis.crypto.subtle;
// TypeScript is fussy about which kind of byte array the crypto functions take: these are all fine
const buf = (b: Uint8Array) => b as unknown as BufferSource;
const enc = new TextEncoder();
const dec = new TextDecoder();

export function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
export const randomBytes = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));

// A password -> 32 key bytes. The bytes are what a signed-in device remembers.
export async function keyBytes(password: string, salt: Uint8Array, iterations = ITERATIONS): Promise<Uint8Array> {
  const base = await subtle().importKey("raw", enc.encode(password.normalize("NFC")), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: buf(salt), iterations }, base, 256));
}

const aesKey = (bytes: Uint8Array) => subtle().importKey("raw", buf(bytes), "AES-GCM", false, ["encrypt", "decrypt"]);

async function lock(key: Uint8Array, plain: Uint8Array): Promise<string> {
  const iv = randomBytes(12);
  const ct = new Uint8Array(await subtle().encrypt({ name: "AES-GCM", iv: buf(iv) }, await aesKey(key), buf(plain)));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return toB64(out);
}

// null if this key can't open it (AES-GCM fails loudly on a wrong key)
async function open(key: Uint8Array, b64: string): Promise<Uint8Array | null> {
  try {
    const all = fromB64(b64);
    return new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: buf(all.subarray(0, 12)) }, await aesKey(key), buf(all.subarray(12))));
  } catch {
    return null;
  }
}

// ---- Locking (in Obsidian, when publishing) ----

// keys: each audience's key bytes ("neri", "dm"...). A section opens with its own audience's key and the DM's.
export async function sealSections(sections: LockedSection[], keys: Map<string, Uint8Array>): Promise<SealedSection[]> {
  const out: SealedSection[] = [];
  for (const s of sections) {
    const who = [...new Set([s.aud, "dm"])].filter((a) => keys.has(a));
    if (!who.length) continue; // nobody could open it: leave it out entirely
    const sectionKey = randomBytes(32);
    const wraps = [];
    for (const a of who) wraps.push(await lock(keys.get(a)!, sectionKey));
    // Shuffle, so the order doesn't hint at who it's for
    wraps.sort(() => Math.random() - 0.5);
    out.push({ id: s.id, data: await lock(sectionKey, enc.encode(JSON.stringify(s))), wraps });
  }
  return out;
}

export async function audienceIndex(salt: Uint8Array, keys: Map<string, Uint8Array>, names: Map<string, string>): Promise<AudienceIndex> {
  const checks = [];
  for (const [aud, key] of keys) checks.push(await lock(key, enc.encode(JSON.stringify({ aud, name: names.get(aud) ?? aud }))));
  checks.sort(() => Math.random() - 0.5);
  return { v: 1, salt: toB64(salt), iterations: ITERATIONS, checks };
}

// ---- Opening (in the browser) ----

// Signing in: who this password belongs to, and the key to remember. null if it's nobody's.
export async function signIn(password: string, index: AudienceIndex): Promise<{ aud: string; name: string; key: Uint8Array } | null> {
  const key = await keyBytes(password, fromB64(index.salt), index.iterations);
  for (const c of index.checks) {
    const plain = await open(key, c);
    if (plain) {
      const who = JSON.parse(dec.decode(plain)) as { aud: string; name: string };
      return { ...who, key };
    }
  }
  return null;
}

// The sections on a page this key can open
export async function openSections(sealed: SealedSection[], key: Uint8Array): Promise<LockedSection[]> {
  const out: LockedSection[] = [];
  for (const s of sealed) {
    for (const w of s.wraps) {
      const sectionKey = await open(key, w);
      if (!sectionKey) continue;
      const plain = await open(sectionKey, s.data);
      if (plain) out.push(JSON.parse(dec.decode(plain)) as LockedSection);
      break;
    }
  }
  return out;
}
