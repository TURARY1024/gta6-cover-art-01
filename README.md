# Leonida Cover Lab — GTA VI Cover Maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/TURARY1024/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/TURARY1024/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Turn your photos into GTA VI-style cover art: the iconic multi-panel poster
and loading-screen look, with a Vice City neon-sunset grade, exported as a
PNG to share. Free, offline, and your photos never leave your machine.

## What it does

- **Six layouts** — Nine-Panel Grid, Hero + Three, Four-Panel, Tilted
  Snapshots, Split Screen, and Full-Bleed, each with its own title block.
- **Five grades** — Sunset, Neon Nights, Heat, Vice, and Golden Hour:
  gradient-map colour grades applied per panel.
- **Any photo** — use the three built-in original sample scenes, or upload
  your own photos. Click a panel to pick it, drag to move the photo, scroll
  to zoom, and fill several panels with one photo or several.
- **Caption lettering** — Anton title in a sunset gradient (or white, or
  neon), Pacifico script subtitle with a neon glow, halftone title block,
  film grain and vignette.
- **Fast and easy** — one-click presets (Sunset Sleeve, Neon Nights, Pier
  Pressure), then Export PNG at 1080×1080, 1080×1350 or 1920×1080, or all
  three sizes at once.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

`app/` is plain static files — no build step, no network at run time. Open
`app/index.html` in desktop Chrome from any static server with `app/` at its
root.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22) copies `app/` and `screenshots/` to the output directory
and writes `dossier.json` with the vendored `vendor/makefun-app.ts`.

## Screenshots

Four renders of the app's own code in a headless browser:

1. `1-cover.jpg` — exported cover, Nine-Panel Grid, Sunset grade, portrait
2. `2-editor.jpg` — the editor with a photo loaded
3. `3-cover.jpg` — exported cover, Hero + Three, Neon Nights grade, wide
4. `4-cover.jpg` — exported cover, Tilted Snapshots, Heat grade, square

## License

MIT. Unofficial fan-made tool — not affiliated with Rockstar Games or
Take-Two Interactive. No Rockstar artwork, logos or fonts are used. Sample
photos are original art drawn for this app; fonts are SIL Open Font License
(Anton, Bebas Neue, Pacifico).
