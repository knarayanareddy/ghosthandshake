# audit/ — end-to-end audit harness

Proof behind `../DEEP_DIVE.md`. This directory is **additive**: it compiles the real
`contracts/GhostHandshake.sol` (solc 0.8.24, optimizer off — matching `foundry.toml`)
and drives the full lifecycle on a **local hardhat node**. No testnet, no private keys,
no changes to the repo.

## Run it

```bash
cd audit
npm install

# terminal 1 — local EVM (dev accounts, 10000 ETH each)
npm run node

# terminal 2 — the 27-check suite
npm test
```

Expected: `==== 27 passed, 0 failed ====` (≈4 min; it mines ~20k blocks).

## Deploy the contract (Monad Testnet)

`deploy.mjs` is a self-contained deployer (Node only, no forge). Run it on a
machine that can reach the RPC (this CI sandbox is firewalled from Monad):

```bash
cd audit && npm install
PK=0x<64-hex-private-key> npm run deploy
```

It prints the **deployer address** (verify it matches the wallet you funded),
the balance, the tx hash, and finally `CONTRACT: 0x…` — paste that into
`?c=` on the play/wall pages.

Or without touching a key in any shell at all: push this branch, set the
`GH_DEPLOY_PK` repo secret, and run the **"Deploy GhostHandshake (testnet)"**
workflow (see `.github/workflows/deploy-testnet.yml`). Delete the secret
after the event.

| # | Check | Result |
|---|-------|--------|
| T1 | reveal before commit → `NoCommit` | PASS |
| T2 | double commit → `AlreadyCommitted` | PASS |
| T3a | commit hash produced by the **exact frontend code path** (`solidityPackedKeccak256(["string","bytes32"])`) accepted by the contract | PASS |
| T3b | reveal from another device (no local salt) → `NoCommit`, by design | PASS |
| T4 | two-player match: `Matched` event, `Pair` data, `handshakeCount`, `getAllPairs`/`getPair` consistency, commitments cleared | PASS |
| T5 | wrong word → `BadReveal` | PASS |
| T6 | self window expiry (block +2001) → `WindowExpired` | PASS |
| T7 | fresh commit vs **expired pending partner** → `WindowExpired`; permissionless `cancel` by a stranger un-sticks the word; match completes after un-stick | PASS |
| T8 | cancel within window → `WindowOpen`; cancel with no commit → `NoCommit` | PASS |
| T9 | re-commit after a match (commitments deleted on match) | PASS |
| T10 | retirement: `NotOwner`, `wordClaimed` set on match, `WordRetired` for third player, toggle-off re-opens the word | PASS |
| T11 | boundary: a reveal **executed in exactly block `committedAtBlock + REVEAL_WINDOW`** is accepted (strict `>`); one block later the partner is expired | PASS |
| T12 | gas snapshot: `commit` ≈ 71k (unoptimized build) | PASS |

## Notes

- The suite uses hardhat's well-known **public dev accounts** (10k ETH, no secrets) —
  local only, never point this at a live network.
- The repo's own `forge test` (in `../test/Hash.t.sol`) covers hash packing + one
  happy path; this harness adds the window/cancel/retirement/boundary paths that
  `forge test` does not. If you add Foundry tests, port T6–T11 — they are the
  regression-risk areas.
- Reverted-tx behavior, gas-limit billing, and the stuck-pending-revealer case are
  discussed in `../DEEP_DIVE.md` (section 3).
