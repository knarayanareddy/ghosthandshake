# Ghost Handshake remediation plan

Linked review: [REVIEW.md](REVIEW.md). This plan is source-bounded to SHA `665f57471e2cfc765cd212b158e39b607872ab7e` and was not executed. Roles used below: **product/privacy owner**, **contract maintainer**, **frontend maintainer**, **DevOps/release owner**, and **independent reviewer**.

## 1. Phased roadmap with entry/exit criteria

- **Phase 1 — Privacy boundary and product language.** Entry: current prototype docs and client strings. Exit: all user-facing copy states the real local-storage and on-chain reveal model without privacy overclaim.
- **Phase 2 — Candidate behavior and test gates.** Entry: current contract/client/harness sources. Exit: candidate builds must prove hash compatibility, expiry, cancel, and reveal-path behavior through required automated checks.
- **Phase 3 — Deployment and recovery controls.** Entry: current manual testnet workflows. Exit: deterministic dependency install, signer approval policy, and rollback/recovery notes are documented and enforced for release candidates.
- **Phase 4 — Independent acceptance.** Entry: a candidate artifact that passed Phase 2-3 gates. Exit: an independent reviewer observes the release candidate behavior and records residual risks without rewording them into guarantees.

## 2. Tasks

### GH-T1 — Bound secrecy, storage, and recovery claims (links: GH-1)
**Owner:** product/privacy owner  
**Prerequisites:** none  
**Observed paths:** `contracts/GhostHandshake.sol`, `web/index.html`, `README.md`, `web/how-to.html`  
**Recovery relevance:** prevents users from losing reveal capability or relying on nonexistent privacy properties.

1. Write the exact source-established model into product copy: the commit is salted, the secret is stored in browser-local `gh_secret` until reveal, and reveal becomes public on chain.
2. Decide whether the product will support any intentional secret backup/export flow. If yes, define a **proposed path** and threat model before implementation. If no, state plainly that clearing storage or switching devices can strand a commit.
3. Update README and in-app instructions so the warning appears before commit, not only afterward in the log text.

**Expected output:** approved privacy/storage wording pack for README and client UI.  
**Verification:** independent reviewer reads the candidate copy and confirms it never says or implies encrypted-at-rest, multi-device recovery, or private on-chain reveal.  
**Definition of done:**
- [ ] Salted commit wording matches the inspected source model.
- [ ] Local `gh_secret` storage boundary is explicit.
- [ ] Public on-chain reveal is explicit.
- [ ] Device-loss/recovery behavior is explicit.

### GH-T2 — Make lifecycle verification a required candidate gate (links: GH-1, GH-3)
**Owner:** contract maintainer  
**Prerequisites:** GH-T1 privacy wording approved  
**Observed paths:** `audit/e2e.mjs`, `audit/package.json`, `test/Hash.t.sol`, `foundry.toml`  
**Recovery relevance:** catches regressions that could strand commitments or break commit/reveal compatibility before release.

1. Keep the existing local lifecycle cases as first-class candidate checks: JS/Solidity hash compatibility, expiry boundaries, permissionless cancel, and successful match behavior.
2. Add a required CI path that runs the existing harness and the repo’s Foundry tests for candidate promotion, instead of leaving them as optional/manual knowledge.
3. Add at least one deliberate-break verification case to the release process, such as mutating hash packing or the reveal-window boundary and proving the negative test fails.

**Expected output:** required automation definition for release candidates, plus updated CI/workflow config.  
**Verification:** break one compatibility or window invariant in a controlled branch/candidate and confirm required automation fails before release approval.  
**Definition of done:**
- [ ] `audit/e2e.mjs` is part of a required gate.
- [ ] Foundry tests are part of a required gate or explicitly replaced by an approved equivalent.
- [ ] A deliberate-break check demonstrates the gate can fail for the right reason.

### GH-T3 — Harden dependency and signer handling for manual testnet operations (links: GH-2)
**Owner:** DevOps/release owner  
**Prerequisites:** GH-T2 gate design accepted  
**Observed paths:** `.github/workflows/deploy-testnet.yml`, `.github/workflows/seed-pairs.yml`, `audit/package-lock.json`  
**Recovery relevance:** limits key exposure and makes rollback analysis possible when a bad deployment or seed operation occurs.

1. Replace mutable install behavior with a deterministic install policy tied to the reviewed lockfile for deploy/seed jobs.
2. Add explicit approval and environment ownership rules for any workflow that exposes `GH_DEPLOY_PK`, including who can trigger it and when candidate gates must already be green.
3. Record release metadata per deployment: reviewed SHA, contract address, network, and operator approval record.

