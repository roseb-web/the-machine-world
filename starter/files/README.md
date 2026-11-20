# Player wiki

A player wiki for a tabletop campaign, published from Obsidian. It's built with [Quartz](https://quartz.jzhao.xyz).

- **Setting it up:** `docs/Setup guide.md`
- **Using it, and changing it:** `docs/User guide.md`

## What's here

- `obsidian-plugin/`: the Obsidian plugin, ready to install (Setup guide, step 5)
- `content/`: the wiki pages. **Written by the Obsidian plugin.** Don't edit by hand: every publish replaces this folder.
- `quartz.config.yaml`: site settings (name, address, colours, fonts, menu)
- `quartz/styles/_theme.scss`: the look
- `site-plugins/`: the wiki's features
- `plugin/`: the Obsidian plugin's source code
- `shared/`: the rules for what gets published

Every push to `main` builds the site and puts it on GitHub Pages.
