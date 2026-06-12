# IDEA ♥ SWIPE — Tinder for Video Ideas

Swipe through your video-ideas backlog one big card at a time. Right swipe
sends an idea to the content calendar, left swipe archives it. When the deck
runs out, the app builds your filming schedule for the week as a
drag-to-reorder calendar.

## Run it

```sh
node server.js
```

Then open **http://localhost:5173**.

(Any static server works too, e.g. `python3 -m http.server 5173` — the app
just needs `ideas.json` served over HTTP.)

## Controls

| Action | How |
| --- | --- |
| Add to content calendar | Swipe/drag right, `→`, or the FILM IT button |
| Archive | Swipe/drag left, `←`, or the ARCHIVE button |
| Undo last swipe | `Z` or the UNDO button (works from the calendar too) |
| Reorder the schedule | Drag cards between or within days |
| Copy schedule | COPY MD button (Markdown to clipboard) |
| Sound / start over | SND and RESET buttons in the top bar |

## How it works

- **Data** is read live from `./ideas.json` (title, thumbnail, score, source).
  Ideas with missing or unreachable thumbnail URLs get a deterministic
  16-bit pixel-art placeholder generated on a canvas, so no broken images.
- **Swipe physics**: pointer-driven drag with rotation and verdict stamps;
  release velocity is measured, so a quick fling commits even on a short
  drag. Weak releases spring back with a damped spring integrator.
- **Schedule**: liked ideas are distributed round-robin across the next
  7 days in descending score order (best ideas film first), then you can
  drag cards anywhere. Reordering persists.
- **Persistence**: swipes, the schedule, and the mute setting live in
  `localStorage` — refresh-safe. RESET clears everything.

No dependencies, no build step: `index.html` + `styles.css` + `app.js`
served by the zero-dependency `server.js`.
