// Audience views in the browser: signing in, and opening the sections meant for you.
// Runs on every page change (Quartz "nav" event).
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { render } from "preact";
import { AudienceIndex, fromB64, LockedDetail, LockedMenuItem, LockedSection, openSections, SealedSection, signIn, toB64 } from "../../../shared/audiences";
import { headerView } from "../../page-header/src/components/header";

// How details are named, for the line that says who they're for
const LABELS: Record<string, string> = {
  player_title: "Subtitle", player_say: "Say it", photo: "Portrait", player_artist: "Artist", player_sigil: "Symbol",
  player_type: "Type", player_species: "Species", player_status: "Status", player_faction: "Faction", player_seen: "Last seen",
  player_favour: "Favour", player_standing: "Standing", banner: "Banner", spotify: "Theme song", player_connected: "Connected to",
};

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
function renderMd(md: string, root: string): string {
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

  if (!session) return;
  const key = fromB64(session.key);
  const dm = session.aud === "dm";

  // ---- Locked pages in the menu ----
  if (idx.pages?.length) {
    const items = (await openSections(idx.pages, key)).filter((i): i is LockedMenuItem => i.kind === "page");
    addToMenu(items, root, holder.dataset.slug ?? "");
  }

  // ---- This page's details ----
  if (!sealed.length) return;
  const openedAll = await openSections(sealed, key);
  const lockedPage = holder.dataset.lockedPage === "true";
  const details = new Map<string, LockedDetail>();
  for (const d of openedAll) if (d.kind === "detail" && !details.has(d.key)) details.set(d.key, d);
  const headerEl = document.querySelector<HTMLElement>(".mw-page-header");
  if (details.size && headerEl) {
    const fm: Record<string, unknown> = lockedPage ? {} : JSON.parse(holder.dataset.fm || "{}");
    for (const [k, d] of details) fm[k] = d.value;
    headerEl.innerHTML = "";
    render(headerView(fm, holder.dataset.slug ?? ""), headerEl);
    const h1 = headerEl.querySelector("h1");
    if (lockedPage && h1) {
      const names = [...new Set(openedAll.filter((x) => x.kind !== "detail").map((x) => x.name))];
      h1.append(el("span", `mw-aud-tag ${dm ? "mw-aud-tag-dm" : ""}`, `🔒 ${dm ? names.join(" · ") : "Just for you"}`));
      if (typeof fm.title === "string") document.title = document.title.replace("Locked page", fm.title);
    }
    // Details on a normal page that only some can see: say so, under the header
    const own = [...details.values()].filter((d) => d.key !== "title" && LABELS[d.key] && !lockedPage);
    if (own.length) {
      const line = el("p", "mw-aud-details");
      line.textContent = dm
        ? `🔒 ${own.map((d) => `${LABELS[d.key]}: ${d.name}`).join(" · ")}`
        : `🔒 Just for you: ${own.map((d) => LABELS[d.key]).join(", ")}`;
      headerEl.append(line);
    }
  }
  if (lockedPage && openedAll.length) document.querySelector(".mw-locked-notice")?.remove();

  // ---- This page's sections ----
  const opened = openedAll.filter((x): x is LockedSection => x.kind !== "detail" && x.kind !== "page");
  if (!opened.length) return;
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
    body.innerHTML = renderMd(s.md, root);
    box.append(body);
    marker.replaceWith(box);
  }
}

// Locked pages go in the menu where they'd be if they were public, with a lock.
// One entry per page (the DM gets one for each player who can see it).
function addToMenu(items: LockedMenuItem[], root: string, current: string) {
  document.querySelectorAll(".mw-locked-item").forEach((x) => x.remove());
  const seen = new Set<string>();
  for (const it of items.sort((a, b) => a.title.localeCompare(b.title))) {
    if (seen.has(it.to)) continue;
    seen.add(it.to);
    const list =
      document.querySelector<HTMLElement>(`.mw-menu-sub[data-mw-path="${CSS.escape(it.menu)}"]`) ??
      document.querySelector<HTMLElement>(`.mw-menu-sub[data-mw-path="${CSS.escape(it.menu.split("/")[0])}"]`);
    if (!list) continue;
    const li = el("li", "mw-locked-item");
    const a = el("a", `internal mw-locked-link ${current === it.to ? "mw-active" : ""}`, `🔒 ${it.title}`) as HTMLAnchorElement;
    a.href = `${root}/${it.to}`;
    li.append(a);
    // In order among the pages (after the folders, which come first)
    const after = [...list.children].find((c) => !c.querySelector(":scope > details") && (c.textContent ?? "").replace("🔒 ", "").localeCompare(it.title) > 0);
    list.insertBefore(li, after ?? null);
    // Show anything that was hidden because it had nothing public in it, and open the way to the current page
    for (let n: HTMLElement | null = list; n && !n.classList.contains("mw-menu"); n = n.parentElement) {
      if (n.hidden) n.hidden = false;
      if (current === it.to && n instanceof HTMLDetailsElement) n.open = true;
    }
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
