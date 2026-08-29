# HANDOVER — Ghost Handshake × Afterimage

You are a builder agent with **no prior context**. This folder is the whole project. **Read `START.md` first**, then this file, then `AGENT_MONAD.md`, `AGENT_UI.md`, `AGENT_BLITZ.md`. `DESIGN.md` / `PRODUCT.md` are law for look and copy. Do not invent a second product.

---

## 1. Event

- **Monad Blitz Amsterdam**, Saturday 29 Aug 2026, Les Lokaal, Oderweg 6. Solo or small team OK.
- Platform: https://blitz.devnads.com/ — register Amsterdam, **claim testnet MON**, submit **GitHub + HTTPS live URL**, peer vote 1–5.
- Event page: https://blitz.devnads.com/events/monad-blitz-amsterdam
- Chain: **Monad Testnet, chain id 10143**, unless organizers say mainnet 143.
- Pitch ~18:45; submit on Devnads **before** you queue.

---

## 2. What you are building

**One sentence:** Strangers pick the same secret word without saying it, reveal on-chain together, and each bond **permanently draws a new glyph** on a shared picture that grows all day.

**Why it fits a peer-voted room:** voters *are* the content. The projector runs from late morning; judges see momentum walking past, not only at 18:45.

**Loop:**

1. Wall shows 8 words: `canal, blitz, parallel, monad, ghost, tulip, amstel, fog` (`web/words.js`).
2. Player **Commit**: client makes `salt` (bytes32), `commitHash = keccak256(abi.encodePacked(word, salt))`, stores `{word,salt}` in **localStorage**, calls `commit(commitHash)`.
3. Mingle. Do not say the word.
4. Both **Reveal** `reveal(word, salt)` from the **same phones** that committed.
5. First revealer for a `wordHash` waits in `pendingRevealer`. Second revealer in window completes **Matched**, increments `handshakeCount`, appends `Pair`.
6. Ambient page listens / polls `getAllPairs()` and draws a deterministic glyph per pair. **Never reset the picture during the day.**

**Default: no staking.** Free to play. Do not add `payable` until commit/reveal/match is proven with two wallets.

**Word retirement (`retireWords`) defaults FALSE.** Eight words × one pair would starve the canvas. Leaderboard is the game. Owner can `setRetireWords(true)` later.

---

## 3. Critical contract facts (already in `GhostHandshake.sol`)

- Hash: `keccak256(abi.encodePacked(word, salt))` with `string word` + `bytes32 salt`. Frontend: `solidityPackedKeccak256(["string","bytes32"],[word,salt])`.
- `wordHash = keccak256(bytes(word))` — lowercase list only.
- `REVEAL_WINDOW = 2000` blocks ≈ **10 minutes** at **300ms** Monad blocks. **40 blocks would be ~12 seconds — too short to mingle.** Measure testnet, then tune one constant.
- **`TIMESTAMP` is shared across 3–4 blocks** — never use it as uniqueness. Pairs key off addresses + wordHash + `matchedAtBlock`.
- **Stuck first-revealer:** if nobody comes, they cannot `commit` again unless cleaned. `cancel(player)` after window works for **unrevealed and lonely-revealed** (clears `pendingRevealer`). Anyone may call it.
- `getAllPairs()` returns the full array (fine for dozens; don’t use for thousands).
- **Do not “fix” packing to `abi.encode`** without changing the UI hash to match.

---

## 4. Repo map

| Path | Role |
|------|------|
| `contracts/GhostHandshake.sol` | Only contract |
| `script/Deploy.s.sol` | Broadcast, logs address |
| `foundry.toml` | solc 0.8.24, testnet RPC |
| `web/words.js` | Canonical word list |
| `web/index.html` | Screen A — phone: words, commit, reveal, leaderboard |
| `web/canvas.html` | Screen B — projector: Afterimage, JsonRpcProvider poll |
| `PRODUCT.md` / `DESIGN.md` | Product + brand |
| `AGENT_*.md` | UI / Blitz / Monad integration |

**Not in snapshot:** `lib/forge-std`. First command: `forge install foundry-rs/forge-std`.

---

## 5. Demo script (90 seconds)

1. Projector (Screen B) already showing glyphs. *“This has been running since late morning. Every line is two strangers.”*
2. Leaderboard on phone. *“This address matched more than once — they hunted partners.”*
3. You + volunteer commit **without speaking the word** (comedy mingle 10s).
4. Both reveal. Flash + new glyph on the wall.
5. Closer: *“I can close this laptop. `getAllPairs` on the explorer still says they found each other. The picture keeps growing if I leave.”*

Seed 2–3 fake pairs with extra wallets **before** people arrive so the canvas is not empty.

---

## 6. Day timeline (solo, 7h)

| Time | Task |
|------|------|
| 0:00–0:30 | `forge-std`, faucet, deploy 10143, Remix or cast commit/reveal two keys |
| 0:30–1:30 | Screen A against live address; two browser profiles |
| 1:30–2:00 | Leaderboard from `getAllPairs` |
| 2:00–3:00 | Screen B glyphs append-only; projector |
| 3:00–3:30 | `wallet_addEthereumChain`, bake address, hide Deploy |
| 3:30–4:30 | Host HTTPS (Pages/Vercel), README 60s, Devnads submit |
| 4:30–5:30 | Real people in the room; cancel/window tests |
| 5:30–6:00 | Freeze RPC, funded wallets, screenshot fallback |
| 6:00–6:45 | Rehearse |
| If behind | Cut retirement, cut staking (already cut), cut confetti. **Never cut two-wallet match.** |

---

## 7. Frozen / do not add

Staking, bonus pot, NFT `tokenURI`, Three.js, MUD, EAS, AI agents, extra words without reprinting the wall, Inter/purple UI, mainnet unless told.

---

## 8. Pitch one-liner

Two strangers share a word they never said out loud. The chain remembers. The wall draws it.
