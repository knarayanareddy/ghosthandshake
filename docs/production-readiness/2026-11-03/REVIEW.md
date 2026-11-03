# Ghost Handshake review

## 1. Scope and verdict

Repository: `knarayanareddy/ghosthandshake` at pinned SHA `665f57471e2cfc765cd212b158e39b607872ab7e`.

Stage: **prototype**. Confidence: **medium-high for the sampled contract/client/harness paths, low for deployed runtime behavior because runtime was not run**. This pass inspected the sampled snapshot files `README.md:1-50`, `audit/package.json:1-17`, `.github/workflows/deploy-pages.yml:1-33`, `.github/workflows/deploy-testnet.yml:1-22`, `.github/workflows/seed-pairs.yml:1-23`, plus three pinned source bodies named by the independent verdict: `contracts/GhostHandshake.sol:4-9,68-100`, `web/index.html:108-160,222-244`, and `audit/e2e.mjs:1-5,107-116,159-188`. Runtime status: **NOT RUN**. No wallet, browser, chain, deploy, or local harness execution was performed. This is not a smart-contract certification. See the paired [remediation plan](REMEDIATION_PLAN.md).

The sampled source shows a real salted commit/reveal design and a real local lifecycle harness, so the main blocker is no longer “unknown cryptography.” The remaining release blockers are narrower: pre-reveal secrecy depends on browser-local `gh_secret` storage, manual deployment workflows install mutable Node dependencies before using a deploy key, and the existing lifecycle harness is not evidenced as a required gate on the reviewed SHA.

## 2. Architecture and product boundary

