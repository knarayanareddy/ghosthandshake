# The Sketchbook Comes Alive — cinematic surreal short (9:16)

A 61-second, vertical 1080×1920 @ 24 fps surreal-comedy film in which the graphite
drawings in a spiral notebook leap off the page and collide with the photoreal
world. Seamless 2D-pencil-sketch × 3D-photo integration, realistic camera work,
an original orchestrated soundtrack, film grain and a warm cinematic grade.

**Final deliverable:** `sketchbook_comes_alive_9x16.mp4` (H.264 + AAC, ~45 MB)

## Shot list

| # | Time | Scene | Camera |
|---|------|-------|--------|
| 1 | 0:00 | Large white spiral notebook full of detailed pencil drawings on a wooden table — the Drawings: monster, fish, paper plane, coffee cup, umbrella | Slow push-in toward the pages |
| 2 | 0:06 | A giant yellow pencil draws a living squiggle while a sketch character peeks over the paper | Drifting push-in + handheld sway |
| 3 | 0:13 | A pencil-drawn monster rears up on the table; a frightened man stumbles back, mug mid-air | Fast pull-back reveal (start zoomed on the roar) |
| 4 | 0:20 | A powerful desk fan blasts loose sketch sheets through the room | Push-in through the paper storm |
| 5 | 0:26 | A man rides a giant paper airplane past the bookshelf, a sketched bird alongside | Pull-out flying reveal, stronger sway |
| 6 | 0:33 | A man fishes in a bathtub; a tiny cartoon fish leaps off his line | Gentle macro push-in |
| 7 | 0:40 | A giant coffee cup with a surprised pencil face is stirred by a hand | Macro push-in on the whirlpool |
| 8 | 0:46 | A man relaxes under a beach umbrella while a radio plays sketched music notes | Slow lateral pan across the "beach" |
| 9 | 0:53 | A man lifts a giant sheet of paper — tiny cartoon characters celebrate beneath | Hero pull-back reveal, fade to white |

Transitions: crossfades, a smooth-up wipe, a circle-open iris and a fade-to-white
finale; 0.7 s each, with grain/vignette applied over the whole timeline so cuts
feel like one camera.

## Sound (100% original, synthesized in `soundtrack.py`)

Whimsical ambient score (pads, plucks, kick/hat groove at 92 BPM, steel-drum
melody) plus foley-style SFX per scene: page flutters, pencil scratches, the
monster's growl and cartoon boings, fan wind, water plips, a rotating coffee
whirl (auto-panned), spoon clinks, shaker groove and a finale glissando —
tanh saturation, vinyl crackle, 1.2 s fade-in / 2.6 s fade-out.

## Rebuild

```bash
pip install numpy imageio-ffmpeg   # provides the ffmpeg binary
python3 soundtrack.py              # -> build/soundtrack.wav  (61.4 s)
python3 animate.py                 # -> sketchbook_comes_alive_9x16.mp4
```

`animate.py` renders each keyframe with a `zoompan` camera (smoothstep-eased
zoom/pan plus sinusoidal handheld sway on a 1.22× overscan canvas), sharpens,
then assembles the 61.4 s timeline with `xfade` transitions, `eq` grade,
`vignette` and `noise` film grain.

## Files

- `keyframes/*.png` — 9 AI-generated photoreal keyframes (941×1672, native 9:16)
- `animate.py` / `soundtrack.py` — fully deterministic rebuild scripts
- `sketchbook_comes_alive_9x16.mp4` — the film
- `build/` — intermediate clips (regenerated on run)
