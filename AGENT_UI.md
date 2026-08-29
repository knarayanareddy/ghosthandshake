# AGENT BRIEF — UI / UX

Law for anything visual. Also: **event sync and two wallets**. Read `DESIGN.md`. Do not `/impeccable init` (would overwrite identity).

**You own the UI pass.** Sequence below. Do not wait for another designer.

---

## 0. Order of work

1. **Two wallets can complete a match** (functional). Two browser profiles, two addresses, same `commitHash` scheme, `Matched` fires, both see flash.  
2. **Screen B draws that pair** without a refresh button (poll 4s or `Matched` subscription).  
3. Restyle only if (1–2) work: tokens in DESIGN.md, same element IDs if you keep the HTML.  
4. Bake contract address: **`?c=0x` + 40 hex** already implemented (wins over localStorage). Hide the address field behind `<details>` after save.  
5. Stop. No landing page, no 3D, no token section.

If time dies: ugly two-wallet match > pretty empty fog.

---

## 1. Identity recap

Fog paper phone (`#D5DDE4`) + night projector (`#0E151C`). Fraunces + Plex Sans + Plex Mono. Radius 0. Phosphor `#4A7C74` and rust `#C45C2A` only as signal. Squares not circles on the canvas.

Banned: Inter, purple mesh, glass, gold-on-black luxury, bounce, cards-in-cards. Full DESIGN.md.

---

## 2. Hashing (UI bug = no matches)

Must match Solidity `keccak256(abi.encodePacked(word, salt))`:

```js
solidityPackedKeccak256(["string", "bytes32"], [word, salt])
```

- `word` lowercase exactly as `words.js`.
- `salt` = 32-byte hex from `randomBytes(32)`.
- Persist `{word, salt, commitHash}` in **localStorage on that device**. Reveal on another phone will fail (“no local secret”) — that is correct; say it in the UI.

---

## 3. Screen A (index.html) behavior

- `wallet_addEthereumChain` Monad Testnet `0x279f` / 10143 (see AGENT_MONAD.md).
- Wait **receipt** before enabling the next tx from the same wallet (Monad may accept nonce-gap txs).
- Tight gas: billed on **gas_limit**, not usage. Don’t request 1M gas.
- Leaderboard: derive from `getAllPairs()` (each address +1 per pair). Don’t require a separate indexer.
- `Matched` listener: if `me` is a or b, show flash.
- Word retirement UI only if `retireWords()` is true (default false).

---

## 4. Screen B (canvas.html)

- Use **JsonRpcProvider(`https://testnet-rpc.monad.xyz`)** so the projector works **without a wallet**.
- `getAllPairs()` on an interval. **Do not `eth_getLogs` from block 0** (Monad logs max range ~1000, docs recommend 1–10). Polling the array is the intended hackathon indexer.
- Glyph seed: `keccak256(abi.encodePacked(a, b, wordHash, matchedAtBlock))` — keep in sync with the canvas script (`solidityPacked` those types).
- Append-only. Resize may full redraw from pairs (OK). Do not randomize position per frame.
- Overlay: `"{n*2} strangers, {n} bonds."`

---

## 5. Hosting

Two URLs or one origin:

- `https://…/` → player  
- `https://…/canvas.html` → wall  

HTTPS required (ethereum + esm.sh). GitHub Pages or Vercel. Not `python -m http.server` as the Devnads **Live** link.

---

## 6. Done when

- Volunteer on their phone completes reveal without you touching their device (after they committed there).  
- Projector shows a new curve within a few seconds.  
- Looks like fog/canal, not a Tailwind dashboard.
