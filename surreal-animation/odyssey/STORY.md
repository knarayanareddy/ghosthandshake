# THE SKETCHBOOK ODYSSEY — full treatment (5:00 short)
Project: The Sketchbook Comes Alive → expanded story film, vertical 9:16.

## LOCKED DECISIONS
- Title: **THE SKETCHBOOK ODYSSEY** (title card at the coda).
- Ending: **bittersweet drift** — the world gains watercolor, the crew is
  kept, but Scrib sails on beyond the page; the Hand watches him go and
  pencils one tiny extra boat "for whoever comes next."
- The existing 61 s short remains a **standalone trailer** (to be polished
  with a title card); the 5-minute film stands alone.
- Full shot list & production status: see SHOTS.md.


## Logline
On the last night before an old sketchbook gets thrown away, the first doodle
ever drawn — a small paper boat named Scrib — must sail the Notebook Sea and
rally every character in the book to reach The Last Page before dusk, when
The Hand returns with The Great Eraser.

## Themes (dual-audience)
- Kids: rescue quest — storm, monster, whirlpool, a race against dusk.
- Adults: early drafts, forgotten things, what we choose to keep; told from
  the drawings' POV, where humans are the gods.

## Odyssey mapping
- Odysseus' ship → Scrib, the paper boat (folded by The Hand)
- Wrath of Poseidon → The Fan, god of winds (storm of loose pages)
- The Cyclops → The Monster, guarding the Strait of the Couch
- Charybdis → The Coffee Whirlpool (who only wanted to be stirred)
- The Sirens → The Radio on the Siren Beach (endless-dance song)
- Athena → The Giant Pencil (draws bridges just ahead of the chase)
- Troy / the war → The Closing of the Notebook (the world ending)
- Ithaca → The Last Page, "where drawings go to be kept"

## Characters
- SCRIB — the first doodle; a paper boat with a drawn face. Brave, polite,
  quietly terrified. Arch: from "we'll be erased" to "we can be kept."
- HATCH — a stick figure, half-erased in Act 1. The stakes with a face.
  Arch: restored at the finale (the first re-drawing The Hand completes).
- THE MONSTER — the fuzzball. Scare first, hug second, ship's muscle third.
- THE FISH — scout and guide; cries graphite tears in Act 3.
- THE BIRD — eyes of the sky; carries the fading Scrib to the lamp in Act 3.
- THE CUP — the wizard; gives the prophecy; post-credits spoon gag.
- THE HAND / THE MAN — unknowable god of the desk… until the finale reveals
  he was once a boy whose own notebook was erased by a grown-up.
- THE GREAT ERASER — pink, enormous, silent. Foley: dry shhk-shhk.
  Antagonist that is never cruel — only consequence.

## Beat sheet with timings (target 300 s, 24 fps, 1080x1920)

ACT 0 — PROLOGUE (0:00–0:25)
- Moonlit room, notebook glowing like a lagoon. The Hand folds a paper boat,
  draws its face, yawns, clicks off the lamp.
- The boat wakes; the pages stir; the familiar cast peeks from the margins.
- NARRATION HOOK: "No drawing should ever be thrown away. This is the story
  of the ones who refused to be."

ACT 1 — THE DEPARTURE (0:25–1:05)
- Morning: The Hand returns with The Great Eraser; erases a test squiggle.
- Hatch is half-erased (stakes with a face). The cast watches in horror.
- The Cup speaks the prophecy: "Beyond the Desk Sea there is a Last Page.
  What is kept is never lost."
- Launch: the notebook is angled; the fan gives the first breath; Scrib
  slides down the spiral-binding rapids onto the Desk Sea.

ACT 2 — THE TRIALS (1:05–2:40)
1. STORM OF THE FAN (1:05–1:30) — pages cyclone; the Monster anchors the
   mast and roars the dial to zero. Crew barely upright, laughing after.
2. THE GRAPHITE BRIDGE (1:30–1:55) — Ink Canyon (a spilled inkwell). The
   Giant Pencil draws the bridge line just ahead of Scrib while the Eraser
   (riding The Hand's other fist) un-draws it behind. Race dynamics.
3. CHARYBDIS THE COFFEE (1:55–2:15) — the whirlpool almost takes the boat;
   she is only lonely. Promise made: "We'll stir again someday." (Callback
   teacup planted for the coda.)
4. THE SIREN BEACH (2:15–2:40) — radio song traps the crew in endless
   dance; the Bird hangs the radio on the umbrella like a bell; one clean
   note wakes them. Exit with the Monster's hug-test at the strait: he
   demands a hug, joins as ship's muscle.

ACT 3 — THE ABYSS (2:40–3:20)
- Dusk falls early. The Eraser arrives. Crumb-rain like gray snow.
- Scrib is half-erased: face fading, hatching thinning. Crew losing
  definition (visually: desaturating strokes, dissolving outlines).
- NARRATION (dark): "What is half-erased? Neither here, nor there."
- The Fish cries graphite tears; the Bird carries Scrib up toward the lamp
  — the light of the god's eye.

ACT 4 — HOMECOMING & TWIST (3:20–4:40)
- The Hand returns, gasps (coffee-splash callback, inverted), kneels…
- Opens the bottom drawer: THE BOOK OF KEPT THINGS — a huge, older notebook
  of finished, painted drawings. REVEAL: The Hand was once a boy whose own
  notebook was erased by a grown-up. He kept everything since.
- He re-draws Hatch first (restoration = mercy), frames each character, and
  paints them — watercolor floods the graphite world like sunrise.
- The Eraser is given to the Monster: marshmallow pillow. Comedy exhale.

CODA (4:40–5:00)
- The crew sails off the edge of the last page into a painted sea.
- The Hand pencils one tiny extra boat behind them — "for whoever comes
  next."
- TITLE CARD. Post-credits: the Cup taps the spoon. "Anyone?"

## Narration plan (same storybook voice, one notch epic)
- Invocation: "Tell us, O Pencil, of the boat of many folds — the sketch who
  saw the desk's far edge, who stared into the pink of the Great Eraser, and
  came home to be kept. Pull up your staples. This is the voyage."
- Act 3 dark line: "What is half-erased? Neither here, nor there."
- Closing theme: "Nothing drawn with love is ever lost. It only waits for
  the next hand."

## Music — five movements (extend soundtrack.py)
1. LULLABY (boat leitmotif) — music box + warm pad, moonlit.
2. MORNING THREAT — eraser theme: low rumble + shhk-shhk foley, sparse.
3. TRIALS — three fanfare variations (storm/bridge/whirlpool), siren
   detuned waltz on the beach.
4. THE ABYSS — near silence, ticking clock, single fading music box.
5. HOMECOMING — orchestra "gains color": new instruments enter as the
   watercolor spreads; full reprise of the lullaby in major.

## Production notes (pipeline reality)
- ~30 keyframes (generate_image) + reuse/recut of the existing 9-shot short
  as Act 0 flashback / trailer.
- ~20 narration lines (generate_speech, 10/turn → two turns).
- Extended animate.py: per-shot camera language, desaturation dissolve for
  erasure, watercolor color-flood transition (eq/hue ramp), frame-by-frame
  assembly with xfade + grain grade as before.
- Build spans ~3 working turns: (1) Acts 0–1 frames + narration A,
  (2) Acts 2–3 frames + narration B + music suite, (3) Act 4 frames,
  assembly, final mix/render.
