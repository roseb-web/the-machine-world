# User guide

How to use the player wiki: writing notes for it, publishing, every property, the timeline, the people web, and changing the code and styles.

The setup guide (`Setup guide.md`) covers getting it running for the first time.

---

## 1. How it works

You write your campaign in Obsidian as normal. When you click **Publish wiki**, the plugin:

1. reads your vault
2. keeps only what the players are allowed to see
3. shows you the list of pages that will be public
4. sends them to GitHub when you confirm

GitHub then rebuilds the website. It takes a minute or two.

### The golden rule

**The wiki only shows what the whole party knows.** If the whole party doesn't know something, it doesn't go on the wiki.

Nothing reaches the wiki by accident. A note is only published if you mark part of it for the players.

---

## 2. Writing notes for the wiki

### Three kinds of content

| Kind | How you write it | On the wiki? |
|---|---|---|
| For the players | Inside a `> [!player]` callout | Yes |
| Normal text | Anywhere else in the note | No |
| DM only | Any other callout, like `> [!danger] DM only` | No |

- **A note is only published if it has at least one `[!player]` callout.** There is no other publish switch.
- Text outside player callouts is never published, so your own notes stay safe.
- Comments written `%% like this %%` are never published, even inside a player callout.

### Overview and "What we know"

```
> [!player] Overview
> A short summary, the way the party would describe it.

> [!player] Session 5
> What they learned this session.
```

- A callout titled **Overview** goes at the top of the page.
- A **Content** callout, written `> [!player|content] The stars`, is the page's own text. It goes after the Overview, with its title as a heading, and it can hold its own headings and tables. Use it for pages that are more than "what we learned when".
- Every other player callout goes under **What we know**. Its title becomes the label, so the session number works well.
- When the party learns something new, add a new callout. You don't need to rewrite the old ones.
- A `-` after the type, as in `> [!player]- Session 4`, folds the callout in Obsidian, so your notes stay tidy. It makes no difference on the wiki.

### Sections for one player, or for the DM view

| Callout | Who it's for |
|---|---|
| `> [!player]` | Everyone: on the wiki |
| `> [!player-neri]` | Only that player (the name the party knows, in lower case) |
| `> [!dm]` | The DM view |

The one-player and DM sections are **not on the wiki yet**. They're for the online DM view, which is coming. They're separate from your own DM callouts (like `> [!danger] DM only`), which are never published anywhere.

### Checking a note: Wiki preview

Click the **🌐 globe** at the top right of a note (or Ctrl+P, "Wiki preview") to see it the way the wiki will show it, in the same tab. Click **Back to the note** to return.

- **View as:** see the page the way one person will:
  - **Everyone** is what's on the wiki now.
  - **Each player** shows everyone's sections plus their own, tagged "… only".
  - **DM** shows every wiki section, each tagged with who it's for.

  Only the note's wiki sections ever show here. The rest of the note (your own notes and callouts) never goes on the wiki.