**Expected output:** hardened testnet deploy/seed workflow policy and updated workflow files.  
**Verification:** reviewer inspects workflow diffs and confirms deploy/seed cannot run with freshly resolved dependencies or without the defined approval path.  
**Definition of done:**
- [ ] Deterministic dependency installation is enforced.
- [ ] Signer exposure is approval-gated.
- [ ] Deployment metadata binds release action to reviewed SHA and network.

### GH-T4 — Exercise real user/runtime failure paths before wider release (preventive requirement)
**Owner:** frontend maintainer  
**Prerequisites:** GH-T1 through GH-T3 complete on a candidate artifact  
**Observed paths:** `web/index.html`, `web/canvas.html`, `web/how-to.html`  
**Recovery relevance:** verifies what users see when storage is missing, chain binding fails, or transactions are rejected.

1. Run candidate checks for wallet-switch rejection, missing `gh_secret`, expired window, and cancel-within-window states from a real browser/wallet environment.
2. Confirm the UI always names the active network and warns users before they reveal publicly or rely on a different device.
3. Record static-site rollback steps for the web artifact and distinguish them from non-reversible on-chain actions.

**Expected output:** candidate UX acceptance record and rollback note.  
**Verification:** independent reviewer observes the candidate revision, reproduces the named failure states, and confirms the displayed guidance matches the approved wording.  
**Definition of done:**
- [ ] Wrong-network and wallet rejection behavior is observed.
- [ ] Missing-local-secret behavior is observed.
- [ ] Static rollback steps are documented separately from chain irreversibility.

### GH-T5 — Independent release acceptance (preventive requirement)
**Owner:** independent reviewer  
**Prerequisites:** GH-T1 through GH-T4 complete  
**Observed paths:** candidate outputs from prior tasks; proposed release notes/runbooks  
**Recovery relevance:** final check before anyone interprets the prototype as a trustworthy release.

1. Re-read the candidate docs, client warnings, workflow policy, and test evidence against the reviewed findings.
2. Verify that source-established controls are described as controls, and runtime-untested areas remain labeled as unknown until observed.
3. Record residual risks, owner-approved tradeoffs, and any reason to keep the project testnet-only.

**Expected output:** independent acceptance memo with explicit residual-risk list.  
**Verification:** acceptance is withheld if any candidate artifact still claims privacy, recovery, or release assurance beyond inspected evidence.  
**Definition of done:**
- [ ] No privacy/cryptographic guarantee exceeds the inspected evidence.
- [ ] Runtime-observed behavior is separated from source-only evidence.
- [ ] Residual risks and owner decisions are explicitly recorded.

## 3. Dependency map

| Task | Depends on | Primary owner | Output |
| --- | --- | --- | --- |
| GH-T1 | none | product/privacy owner | approved privacy/storage wording |
| GH-T2 | GH-T1 | contract maintainer | required lifecycle test gate |
| GH-T3 | GH-T2 | DevOps/release owner | hardened deploy/seed workflow policy |
| GH-T4 | GH-T1, GH-T2, GH-T3 | frontend maintainer | runtime UX acceptance + rollback note |
| GH-T5 | GH-T1, GH-T2, GH-T3, GH-T4 | independent reviewer | release acceptance memo |

## 4. Production acceptance checklist

- [ ] Candidate wording says the secret is salted and browser-local until reveal.
- [ ] Candidate wording says reveal is public on chain.
- [ ] Required automation proves JS/Solidity hash compatibility and expiry/cancel behavior.
- [ ] Deploy/seed workflows use deterministic dependency installation.
- [ ] Signer use is approval-gated and tied to a reviewed SHA.
- [ ] Real browser/wallet checks observed wrong-network, missing-secret, and reveal/cancel messaging.
- [ ] Release notes distinguish static rollback from irreversible chain actions.
- [ ] Independent reviewer signs off on residual risks without calling the system certified or production-safe.

## 5. Changes requiring owner approval

1. Any user-facing privacy promise.
2. Any secret backup/export/recovery mechanism.
3. Any move beyond testnet-only positioning.
4. Any workflow granting access to `GH_DEPLOY_PK`.
5. Any release statement implying smart-contract audit, privacy certification, or operational recovery beyond static asset rollback.

## 6. Rollback and recovery policy

- **Static client rollback:** revert the served `web/` artifact to a previously reviewed revision and verify the served SHA/address pair.
- **On-chain recovery:** do not promise rollback of already mined commits, reveals, matches, or cancellations. Recovery can only mean documenting user impact, publishing corrected client guidance, and deploying a reviewed replacement contract/address if the owner authorizes that path.
- **Secret-loss recovery:** unless a separately reviewed export/backup design exists, treat cleared local storage or device change as unrecoverable for the pending reveal path.

## 7. Release posture

Remain testnet-only until GH-T5 is complete. Future command examples, workflow edits, or deployment steps are planned work only; none were executed in this documentation pass.
