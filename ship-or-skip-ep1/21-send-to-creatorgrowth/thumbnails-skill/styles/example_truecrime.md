# Style — Example (true-crime / unsolved mystery)

> This is the per-creator **style block**. To onboard a different creator,
> copy this file, swap the values, and point the skill at the new file
> (`STYLE_FILE`). Everything else in the skill is creator-agnostic.

**Creator:** Example — true-crime / unsolved-mystery / dark-history channel.
**Face on thumbnails?** No — illustrated subjects + silhouettes, never the creator's own face.

## Locked Style Block

| Property | Value |
|---|---|
| Aesthetic | Cinematic digital **illustration / graphic-novel painterly** — dark, moody, dramatic chiaroscuro lighting. NOT pixel art, NOT a photograph. |
| Palette | Dark desaturated base (blacks, deep teal, cold browns) + **heavy blood-red accents** + a warm amber/orange atmospheric glow as the light source |
| Title text | Bold **condensed all-caps**, words a **free mix of WHITE and RED** (the death/threat/number word usually red), heavy 3D extrude or thick drop-shadow, high contrast against the dark scene |
| Mood | Ominous, tense, cinematic — a still from a dark thriller |
| Recurring devices | Detective **investigation board** (corkboard + polaroids + red string); a **lone noir silhouette** (man in a hat / fedora); **status-stamped portraits** (`MISSING` / `DECEASED` in red); newspaper clippings; a single dramatic spotlight cutting the dark |
| Hero | The subject of the mystery — a staged illustrated person, place, or artifact, cinematically lit. The image is the *evidence/stakes*, the title names the mystery. |
| Fixed logo / mascot | **None.** The brand IS the style — there is no logo to paste. Consistency comes from palette + mood + the recurring devices, not a mark. |
| Aspect ratio | 16:9, 1920×1080 |

## The 4 Layout Patterns

Pick one per title based on its hook (her equivalent of a 6-pattern menu — extend as needed).

### A — Subject Portrait
**Use when:** the mystery centers on one person.
- A single illustrated central figure (the victim / suspect), atmospheric, dramatically lit.
- Background: newspaper clippings / case-file texture, warm glow behind the figure.
- Title lower-right or lower-third, white + red mix.
- *Reference: "The Black Dahlia Murder".*

### B — Cinematic Scene + Top Banner
**Use when:** the story is about a place or an event (a disaster, a location).
- A wide, dramatic environment (a cave, a road, a building) with a **lone silhouette** for scale + dread.
- **Huge title across the TOP**, white + red, heavy extrude.
- *Reference: "Buried Alive".*

### C — Investigation Board
**Use when:** the video covers multiple people / connected cases ("10 scientists", "the suspects").
- A **corkboard** with 4–6 polaroid-style illustrated portraits, **red string** connecting them, push-pins.
- Red **`MISSING` / `DECEASED` stamps** under faces.
- A number callout + a red word (e.g. big number + `DEAD OR MISSING`).
- *Reference: "Deaths and Disappearances of 10 NASA Scientists".*

### D — Spotlight Reveal
**Use when:** the hook is a count or a grim tally, staged theatrically.
- A dark staged room, **hanging evidence photos on strings**, a single dramatic spotlight.
- A **lone noir silhouette** standing in the light.
- A **big number** (white) + a red word (e.g. `10` + `DEAD`).
- *Reference: "The Suspicious Deaths of 10 American Scientists".*

## Locked Prompt Template

The skill fills `[HOOK TEXT]`, `[LAYOUT BLOCK]`, and `[SCENE / HERO]` per slot.
**`[HOOK TEXT]` is a SHORT punchy phrase (≤3–4 words) — NOT the video title.**
The title lives in the card's title slot; the thumbnail proves it (see the
never-restate guard below). Leave the rest verbatim — it is her signature.

```
A cinematic, dramatic YouTube thumbnail in a dark true-crime / mystery style.
Rendered as a moody digital ILLUSTRATION / graphic-novel painting — NOT a
photograph, NOT pixel art. Heavy cinematic chiaroscuro lighting: a dark,
desaturated scene (blacks, deep teal, cold brown) lit by a single warm
amber/orange light source, with strong blood-red accents.

SCENE: [SCENE / HERO — the literal visual evidence of THIS title]

LAYOUT (follow exactly):
[LAYOUT BLOCK — one of A/B/C/D above, written out concretely for this title]

THUMBNAIL HOOK: render the SHORT phrase "[HOOK TEXT]" (max 3–4 words) as a bold
CONDENSED ALL-CAPS hook, a mix of WHITE and RED words (the most dramatic / death
/ number word in RED), heavy 3D extrude and a thick dark drop-shadow, readable at
mobile size (320×180). This hook is the ONLY big text in the image.

NEVER restate the video title. The hook is NOT the title — it is a short stakes
word, number, or question that ADDS to it (e.g. "4 DAYS", "WHY?", "NEVER LEFT",
"HOURS LATER"). The title lives outside the image; the thumbnail is the visual
EVIDENCE of the title, never its words echoed back.

CRITICAL TEXT RULE: do NOT invent any extra words, channel name, gibberish, or
banner anywhere in the image. The ONLY large text is the hook above. Small
in-scene labels are allowed ONLY where the layout calls for them (e.g. red
"MISSING"/"DECEASED" stamps, a date on a clipping) — nothing else.

No creator's face. No webcam. No watermark. Ominous, tense, cinematic.
Output must be 16:9 aspect ratio (1920×1080).
```

## Guards (universal — keep when porting)

- **Thumbnail ≠ title — never put the title in the thumbnail.** The image carries
  a SHORT hook (≤3–4 words) that ADDS to the title; the title's own words never
  appear. Title "Father Buried Forever: The Nutty Putty Tragedy" → thumb hook
  "BURIED ALIVE". Title "...10 Scientists" → a board of 10 stamped portraits +
  maybe "WHO?", never the sentence retyped. If the rendered hook is just the
  title again, it's a reject — regen with a real hook.
- **Prove, don't restate.** The image is the *evidence/stakes* of the title. The
  hook is a stakes word / number / question, not a summary of the sentence.
- **Mobile-readable at 320×180.** One dominant focal element (one face, one
  silhouette, one number, one board) beats a busy scene with fine detail.
- **No invented words.** Read every render; regen any with a gibberish word,
  wrong channel name, or a second stray headline.
- **One concept per title.** Nine different titles ⇒ nine different scenes — never
  the same composition reused under different words.