- **Warnings** underneath: links that will turn into plain text (because their note isn't on the wiki), and names the party doesn't know. For example, if a note has `player_name: The Grey Lady`, writing "Rowan" in a wiki section gets flagged.

It updates as you type, so you can keep it open in a second tab beside the note.

**Edit** is the easiest way to write for the wiki:

- Each section is a card: its **kind** (Overview, Content or What we know), its **heading**, and **who can see it**: Everyone, one player, or DM. A purple stripe means one player, and red means DM.
- You type on the left and see it formatted on the right. Type `[[` to pick a note to link, then use the arrow keys and Enter, or click.
- ↑ ↓ move a section, and ✕ deletes it. **+ Add section** adds one.
- It saves as you type. The sections are kept **at the bottom of the note, folded**, so they're out of the way of your own notes.
- Your other callouts (like DM only) are never touched. A player callout with another callout inside it can't be edited safely here, so it's shown locked and stays where it is.

To tidy a note without editing it, use Ctrl+P, **"Tidy wiki sections"**. It moves the note's wiki sections to the bottom, folded, and changes nothing else.

### Write from the party's point of view

- Use the names the party knows, and their version of events, even if it's wrong.
- Links to notes that aren't published turn into plain text. So a link never gives away that a secret page exists.

### The Player Pages folder

- Notes in the **Player Pages** folder are published **whole**. They don't need player callouts.
- Use it for pages that are all for the players: the home page, the maps page, the handouts page.
- **Never put secrets in it.**
- A note called **Home** in this folder becomes the wiki's front page.

### Which menu section a page goes in

This is set by its vault folder, in the plugin's **Menu sections** setting. For example:

```
People/NPCs = people
Places = places
```

- The longest matching folder wins. So `Lore/Gods = gods` beats `Lore = lore` for a note in `Lore/Gods`.
- Notes in sub-folders keep them as sub-menus. A note in `People/NPCs/Millbrook/` sits under Millbrook in the menu.
- The `wiki_section` property moves one page somewhere else.

### The menu itself

The menu's headings and items are in `quartz.config.yaml`, under `machine-world-components`:

```yaml
      groups:
        - label: The world
          items:
            - title: Places
              section: places
            - title: Bestiary
              section: monsters
            - title: People web
              page: people-web
```

- `section` shows every page in that wiki section, as a sub-menu.
- `page` is one page.
- You can make up new sections. Add a line to **Menu sections** in the plugin settings (e.g. `Monsters = monsters`), and an item here with the same section name.
- A section only shows in the menu once it has published pages.

---

## 3. Publishing

1. Click the **Publish wiki** icon in the left ribbon (or Ctrl+P, "Publish wiki").
2. A summary shows how many pages will be public in each section. Click **See files** for the full list. **Check it.** If something is there that shouldn't be, cancel.
3. Click **Publish**.
4. Wait a minute or two, then refresh the wiki.

Each publish replaces the whole wiki. So deleting a note, or removing its player callouts, takes it off the wiki the next time you publish.

On GitHub, the **Actions** tab shows the site being built. A green tick means it worked. A red cross means something went wrong, and clicking it shows why.

---

## 4. Properties

Properties go at the top of a note. **All of them are optional.** Each part of a page only shows when its property is filled in.

### The easy way: ✎ Edit wiki details

Every note has a **✎ button** at the top right (or use Ctrl+P, "Edit wiki details"). It opens a form with:

- **Overview:** what the party knows. This is the note's `> [!player] Overview` callout. Writing one puts the note on the wiki. Emptying it removes the callout.
- **Only the fields for that kind of note.** People get species, faction and favour. Places get "Inside". Quests get type, status and "On the home page". Session recaps get a date picker. The kind comes from the note's menu section. Less common fields are under **More**.
- **Buttons for fixed values** (favour, standing, affinity…), and a picker for notes and images.
- **A preview** of how the top of the page will look on the wiki, and what else changes (like "Listed under the guild's Key NPCs").

It only saves the wiki's own properties and the Overview. Your other properties and the rest of the note aren't touched, and Obsidian can stay open.

The tables below list every property, if you'd rather type them yourself.

> **Safety:** the wiki only reads properties that start with `player_`, plus the special ones listed here. Your own properties (like `status` or `location`) are never published, so they can hold secrets.

### Any page

| Property | What it does | Example |
|---|---|---|
| `player_name` | The name the party knows it by. Used for the title, menu and web address. | `The Grey Lady` |
| `player_title` | A subtitle under the name | `The miller` |
| `player_type` | A small tag under the name. Section pages also group cards by it. | `Village`, `Guild`, `Festival` |
| `player_say` | How to say the name, shown as "Say it" | `ell-DMOOR` |
| `photo` | A portrait. Link an image from your vault. | `[[Bran.png]]` |
| `player_artist` | Credit under the portrait. Plain text, or `[Name](https://link)`. | `[Sam](https://example.com)` |
| `banner` | A wide image across the top | `[[Millbrook banner.jpg]]` |
| `banner_focus` | Which part of the banner to show: `top`, `center` or `bottom` | `top` |
| `player_sigil` | A symbol shown instead of a portrait (factions, gods) | `[[Guild sigil.png]]` |
| `player_themes` | Short words shown on the page's card in its section | `[light, harvest]` |
| `player_handouts` | Images shown under **Related handouts** | `["[[Map scrap.png]]"]` |
| `pinterest` | A Pinterest board (or section) link, shown as a moodboard | a board link |
| `spotify` | A theme song: Spotify's small player under the header. In Spotify: **Share → Copy song link**. Album and playlist links work too. | a Spotify link |
| `wiki_section` | Puts the page in a different menu section | `factions` |

### People

| Property | What it does |
|---|---|
| `player_species` | A tag |
| `player_status` | A tag, e.g. `Missing` |
| `player_faction` | A tag linking to their faction. Also lists them under that faction's **Key NPCs**. |
| `player_seen` | "Last seen: …", and lists them under that place's **Key NPCs** |
| `player_favour` | How they feel about the party. Use one of: `Grudge`, `Cold`, `Neutral`, `Warm`, `Favoured`. |
| `player_groups` | Their groups on the wiki's **People web**. Easier to set from the people web's edit form (see section 7). |
| `player_relations` | Their ties on the wiki's **People web**. Same as above. |

### Places

| Property | What it does |
|---|---|
| `player_in` | What it's inside, for the menu and breadcrumbs. A link like `"[[Millbrook]]"`, or plain text like `The North` for a region with no note. Leave it off for a top-level place. |

### Factions

| Property | What it does |
|---|---|
| `player_standing` | The party's standing with them. Use one of: `Hostile`, `Wary`, `Neutral`, `Friendly`, `Allied`. |

### Gods

| Property | What it does |
|---|---|
| `affinity_<name>` | One tag per character, e.g. `affinity_fen: Noticed`. The name shown is the part after `affinity_`. Use one of: `Enemy`, `Shunned`, `Noticed`, `Chosen`. **Only set it when the whole party knows.** |

### Quests

| Property | Values |
|---|---|
| `quest` | `main`, `personal`, `faction` or `side` |
| `quest_status` | `active`, `completed` or `failed`. Only `active` quests show on the home page. |
| `pinned` | `true` shows it on the home page (only while it's `active`) |

### Session recaps

| Property | What it does |
|---|---|
| `fc-date` | The in-world date of the session, like `412-06-08` (year-month-day). Calendarium reads it too, so it shows on the calendar. |
| `fc-category` | `party`. The newest session in this category becomes **Previously on…** on the home page. |

### The home page

| Property | What it does |
|---|---|
| `party_location` | "The party is in …", with a link, and a gold pin on maps. E.g. `"[[Millbrook]]"`. If that place has a banner, the home page uses it. |

### Maps and handouts

| Property | Where | What it does |
|---|---|---|
| `party_map` | A map note | `true` means every pin shows, with its description. Use it for maps made for the players. |
| `cssclasses` | The Handouts page | `mw-handouts-page` lays the page out as a gallery |

### Player art (the Gallery page)

One note per picture, in the **Player art folder**. **Everything in these notes is published.**

| Property | What it does |
|---|---|
| `image` | The picture (or embed it in the note instead) |
| `description` | What it shows |
| `artist` | Who made it |
| `session` | Which session, as a link or text |
| `character` | Who's in it, as links or text |
| `date` | The real-world date it was made. The newest show first. |

---

## 5. The special pages

| Page | Where it comes from |
|---|---|
| **Home** | The **Home** note in Player Pages. It also shows **Previously on…** (the newest session), the pinned quests, **Coming up** (the next festivals), and **New since Session N** (pages added or changed since that session). |
| **Calendar** | Calendarium. Today's date, festivals and sessions. Hover over a day for its other names. |
| **Timeline** | Calendarium. History the party knows. Hidden until **Publish the timeline** is on in the settings. |
| **Maps** | A note called **Maps** in Player Pages that embeds your map notes. See **Maps** below. |
| **Handouts** | A note called **Handouts** in Player Pages. Embed one image per handout. |
| **Gallery** | The notes in the Player art folder |
| **People web** | People's `player_groups` and `player_relations` (see section 7) |
| **Section pages** | Made for you: cards for every page in that section |

### Maps

Maps use the **Leaflet** community plugin for Obsidian (by Javalent). Each map lives in its own note, as a `leaflet` code block:

````
```leaflet
id: world-map
image: [[World map.jpg]]
height: 600px
minZoom: -2
maxZoom: 2
defaultZoom: 0
marker: town, 120, 340, [[Millbrook]]
marker: building, 80, 200, [[The Crooked Mug]], The only inn for a day's ride
marker: secret, 50, 60, [[The Hidden Vault]]
```
````

- `image` is the map picture. `minZoom`, `maxZoom` and `defaultZoom` are used on the wiki too.
- Each `marker:` line is one pin: **type, then two numbers (where it is), then a link, then a description** (optional).
- **The wiki only reads pins written in the code block.** Pins you add by clicking on the map in Obsidian are saved by Leaflet somewhere else. To move one into the code block, right-click it and choose **Convert to code block**.

**Putting maps on the wiki.** Make a note called **Maps** in your Player Pages folder and embed each map note in it, one per line:

```
![[World map|The North]]
![[Millbrook - Party map|Millbrook]]
```

Each one becomes a sheet on the wiki's Maps page. The name after `|` is the sheet's name. Map notes are never published as pages themselves.

**Two kinds of map.** The wiki treats them differently, to keep secrets safe:

| | Your own map (anywhere in the vault) | A party map (`party_map: true`, or in Player Pages) |
|---|---|---|
| Which pins show | Only pins that link to a **published** note | Every pin |
| Descriptions | Never shown (they might be DM notes) | Shown |
| `secret` pins | Never shown | Never shown |
| Pins without a note | Not shown | Shown, using the text as the name: `marker: building, 30, 40, Chapel, The old chapel` |

So you can use your own DM map as the wiki's map. Pins appear on it as the party learns about each place. Make a separate party map when you want pins and descriptions written for the players.

**On the wiki:** hover over a pin for its name, and click it for a card with a link to its page. The place in `party_location` (on the home page) gets a gold pin, and the list under the map finds each pin.

---

## 6. The calendar and timeline

All dated events live in **Calendarium**. The wiki's Calendar and Timeline pages both read them.

### Which events are published

- Events in the **Public event categories** (a setting) always show. For example, festivals and the party's sessions.
- Any other event only shows if its **description** contains `#player`.
- **Check the event's name before adding `#player`.** Names are often DM notes. You can give the party a different name, as below.
- Calendarium's descriptions are never published, except the lines below.
- Nothing dated after today is published. A long event that hasn't ended shows as "ongoing".

### Tags in an event's description

| Tag | What it does |
|---|---|
| `#player` | Publishes the event |
| `#player: The bridge falls` | Publishes it, under this name instead of yours |
| `#player-name: The bridge falls` | Sets the party's name for it, without publishing it yet |
| `#player-info: Nobody crosses now.` | One line the party knows, shown in the pop-up. It doesn't publish the event on its own. |

### The timeline in Obsidian

Open it with the **calendar icon** in the ribbon (or Ctrl+P, "Open timeline").

- It shows **every** event, including private ones (in italics).
- Tick **Player view** to see only what the wiki would show.
- Drag to move along it. Use Ctrl + scroll, or pinch, to zoom.
- Click an event for its pop-up. **Edit** opens a form where you can change it, including a **Show on the wiki** switch. It saves straight into Calendarium, so Obsidian can stay open.
- **+ New event** adds one.

### Years

How years are written is set in the plugin's settings, under **Year names**. For example, with `AF` for year 1 onwards, year 412 shows as "412 AF". If years before 1 have their own name (like "BL"), add it too. If not, they show with a minus sign.

---

## 7. The people web

The people web shows who knows whom. Open it with the **people web icon** in the ribbon (or Ctrl+P, "Open people web").

### The two views

- **Groups:** people joined to their groups. The line colour shows the group type. Use the buttons along the top to show only some groups.
- **Relationships:** people joined to each other. The line style shows the tie type (friend, rival, family…). People in the same groups are pulled close together.

How to use it:
- Click someone to fade everyone not connected to them and see their details in the side panel.
- Drag people around. They stay where you put them.
- Scroll to zoom (on the wiki: Ctrl + scroll, or pinch).
- The ⚙ button has layout sliders, and **Reset layout**.
- Bigger circles have more connections. The party has a gold ring.

### Who is in it

Everyone with a `groups` or `relations` property. These are **your** properties, so they're never published:

```
groups:
  - Millbrook residents
  - "[[The Lantern Guild]]"
relations:
  - "[[Ivy Marsh]] | friend | close"
  - "[[Old Tam]] | rival"
```

- A group can be plain text, or a link to its note.
- A tie is the person, then optionally its type, then optionally `close` or `loose`.
- Tie types: knows, family, friend, lover, ally, works for, owes, rival, enemy, uneasy.

### Editing, and what the party sees

You don't need to type any of that. Click someone, then **✎ Edit groups and ties**. From the form you can:
- add or remove groups and ties
- set each tie's type and strength
- switch each group and tie **Show on wiki** on or off

The switches fill in `player_groups` and `player_relations` for you. The wiki only ever reads those. So someone's tie to a friend can be public while their secret membership stays hidden.

On the wiki, a person appears if:
- their note is published, **and**
- at least one of their connections is switched on.

A tie only shows if both people are on the wiki.

Tick **Player view** at the top to see exactly what the wiki will show.

### Group types and colours

The **People web groups** note (set in the settings) lists each group under its type:

```
location: [Millbrook residents]
government: ["[[The Crown]]"]
religion: [The Lantern faithful]
collective: ["[[The Lantern Guild]]"]
```

A group that isn't listed shows in grey. A group called **The party** is always gold.

---

## 8. Plugin settings

| Setting | What it's for |
|---|---|
| GitHub token, user, repo, branch | Where the wiki is published (see the setup guide) |
| World name | "Welcome to …" on the home page, and the timeline's intro |
| Year names | How years are written |
| Second calendar | Optional: other names for the same months, e.g. another country's calendar. Shown on the calendar. |
| Player Pages folder | Published whole |
| Player art folder | One note per picture, for the Gallery |
| People web groups note | Group types for the people web |
| Menu sections | Which vault folder goes in which wiki section |
| Public event categories | Calendarium categories that are always published |
| Publish the timeline | Shows the Timeline page on the wiki |
| Pinterest token | Optional, for moodboards |

---

## 9. Changing the code and styles

Everything is in your GitHub repo. You can try changes on your own computer first. Nothing reaches the live wiki until you push to `main`.

### One-time setup

1. Install **Node.js** (version 22 or newer) from nodejs.org.
2. Install **Git** from git-scm.com, or **GitHub Desktop** if you'd rather click than type.
3. Open a terminal in a folder you like, and run (with your own repo's address):

```
git clone https://github.com/YOUR-NAME/YOUR-REPO.git
cd YOUR-REPO
npm ci
npx quartz plugin install
```

### See the wiki on your computer

```
npx quartz build --serve
```

Open **http://localhost:8080**. It uses the pages already published in `content/`, so you don't need Obsidian. Stop it with **Ctrl + C**.

### Where things live

| Where | What it is |
|---|---|
| `quartz.config.yaml` | Site settings: the name, colours, fonts, and the menu |
| `quartz/styles/_theme.scss` | **The look.** Change this one to restyle the wiki. |
| `quartz/styles/_layout.scss` | Layout the features need (menu, phones, full-width pages). Best left alone. |
| `site-plugins/` | The wiki's features: page header, menu, maps, calendar, people web, home page boxes |
| `shared/` | The rules for what gets published (used by both the site and the Obsidian plugin) |
| `plugin/` | The Obsidian plugin |
| `content/` | The published pages. **Don't edit these.** Every publish replaces them. |

### Changing the style

**Colours and fonts** are in `quartz.config.yaml`, under `theme`:

- `colors` has a set for light mode and a set for dark mode:
  - `light`: the background
  - `lightgray`: borders
  - `gray`: faint text
  - `darkgray`: body text
  - `dark`: headings
  - `secondary`: links and highlights
  - `tertiary`: hover colour
- `typography` sets the fonts. Any Google Fonts name works, e.g. `body: Lora`.

**Anything else** goes in `quartz/styles/_theme.scss`. Some examples to try:

```scss
// Page titles in a fancy font (add it to typography first, or use one you have)
.article-title { font-family: "Cinzel", serif; }

// Headings in the link colour
article h2 { color: var(--secondary); }

// A faint paper colour behind the menu
.page > #quartz-body .sidebar.left { background: #f4efe6; }

// Round portraits
.mw-portrait { border-radius: 50%; }
```

To find what to change:
1. Right-click any part of the wiki in your browser, and choose **Inspect**.
2. Look at its class names, like `mw-portrait` or `mw-chip`.
3. Write a rule for that class in `_theme.scss`.

Each feature also has its own styles, in `site-plugins/<feature>/src/components/*.css`.

### Changing a feature

Each site plugin needs rebuilding after a change. For example, the page header:

```
cd site-plugins/page-header
node build.mjs
cd ../..
npx quartz build --serve
```

Commit the `dist/` folder too. The live site uses it as it is.

### Changing the Obsidian plugin

```
cd plugin
npm ci
node esbuild.config.mjs production
```

Copy the new `main.js` and `styles.css` into your vault's `.obsidian/plugins/<plugin folder>/`. Then turn the plugin off and on again in Obsidian. Try changes on a **copy of your vault** first.

### Putting changes live

1. Commit your changes.
2. Push them to `main`. GitHub rebuilds the site in a minute or two.

It's safest to work on a branch (`git checkout -b my-change`) and merge it on GitHub when you're happy.

### Keeping it safe

- **The repo is public.** Anyone can read what you push. Never commit notes, DM text, or real names from your campaign in code or tests.
- The Publish button only ever sends player content. Changing code can't publish your notes, unless you change the rules in `shared/`. Be careful there.
- To throw away all your changes and start again: `git checkout . && git clean -fd`.
