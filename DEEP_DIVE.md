# DEEP DIVE — Ghost Handshake × Afterimage

End-to-end review of this repo (single commit `819862d`, 14 files), performed
2026-08-29. Method: full read of every file; **compilation of the real contract
with the exact pinned solc 0.8.24**; execution of a 27-check end-to-end suite on a
local EVM (`audit/` — all pass); independent re-implementation of the frontend hash
path; and cross-checking every Monad claim in the docs against `docs.monad.xyz`.

---

## 1. What it is

A hackathon entry for **Monad Blitz Amsterdam** (Les Lokaal, 2026-08-29): two
strangers each pick one of 8 words — `canal blitz parallel monad ghost tulip
amstel fog` — without telling each other, **commit** a hash on-chain, mingle, then
both **reveal**. If the words match, an immutable `Pair` is appended and a
projector page (**Afterimage**) deterministically draws a new glyph from that
pair. The picture only grows; the bond is a chain fact, not app state.

Repo state at review time: created **10:54 UTC, pushed 11:04 UTC** (10 minutes
before the review), 1 branch, 0 stars/forks/issues/PRs, **no CI, no LICENSE file**
(contract header is MIT), no GitHub Pages deployment, README still carries
`0xTODO` / live-URL placeholders — **no contract address is deployed or recorded
anywhere in the repo yet.**

## 2. End-to-end flow (verified by execution)

1. **Commit** — client makes `salt = randomBytes(32)`,
   `commitHash = keccak256(abi.encodePacked(word, salt))` via
   `solidityPackedKeccak256(["string","bytes32"],[word,salt])`;
   `{word,salt,commitHash}` go to **localStorage on that device**;
   `commit(commitHash)` on chain.
2. **Mingle** — the word must not be said.
3. **Reveal** — `reveal(word, salt)` from the *same phone* (the salt is the only
   secret; another device legitimately fails with `NoCommit` — the UI copy for
   this is specified in `AGENT_UI.md`).
4. **Match** — first revealer for a `wordHash` parks in `pendingRevealer`; the
   second, inside `REVEAL_WINDOW = 2000` blocks, completes: `Matched` event,
   `Pair{a,b,wordHash,matchedAtBlock}` appended, both commitments deleted (they
   can commit again).
5. **Draw** — `canvas.html` polls `getAllPairs()` every 4s with a **wallet-less**
   `JsonRpcProvider` and strokes a quadratic curve + two 8px squares, seeded by
   `keccak256(packed(a,b,wordHash,matchedAtBlock))` — a pure function of on-chain
   data, so every viewer renders the identical picture. Append-only; full redraw
   only on resize (per `DESIGN.md`).

`audit/e2e.mjs` executes all of this: **27/27 checks pass** (run it with
`cd audit && npm install && npm run node` + `npm test`).

## 3. Contract deep dive (`contracts/GhostHandshake.sol`, 156 lines)

**Solid for its scope:**
- No reentrancy surface (zero external calls); no delegatecall/selfdestruct.
- Minimal privileged surface: `owner` can only `setRetireWords(bool)`.
- **Block numbers, not timestamps** — correct for Monad, whose `TIMESTAMP` has
  1-second granularity (3–4 blocks share a timestamp). `matchedAtBlock` is the
  uniqueness key, as `AGENT_MONAD.md` requires.
