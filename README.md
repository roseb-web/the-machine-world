# The Machine World

The player wiki for the campaign, built with [Quartz](https://quartz.jzhao.xyz).

- `content/`: the wiki pages. **Written by the Obsidian plugin.** Don't edit by hand: every publish replaces this folder.
- `plugin/`: the Machine World Wiki Obsidian plugin (Publish wiki button).
- `shared/`: code used by both the plugin and the site (the export rules).
- `tests/`: tests for the export rules. Run with `npx tsx tests/extract.test.ts`.
- `quartz.config.yaml`: site settings.

Every push to `main` builds the site and deploys it to GitHub Pages.
