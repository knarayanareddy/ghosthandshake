# Ghost Handshake remediation plan

Proposed only; see [review](REVIEW.md). Dependencies: `GH-T1 → GH-T2 → GH-T3 → GH-T4`.

### GH-T1 — Establish contract and privacy model (GH-1, GH-3)
Prerequisite: owner approves testnet-only isolated analysis. Observed paths: `contracts/GhostHandshake.sol`, `test/Hash.t.sol`, `audit/e2e.mjs`, `web/`.
1. Trace commitment construction, salt generation, client storage, reveal, matching and cancellation.
2. Specify adversaries, public-chain disclosure, allowable word entropy and network/contract binding.
3. Independently compare actual deployed bytecode and compiler settings with the reviewed source when authorized.
Deliverable: bounded privacy and lifecycle contract. Verification: reviewer reconstructs a synthetic commitment and identifies what an observer can learn.
- [ ] Privacy guarantees and reveal visibility are explicit.
- [ ] Deployed/source correspondence is verified or marked unknown.

### GH-T2 — Secure lifecycle and signer paths (GH-1, GH-3)
Prerequisite: GH-T1 and owner-approved design. Observed paths: `contracts/GhostHandshake.sol`, `web/index.html`, `web/words.js`.
1. Correct any verified weak commitment, replay, authorization or timing behavior; domain-separate commitments as required by the approved model.
2. Bind wallet requests to the intended network, contract and transaction and make public reveal explicit to users.
3. Add independent adversarial cases for low-entropy guessing assumptions, wrong signer, duplicate reveal, cancellation and front-running scenarios.
Deliverable: reviewed contract/client corrections and tests. Verification: mutate a commitment or authorization check and observe a corresponding negative test fail.
- [ ] Independent contract reviewer accepts stated invariants.
- [ ] Users are warned before publicly revealing information.

### GH-T3 — Reproducible automation and deployment (GH-2)
Prerequisite: GH-T2. Observed paths: `audit/package-lock.json`, `.github/workflows/deploy-testnet.yml`, `.github/workflows/seed-pairs.yml`, `foundry.toml`.
1. Use locked dependency installation and review dependency and action provenance before secrets are exposed.
2. Run existing Foundry and local harness checks in isolation, adding required CI gates and explicit test discovery.
3. Restrict signing credentials and require owner approval for deployments and seeding; record artifact and chain identity.
Deliverable: candidate-specific checks and controlled deployment workflow. Verification: break a lifecycle assertion and confirm CI fails; inspect the deployed artifact identity separately.
- [ ] Dependencies and signing authority are reviewed.
- [ ] Broken contract behavior is rejected by a required gate.

### GH-T4 — UX, recovery and independent acceptance (preventive)
Prerequisite: GH-T3; owner chooses release and network policy. Observed paths: `web/index.html`, `web/canvas.html`, `web/how-to.html`.
1. Test keyboard navigation, wallet prompts, wrong-network and rejected-transaction states.
2. Stage the static client and independently exercise a full synthetic commit/reveal/cancel journey.
3. Demonstrate rollback to a verified client artifact and document that deployed contract transactions may be irreversible.
Deliverable: acceptance and release record. Verification: observe the served revision, synthetic lifecycle and client rollback.
- [ ] Accessible error and consent flows are observed.
- [ ] Owner accepts residual privacy and irreversible-chain risks.

## Gate and approvals

Owner must approve privacy language, network, signing custody and release authority. No real-value promotion without independent contract review and candidate-specific negative tests. Roll back the client to a verified artifact; do not promise rollback of already confirmed chain actions.