- **Boundary is inclusive-correct**: `block.number > committedAtBlock +
  REVEAL_WINDOW` — a reveal executed in exactly block `+2000` is accepted
  (verified by mining so the reveal tx itself became block #2000); one block
  later the partner window is expired.
- **`cancel()` is permissionless** and un-sticks the nasty state: a lonely
  first-revealer can neither commit again nor be matched, and any stranger can
  clear `pendingRevealer[wordHash]` after the window (verified end-to-end).
- `uint64` overflow in window arithmetic is not realistic (~10⁸ blocks/yr at
  300ms vs 2⁶⁴).

**Subtleties (behavior, not bugs — know them before demo day):**
1. `CannotMatchSelf` is **unreachable dead code**: being the pending revealer
   implies `revealed = true`, so a second reveal reverts `AlreadyRevealed`
   first; after a cancel, `pendingRevealer` is cleared by the same call.
2. A word can be **soft-locked by a ghost pending-revealer** until someone pays
   for `cancel` — permissionless and cheap, so it self-heals in a crowd, but on
   demo day the fix is a stranger's tx (or `cast send`), **not** the page's
   "Cancel mine" button, which only cancels yourself.
3. `AlreadyCommitted` fires **even after the window passes**: a player who
   commits and never reveals (or reveals the wrong word, or a retired word) is
   locked out of new commits until window expiry **and** a cancel. By design —
   but it is the #1 "why can't I play again" question.
4. **No stake ⇒ no sybil cost.** Two wallets of one person can self-match the
   same word; the leaderboard (derived from `getAllPairs`) can be gamed. The
   product docs accept this ("they hunted partners") and even instruct seeding
   2–3 fake pairs — the pitch is ritual + momentum, not identity proof.
5. `getAllPairs()` returns the full array — O(n) calldata, fine for dozens of
   pairs (the docs say exactly this; don't use it for thousands).
6. **Privacy nuance:** `reveal`'s calldata carries the *raw word* — public on
   the explorer forever. The canvas shows only `wordHash`, so the wall stays
   mystifying, but "a word they never said out loud" is publicly legible
   on-chain once revealed.

## 4. Hashing — the part that makes or breaks matches (verified 3 ways)

- `solidityPackedKeccak256(["string","bytes32"],[word,salt])` ==
  manual `keccak256(utf8(word) ‖ salt)` — identical.
- A commit hash produced by the **exact frontend code path** was accepted by the
  deployed contract in the E2E suite (receipt `status = 1`).
- `abi.encode(word,salt)` (length-prefixed) provably **differs** from packed;
  `test/Hash.t.sol` guards this and `START.md` says do not "fix" it to
  `abi.encode`.
- `wordHash = keccak256(bytes(word))` ↔ JS `keccak256(toUtf8Bytes(word))` ✓.
- Canvas glyph seed: `solidityPacked(["address","address","bytes32","uint64"])`
  is exactly 80 bytes = Solidity `abi.encodePacked` of the same types, over the
  four on-chain `Pair` fields; the `u32(h, i)` offsets (i = 0..7) are in-bounds.

## 5. Frontend deep dive

**`web/index.html` (Screen A, fog `#D5DDE4`)** — right things: `?c=` query wins
over localStorage; `wallet_addEthereumChain` with the correct Monad Testnet
payload (`0x279f`); receipt-wait before the next tx; leaderboard derived from
`getAllPairs()` (no indexer); retirement UI only when `retireWords()` is true;
`Matched` listener keys the flash off both `a` and `b`; DESIGN.md copy verbatim
("Pick a word. Don't say it.").

**Issues found:**
- **No `receipt.status === 1` check anywhere.** `commit` logs "committed … (keep
  this phone)" and `cancel` logs "cancelled" unconditionally — even when the tx
  reverted. On Monad a revert **still costs `gas_limit × price` MON**, so a
  `BadReveal` silently burns gas and reads as success. Highest-value demo-day fix.
- `reveal`/`cancel` have no `!gh` guard (uncaught `TypeError` if clicked
  pre-connect with a stale `gh_secret` in localStorage); a rejected chain switch
  in `ensureChain` is unhandled.
- ethers 6.13.4 pinned via `esm.sh` — no SRI, no CSP; the page is only as
  trustworthy as esm.sh's edge.
- Minor: `.word` buttons inherit the global `button` margin, nudging the
  2-column grid by ~2px.

**`web/canvas.html` (Screen B, night `#0E151C`)** — right architecture for the
projector: no wallet, public RPC, 4s poll (within QuickNode's 50 rps),
append-only index-keyed drawing, DPR-correct canvas sizing, hues inside the
palette (phosphor hsl 160–199 ≈ `#4A7C74`; rust 18–33 ≈ `#C45C2A`), squares not
circles, HUD "`n×2` strangers, `n` bonds".
Caveats: after a **testnet reset** (one happened 2025-12-16) or a dead contract
the `drawn` index set goes stale and the HUD shows the raw RPC error — it fails
*visible*, not silent, and a new `?c=` re-wires it. No offline fallback card.

## 6. Monad accuracy — cross-checked against official docs

Every chain fact in `AGENT_MONAD.md` matches `docs.monad.xyz`: testnet
**10143 / `0x279f`**, mainnet **143**, RPC `https://testnet-rpc.monad.xyz`
(QuickNode: 50 rps, **25 rps for `eth_call`/`estimateGas`** — exactly as stated),
2025-12-16 genesis reset, faucet/explorers, and the headline quirk
**`gas_paid = gas_limit × price_per_gas`** (official doc; an async-execution
anti-DoS choice — which is why "tight estimateGas + small buffer" is correct and
necessary, and why reverting txs cost real MON). Min base fee 100 MON-gwei and
30M tx cap also match.

Soft spot: block time is stated as **~300ms** (≈10 min for `REVEAL_WINDOW =
2000`); third-party validator guides say 400ms (≈6.7 min). The docs know this
and instruct measuring `cast block` on day one and tuning that *one constant* —
an honest hedge. (The testnet RPC is unreachable from the review sandbox, so
live block time and any deployment could not be observed; the repo contains no
deployed address.)

## 7. Tests & build — the thinnest layer

- The repo ships **one test file, ~4 meaningful assertions**
  (`test/Hash.t.sol`: hash equality, packed ≠ encode, two-player happy path,
  `BadReveal`). Untested in-repo: window expiry (both players), all `cancel`
  paths, `WindowOpen`/`NoCommit`, retirement, re-commit after match, the +2000
  boundary, event data. `audit/` covers all of it — and the contract passes.
- No CI, no `slither`, no gas snapshot, no LICENSE file, single squashed commit.
- `foundry.toml` is correct (solc 0.8.24, both RPC endpoints); `Deploy.s.sol` is
  minimal-correct.

## 8. Documentation — the standout

This is an **agent-engineered repo**, and it shows: `AGENT_*.md` briefs written
to make a builder agent reliable — explicit reading order
(`START → HANDOVER → AGENT_MONAD → AGENT_UI → AGENT_BLITZ`), "this file wins
on…" priority rules, copy-paste Devnads card copy, a 90-second demo script, a
7-hour solo timeline with cut priorities ("**never cut two-wallet match**"), a
frozen-scope list, and `DESIGN.md`/`PRODUCT.md` as law with a *banned* list (no
Inter, no purple mesh, no glassmorphism, squares not circles, radius 0, exact
hex palette, exact error copy). ~20 doc claims were cross-checked against the
code (REVEAL_WINDOW, word list, hash scheme, `?c=` precedence, 4s poll, chain
IDs, `retireWords` default, glyph seed, "prefer `getAllPairs()` over
`eth_getLogs` from block 0") — **all consistent**.

## 9. Event-day risk list

1. **No deployed address in the repo** and **no HTTPS hosting yet** (`has_pages:
   false`) — the Devnads card requires GitHub + a working HTTPS Live URL;
   `localhost` as Live = wasted votes per the project's own brief.
2. README live URLs / contract are still `TODO` placeholders.
3. Reverted txs read as success in the UI (no status check) and cost MON on
   Monad — a one-line `receipt.status` check before doors.
4. A stuck lonely-revealer needs a *stranger-initiated* cancel — have a
   `cast send` one-liner ready on the demo laptop.
5. No LICENSE file on a repo the judges will read.
6. The wall has no offline/RPC-down fallback.
7. esm.sh dependency: player phones need egress to esm.sh **and** the public RPC
   — test on the venue WiFi before the demo.

## 10. Verdict

A remarkably disciplined hackathon build: a small, correct-by-construction
commit-reveal contract (27/27 end-to-end checks pass, including every edge the
repo's tests skip), a JS hash path provably byte-identical to the Solidity
packing, a deterministic on-chain-derived generative canvas, and documentation
engineered to a level most teams never reach. The weak points are operational,
not architectural: thin in-repo tests, no CI/license, no deployed address yet,
and a UI that doesn't distinguish "reverted (you paid for it)" from
"succeeded". For a peer-voted room where the judges walking past are the
product, the design is exactly right — and the one thing to fix before the 18:45
pitch is the receipt-status check, because the first confused volunteer will
cost more than the rest of the day.
