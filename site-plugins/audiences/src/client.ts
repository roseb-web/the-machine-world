// Audience views in the browser: signing in, and opening the sections meant for you.
// Runs on every page change (Quartz "nav" event).
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { AudienceIndex, fromB64, openSections, SealedSection, signIn, toB64 } from "../../../shared/audiences";

interface Session {
  aud: string;
  name: string;
  key: string; // base64
}
const STORE = "mw-audience";
const load = (): Session | null => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? sessionStorage.getItem(STORE) ?? "null");
  } catch {
    return null;
  }
};
const store = (s: Session | null, remember = true) => {
  try {
    localStorage.removeItem(STORE);
    sessionStorage.removeItem(STORE);
    if (s) (remember ? localStorage : sessionStorage).setItem(STORE, JSON.stringify(s));
  } catch {
    /* private browsing: just this page */
  }
};

let index: AudienceIndex | null | undefined;
async function getIndex(root: string): Promise<AudienceIndex | null> {
  if (index !== undefined) return index;
  try {
    const r = await fetch(`${root}/audiences.json`, { cache: "no-cache" });
    index = r.ok ? ((await r.json()) as AudienceIndex) : null;
  } catch {
    index = null;
  }
  return index;
}

const el = (tag: string, cls = "", text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

// Locked Markdown -> HTML. "wiki:people/pell" links become links to that page.
function render(md: string, root: string): string {
  const html = micromark(md, { extensions: [gfm()], htmlExtensions: [gfmHtml()] });
  return html
    .replace(/href="wiki:([^"]*)"/g, (_a, to: string) => `href="${root}/${to}" class="internal"`)
    .replace(/src="wiki:([^"]*)"/g, (_a, to: string) => `src="${root}/${to}"`);
}

async function setup(holder: HTMLElement) {
  const root = holder.dataset.root || ".";
  const sealed: SealedSection[] = JSON.parse(holder.dataset.locks || "[]");
  holder.innerHTML = "";
  const idx = await getIndex(root);
  if (!idx) return; // no audiences on this wiki
  const session = load();

  // ---- The bar ----
  if (session) {
    holder.append(el("span", `mw-aud-who ${session.aud === "dm" ? "mw-dm" : ""}`, `🔓 Signed in: ${session.name}`));
    const out = el("button", "mw-aud-btn", "Sign out");
    out.addEventListener("click", () => {
      store(null);
      location.reload();
    });
    holder.append(out);
  } else {
    const b = el("button", "mw-aud-btn", "🔑 Sign in");
    b.addEventListener("click", () => openSignIn(idx));
    holder.append(b);
  }

  // ---- This page's sections ----
  if (!session || !sealed.length) return;
  const opened = await openSections(sealed, fromB64(session.key));
  const article = document.querySelector("article") ?? document.body;
  let knownHeading: HTMLElement | null = [...article.querySelectorAll("h2")].find((h) => h.textContent?.trim() === "What we know") ?? null;
  for (const s of opened.sort((a, b) => a.id - b.id)) {
    const marker = article.querySelector(`.mw-lock[data-mw-lock="${s.id}"]`) as HTMLElement | null;
    if (!marker) continue;
    // "What we know" with nothing for everyone: add the heading before the first one
    if (marker.dataset.mwHeading === "known" && !knownHeading) {
      knownHeading = el("h2", "", "What we know");
      marker.before(knownHeading);
    }
    const box = el("div", `mw-aud-sec ${s.aud === "dm" ? "mw-dm" : ""}`);
    const heading = s.kind === "overview" ? "Overview" : s.title;
    const h = el(s.kind === "known" ? "h3" : "h2", "", heading);
    h.append(el("span", "mw-aud-tag", `🔒 ${session.aud === "dm" ? s.name : "Just for you"}`));
    box.append(h);
    const body = el("div");
    body.innerHTML = render(s.md, root);
    box.append(body);
    marker.replaceWith(box);
  }
}

function openSignIn(idx: AudienceIndex) {
  const modal = el("div", "mw-aud-modal");
  const box = el("div", "mw-aud-box");
  box.append(el("h3", "", "Sign in"), el("p", "", "Your password unlocks the parts of the wiki that are just for you."));
  const form = el("form") as HTMLFormElement;
  const input = el("input") as HTMLInputElement;
  input.type = "password";
  input.placeholder = "Password";
  input.autocomplete = "current-password";
  const row = el("div", "mw-aud-row");
  const label = el("label");
  const remember = el("input") as HTMLInputElement;
  remember.type = "checkbox";
  remember.checked = true;
  label.append(remember, document.createTextNode("Remember on this device"));
  const go = el("button", "mw-aud-go", "Unlock") as HTMLButtonElement;
  go.type = "submit";
  row.append(label, go);
  const err = el("div", "mw-aud-error");
  form.append(input, row, err);
  box.append(form);
  modal.append(box);
  modal.addEventListener("click", (e) => e.target === modal && modal.remove());
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    go.disabled = true;
    go.textContent = "Checking…";
    err.textContent = "";
    const who = await signIn(input.value, idx);
    if (!who) {
      err.textContent = "That password didn't work.";
      go.disabled = false;
      go.textContent = "Unlock";
      return;
    }
    store({ aud: who.aud, name: who.name, key: toB64(who.key) }, remember.checked);
    location.reload();
  });
  document.body.append(modal);
  input.focus();
}

document.addEventListener("nav", () => {
  for (const holder of document.querySelectorAll<HTMLElement>(".mw-aud")) {
    setup(holder).catch((e) => console.error("Audience views failed", e));
  }
});
