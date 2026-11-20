# Setup guide

This gets your own player wiki running: a website for your players, published from your Obsidian notes. Only what you mark for the players is ever published.

It takes about 45 minutes. You don't need to write any code.

**You'll need:**
- a free **GitHub** account (github.com)
- **Obsidian** on a computer (the publish button doesn't work on phones)
- **Calendarium** (an Obsidian community plugin), if you want the calendar and timeline. It's optional.

When you're done, read `User guide.md` to learn how to write notes for the wiki.

---

## Step 1: Make your own copy

1. Sign in to GitHub.
2. Open the starter link you were sent.
3. Click the green **Use this template** button, then **Create a new repository**.
4. Fill in:
   - **Repository name:** something short, like `my-campaign-wiki`. It becomes part of the web address.
   - **Public.** Free GitHub accounts can only make websites from public repos. Only player content is ever published to it, so that's fine.
5. Click **Create repository**.

---

## Step 2: Turn on the website

1. In your new repo, click **Settings** (along the top).
2. In the left list, click **Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.

There's nothing to save. It's set as soon as you choose it.

---

## Step 3: Name your wiki

1. Go back to the **Code** tab of your repo, and click `quartz.config.yaml`.
2. Click the **pencil icon** (Edit this file).
3. Near the top, change these two lines:

```yaml
  pageTitle: My Campaign
  baseUrl: YOUR-GITHUB-NAME.github.io/YOUR-REPO-NAME
```

   - `pageTitle`: your wiki's name, shown at the top of every page.
   - `baseUrl`: your GitHub name, then `.github.io/`, then your repo's name. For example `sam-smith.github.io/my-campaign-wiki`. **No `https://` and no `/` at the end.**

4. Click **Commit changes**, then **Commit changes** again.

GitHub now builds your site. Click the **Actions** tab to watch: a yellow dot means it's building, and a green tick means it's done (about 2 minutes).

Your wiki is now at **https://your-github-name.github.io/your-repo-name/**. For now it just says it's waiting for its first publish.

---

## Step 4: Make a token for Obsidian

A token is like a password that lets the Obsidian plugin publish to your repo, and nothing else.

1. On GitHub, click your **profile picture** (top right), then **Settings**.
2. At the bottom of the left list, click **Developer settings**.
3. Click **Personal access tokens**, then **Fine-grained tokens**, then **Generate new token**.
4. Fill in:
   - **Token name:** `Obsidian wiki`
   - **Expiration:** up to a year. When it runs out, publishing stops working, and you make a new one the same way.
   - **Repository access:** **Only select repositories**, then pick your wiki repo.
   - **Permissions:** open **Repository permissions**, find **Contents**, and set it to **Read and write**.
5. Click **Generate token**.
6. **Copy the token now.** GitHub only shows it once. Keep it somewhere safe until Step 6.

> Never share this token or put it in a note. Anyone with it can change your wiki.

---

## Step 5: Install the Obsidian plugin

1. In your repo on GitHub, open the `obsidian-plugin` folder. It has three files: `main.js`, `manifest.json` and `styles.css`.
2. Download each one. Click the file, then the **download icon** (Download raw file) at the top right.
3. Find your vault's folder on your computer. Inside it, open the hidden `.obsidian` folder, then `plugins`.
   - **Windows:** in File Explorer, click **View**, then **Show**, then tick **Hidden items**.
   - **Mac:** in Finder, press **Cmd + Shift + .** (full stop).
   - If there's no `plugins` folder, make one.
4. Inside `plugins`, make a folder called `campaign-wiki`, and put the three files in it.
5. In Obsidian, open **Settings**, then **Community plugins**.
   - If it says **Restricted mode is on**, click **Turn on community plugins**.
   - Click the **refresh icon** next to "Installed plugins".
   - Switch **Campaign Wiki** on.

You'll see new icons in the left ribbon: **Publish wiki**, **Open timeline** and **Open people web**.

---

## Step 6: Fill in the plugin's settings

In Obsidian, open **Settings**, then **Campaign Wiki** (near the bottom of the left list).

**GitHub**
- **GitHub token:** paste the token from Step 4.
- **GitHub user:** your GitHub name.
- **Repo:** your repo's name, e.g. `my-campaign-wiki`.
- **Branch:** leave it as `main`.

**Your campaign**
- **World name:** e.g. `Eldmoor`. The home page then says "Welcome to Eldmoor".
- **Year names:** how years are written. For example `DR` makes year 1492 "1492 DR". Leave them empty for plain numbers.
- **Second calendar:** optional. Leave it empty if you don't need it.

**Folders**
- **Player Pages folder:** a folder for pages that are all for the players (the home page, handouts…). Everything in it is published. The starting value is `Wiki/Player Pages`.
- **Player art folder** and **People web groups note:** fine to leave as they are for now.
- **Menu sections:** which of your folders go in which part of the wiki's menu. Change the left side to match your vault's folders. One per line:

```
People/NPCs = people
Places = places
Sessions = sessions
```

  The right side must be one of: `people`, `party`, `factions`, `gods`, `lore`, `places`, `sessions`, `quests`, `items`. The user guide explains how to add your own.

**Calendarium** (if you use it)
- **Public event categories:** the names of the Calendarium categories that the players can always see, e.g. `Festivals, The party`.
- **Publish the timeline:** leave this off until the party knows some history.

---

## Step 7: Mark something for the players

1. In your **Player Pages** folder, make a note called **Home**. Write a welcome for your players. This becomes the front page.
2. Open any other note, for example a town, and add this anywhere in it:

```
> [!player] Overview
> What the party knows about this place.
```

Only the text inside `[!player]` callouts is published. The rest of the note stays private.

---

## Step 8: Publish

1. Click the **Publish wiki** icon in the left ribbon.
2. Check the list of pages. These will be public.
3. Click **Publish**.
4. Wait about 2 minutes, then open your wiki's address.

🎉 That's it. Each time the party learns something, add a player callout, then publish.

---

## Step 9: Make it yours

- **Colours and fonts:** in `quartz.config.yaml`, under `theme`. Edit it on GitHub with the pencil icon, like Step 3.
- **The menu:** also in `quartz.config.yaml`, under `machine-world-components`. You can rename, reorder or remove items.
- **Anything else about the look:** `quartz/styles/_theme.scss`. The user guide has examples.

---

## If something goes wrong

| Problem | What to check |
|---|---|
| The wiki address shows "404" | Step 2: Pages **Source** must be **GitHub Actions**. Then check `baseUrl` in Step 3. |
| The site looks broken, with no styles | `baseUrl` (Step 3) must exactly match your address, with no `https://` and no `/` at the end |
| "Publish failed" in Obsidian | The token (Step 4): is it for this repo, with **Contents: Read and write**? Has it expired? Are **GitHub user** and **Repo** spelled right? |
| A page doesn't appear | Does the note have a `> [!player]` callout? Is its folder in **Menu sections**? Then publish again. |
| A change doesn't show | Wait 2 minutes and refresh. Check the **Actions** tab on GitHub: a red cross means the build failed, and clicking it shows why. |
| The plugin isn't in Obsidian's list | The folder must be `.obsidian/plugins/campaign-wiki/`, with all three files directly inside it |
