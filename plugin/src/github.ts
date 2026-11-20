// Pushes the exported wiki to GitHub as one commit.
// Only the content folder is replaced. Everything else in the repo (the Quartz site, this plugin's code) is kept.

import { requestUrl, RequestUrlParam } from "obsidian";

export interface RepoSettings {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  contentPath: string; // e.g. "content"
}

export interface OutFile {
  path: string; // path inside the content folder
  data: string | ArrayBuffer;
}

export interface PushResult {
  changed: boolean;
  commitUrl?: string;
}

interface TreeEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
}

async function api<T>(s: RepoSettings, method: string, path: string, body?: unknown): Promise<T> {
  const req: RequestUrlParam = {
    url: `https://api.github.com/repos/${s.owner}/${s.repo}${path}`,
    method,
    headers: {
      Authorization: `Bearer ${s.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    contentType: "application/json",
    body: body === undefined ? undefined : JSON.stringify(body),
    throw: false,
  };
  const res = await requestUrl(req);
  if (res.status >= 400) {
    throw new Error(`GitHub said ${res.status} on ${method} ${path}: ${res.text.slice(0, 200)}`);
  }
  return res.json as T;
}

function toBytes(data: string | ArrayBuffer): Uint8Array {
  return typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

// The id Git gives a file. Used to skip uploading files that haven't changed.
async function gitBlobSha(bytes: Uint8Array): Promise<string> {
  const header = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const all = new Uint8Array(header.length + bytes.length);
  all.set(header);
  all.set(bytes, header.length);
  const hash = await crypto.subtle.digest("SHA-1", all);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

// A brand-new repo has no commits, and the API needs one to build on.
async function ensureFirstCommit(s: RepoSettings): Promise<void> {
  await api(s, "PUT", "/contents/README.md", {
    message: "Start the wiki",
    content: toBase64(toBytes("# The Machine World\n\nThe player wiki for the campaign.\n")),
    branch: s.branch,
  });
}

// Optional: a small file kept beside the content folder (e.g. the "New since" log).
// `update` gets its last version (or null) and returns the new one, plus the files to publish.
export interface Tracker {
  path: string; // e.g. "wiki-changes.json", relative to the repo root
  update: (previous: string | null, files: OutFile[]) => { files: OutFile[]; state: string };
}

export async function pushWiki(s: RepoSettings, files: OutFile[], message: string, tracker?: Tracker): Promise<PushResult> {
  let ref: { object: { sha: string } };
  try {
    ref = await api(s, "GET", `/git/ref/heads/${s.branch}`);
  } catch {
    await ensureFirstCommit(s);
    ref = await api(s, "GET", `/git/ref/heads/${s.branch}`);
  }
  const parentSha = ref.object.sha;
  const parent = await api<{ tree: { sha: string } }>(s, "GET", `/git/commits/${parentSha}`);
  const oldTree = await api<{ tree: TreeEntry[]; truncated: boolean }>(
    s, "GET", `/git/trees/${parent.tree.sha}?recursive=1`,
  );
  if (oldTree.truncated) throw new Error("The repo is too big to read in one go.");

  const prefix = s.contentPath.replace(/\/+$/, "") + "/";
  const existing = new Map(oldTree.tree.filter((e) => e.type === "blob").map((e) => [e.path, e.sha]));

  // Keep everything outside the content folder exactly as it is.
  const entries: TreeEntry[] = oldTree.tree
    .filter((e) => e.type === "blob" && !e.path.startsWith(prefix) && e.path !== tracker?.path)
    .map((e) => ({ path: e.path, mode: e.mode, type: "blob", sha: e.sha }));

  if (tracker) {
    const old = existing.get(tracker.path);
    let previous: string | null = null;
    if (old) {
      const blob = await api<{ content: string }>(s, "GET", `/git/blobs/${old}`);
      const bin = atob(blob.content.replace(/\s/g, ""));
      previous = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    }
    const result = tracker.update(previous, files);
    files = result.files;
    const bytes = toBytes(result.state);
    let sha = await gitBlobSha(bytes);
    if (old !== sha) sha = (await api<{ sha: string }>(s, "POST", "/git/blobs", { content: toBase64(bytes), encoding: "base64" })).sha;
    entries.push({ path: tracker.path, mode: "100644", type: "blob", sha });
  }

  for (const f of files) {
    const fullPath = prefix + f.path;
    const bytes = toBytes(f.data);
    let sha = await gitBlobSha(bytes);
    if (existing.get(fullPath) !== sha) {
      const blob = await api<{ sha: string }>(s, "POST", "/git/blobs", {
        content: toBase64(bytes),
        encoding: "base64",
      });
      sha = blob.sha;
    }
    entries.push({ path: fullPath, mode: "100644", type: "blob", sha });
  }

  const tree = await api<{ sha: string }>(s, "POST", "/git/trees", { tree: entries });
  if (tree.sha === parent.tree.sha) return { changed: false };

  const commit = await api<{ sha: string; html_url: string }>(s, "POST", "/git/commits", {
    message,
    tree: tree.sha,
    parents: [parentSha],
  });
  await api(s, "PATCH", `/git/refs/heads/${s.branch}`, { sha: commit.sha });
  return { changed: true, commitUrl: commit.html_url };
}
