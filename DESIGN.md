# DESIGN.md — Ghost Handshake / Afterimage

**Lane:** product (phone ritual) + ambient installation (projector).  
**Identity:** Amsterdam **fog on canal water at dusk** — phosphorescent lichen, rust on a lock, interference lines. Not a game HUD. Not a wallet. Not purple-cyan AI slop.

If you restyle, read this first. Do not invent a second palette.

---

## Banned

Inter, Roboto, Open Sans as display. Purple–blue/cyan mesh gradients. Glassmorphism, neon glow, 12–16px radius cards. Cards in cards. Pure `#000` / `#fff` / `#888`. Bounce/elastic, pulsing dots. Gold tracking on near-black “luxury crypto.” Centered SaaS hero. Rounded-square icon tiles. Monad marketing lilac.

Motion: 150ms ease on match flash only.

---

## Palette

| Token | Hex | Use |
|-------|-----|-----|
| `--fog` | `#D5DDE4` | Player page ground |
| `--glass` | `#F4F7F9` | Word tiles |
| `--ink` | `#1A222C` | Type, rules, primary stamp |
| `--mist` | `#8A9AAB` | Secondary type |
| `--phos` | `#4A7C74` | Match, reveal success, canvas lines |
| `--signal` | `#C45C2A` | One person’s node (rust) |
| `--night` | `#0E151C` | **Canvas page only** |

Player chrome = fog. Projector = night. Never full-page dark on the phone.

---

## Type

| Role | Face | Use |
|------|------|-----|
| Display | **Fraunces** (optical size) | Title, words, match flash |
| UI | **IBM Plex Sans** | Buttons, helper |
| Docket | **IBM Plex Mono** | Addresses, leaderboard, HUD |

Tracking on title ≤ 0.02em (tight, not spaced-out luxury). Scale 12 / 15 / 19 / 24 / 30.

---

## Components

- **Word tiles:** 2-column grid, 1px ink, square corners. Selected = ink fill, glass type. Retired = strikethrough, 35% opacity.
- **Stamps:** radius 0. Connect/Commit = ink fill. Reveal = `--phos` fill. Cancel = ghost (ink outline).
- **Leaderboard:** mono list, not cards. Rank · address · count.
- **Canvas glyphs:** quadratic curve + two 8px squares (not circles). Seed from `keccak(a,b,wordHash,block)`. Append-only; never `clearRect` the bonds, only full redraw on resize.
- **Copy:** “Pick a word. Don’t say it.” Errors: “no local secret — commit on this device.” “window expired.”

---

## Success test

A judge thinks **fog / séance / canal**, not **hackathon dark mode** and not **Among Us**.