The repo contains a static Monad Testnet client and a single on-chain pairing contract. The README places the user-facing surfaces at `web/index.html` and `web/canvas.html`, and the contract at `contracts/GhostHandshake.sol` on Monad Testnet 10143 ([README.md:5-11](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/README.md#L5-L11)).

The contract source establishes that V1 is intentionally free-to-play and that commitments are salted: “`Do not add payable until the match loop is proven. Hash: keccak256(abi.encodePacked(word, salt))`” ([`contracts/GhostHandshake.sol:5-8`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/contracts/GhostHandshake.sol#L5-L8)). Reveal re-checks the same hash on chain: “`if (keccak256(abi.encodePacked(word, salt)) != c.commitHash) revert BadReveal();`” ([`contracts/GhostHandshake.sol:81-85`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/contracts/GhostHandshake.sol#L81-L85)).

The web client attempts to bind users to Monad Testnet before account access. It hard-codes `chainId: "0x279f"`, `chainName: "Monad Testnet"`, and `rpcUrls: ["https://testnet-rpc.monad.xyz"]`, then calls `wallet_switchEthereumChain` and falls back to `wallet_addEthereumChain` on error `4902` ([`web/index.html:108-160`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/web/index.html#L108-L160)). That is a source-established client control. Its runtime effect still depends on the connected wallet and was not exercised here.

The repo also contains a real local lifecycle harness. `audit/package.json` says the audit package “`drives the full commit/reveal/match/cancel lifecycle on a local hardhat node`” ([`audit/package.json:6-10`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/audit/package.json#L6-L10)), and `audit/e2e.mjs` includes compatibility and timeout cases rather than empty placeholders.

## 3. Findings ledger

1. **GH-1 — High, confirmed static — pre-reveal secrecy and successful reveal depend on browser-local `gh_secret`, not on missing salt**  
   Evidence: the contract explicitly uses a salted commit and verifies it on reveal ([`contracts/GhostHandshake.sol:5-8`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/contracts/GhostHandshake.sol#L5-L8), [`contracts/GhostHandshake.sol:81-85`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/contracts/GhostHandshake.sol#L81-L85)). The client then generates `const salt = hexlify(randomBytes(32));` and writes `localStorage.setItem("gh_secret", JSON.stringify({ word, salt, commitHash }))`, while reveal later aborts with `"no local secret — commit on this device"` if that record is missing ([`web/index.html:222-244`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/web/index.html#L222-L244)).

   Impact: the main privacy boundary before reveal is the browser/device/origin storing `gh_secret`. If that local state is exposed, the chosen word and salt are exposed before the on-chain reveal. If that local state is cleared or the user changes devices, the user may be unable to reveal at all. The source does **not** establish encryption at rest, backup/recovery, multi-device sync, or privacy beyond the client’s local storage boundary.

   Recommended correction: rewrite user-facing copy and release docs to say the secret is salted but stored locally until reveal, that reveal is public on chain, and that clearing browser storage or switching devices can strand a pending commit unless an explicit recovery/export mechanism is added and reviewed.

2. **GH-2 — Medium, confirmed static — deploy/seed workflows install mutable audit dependencies immediately before using the deploy key**  
   Evidence: both manual testnet workflows run `npm --prefix audit install --no-audit --no-fund` and then execute scripts with `PK: ${{ secrets.GH_DEPLOY_PK }}` ([`deploy-testnet.yml:13-22`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/.github/workflows/deploy-testnet.yml#L13-L22), [`seed-pairs.yml:13-23`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/.github/workflows/seed-pairs.yml#L13-L23)). A lockfile exists in tree (`audit/package-lock.json`), but these reviewed workflows do not enforce a locked install.

   Impact: the reviewed release path gives freshly resolved Node dependencies access to a signing key during manual deploy/seed operations. That is a supply-chain and release-integrity risk even on testnet.

   Recommended correction: switch to deterministic installs, pin action/runtime inputs as release policy requires, and gate deploy/seed jobs behind explicit owner approval and candidate verification.

3. **GH-3 — Medium, confirmed static — the lifecycle harness exists, but the reviewed automation does not show it as a required gate**  
   Evidence: `audit/e2e.mjs` states it “`drives the full commit/reveal/match/cancel lifecycle on a local EVM`” ([`audit/e2e.mjs:1-5`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/audit/e2e.mjs#L1-L5)), verifies “`T3: JS hash accepted by Solidity (exact frontend path)`” ([`audit/e2e.mjs:107-116`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/audit/e2e.mjs#L107-L116)), and covers “`T7: partner window expiry + permissionless unstick`” plus `T8 cancel semantics` ([`audit/e2e.mjs:159-188`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/audit/e2e.mjs#L159-L188)). By contrast, the sampled workflows show Pages auto-deploy on push and manual deploy/seed jobs, but no required workflow running this harness or `forge test` on the reviewed SHA ([`deploy-pages.yml:3-33`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/.github/workflows/deploy-pages.yml#L3-L33), [`README.md:35-37`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/README.md#L35-L37)).

   Impact: the repo has meaningful test material, but this review found no sampled evidence that code changes must pass that material before the static client is published or before a deployment key is used.

   Recommended correction: make the existing lifecycle harness and Foundry tests required for candidate promotion, and prove they fail on intentionally broken hash/window behavior.

## 4. Five-discipline assessment

- **Correctness / code review:** source-established controls exist: salted commits, on-chain reveal re-check, and a lifecycle harness covering hash compatibility, expiry, matching, and cancel semantics. Unknowns remain around deployed-bytecode correspondence, actual contract address provenance at runtime, and any behavior not covered by the sampled ranges.
- **Automation / testing:** there is real test intent in `audit/e2e.mjs`; this pass did not run it. The current issue is lack of sampled evidence that it is a required gate, not lack of a harness.
- **DevOps / operations:** Pages deploys the static `web/` directory automatically on push ([`deploy-pages.yml:3-33`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/.github/workflows/deploy-pages.yml#L3-L33)). Deploy and seed remain manual and signer-backed. Rollback can revert the web artifact, but already mined chain actions are not reversible by static-site rollback.
- **OWASP / security:** the biggest observed security boundary is local secret handling. The code does attempt network binding to Monad Testnet, but wallet compliance and user-consent behavior were not observed. No claim should be made that a public reveal is private, encrypted, or recoverable.
- **UI / UX / accessibility:** sampled strings already hint at the real boundary — `"keep this phone"` after commit and `"no local secret — commit on this device"` before reveal ([`web/index.html:222-244`](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/web/index.html#L222-L244)). Those warnings should be surfaced earlier in the flow and independently exercised for wrong-network, rejected-wallet, and cleared-storage cases.

## 5. Production blockers and owner questions

Blockers before any stronger release claim:

1. Owner must approve the exact privacy statement: salted local commit before reveal, public on-chain reveal after reveal, no implied secrecy after reveal, and no invented backup/recovery guarantee.
2. Owner must define the canonical contract address and candidate-promotion process for Monad Testnet.
3. Release owners must decide who can use `GH_DEPLOY_PK`, what approval gate protects it, and whether deploy/seed jobs may run before required tests.
4. Independent reviewer must confirm candidate behavior from a real browser/wallet run before any broader readiness claim.

## 6. Evidence inventory and limitations

Inspected ranges in this pass:

- `README.md:1-50`
- `audit/package.json:1-17`
- `.github/workflows/deploy-pages.yml:1-33`
- `.github/workflows/deploy-testnet.yml:1-22`
- `.github/workflows/seed-pairs.yml:1-23`
- `contracts/GhostHandshake.sol:4-9,68-100`
- `web/index.html:108-160,222-244`
- `audit/e2e.mjs:1-5,107-116,159-188`

Uninspected or unverified boundaries: deployment script bodies, seed script bodies, `test/Hash.t.sol`, accessibility behavior, wallet-specific prompt behavior, deployed bytecode equivalence, live contract state, and any localStorage behavior in a real browser. No runtime checks were executed. Prior publication state was not treated as peer review or release approval.
