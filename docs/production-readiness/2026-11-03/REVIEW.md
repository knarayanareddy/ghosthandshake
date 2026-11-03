# Ghost Handshake review

## Scope and verdict

Testnet contract and web prototype at `665f57471e2cfc765cd212b158e39b607872ab7e`. Snapshot evidence includes `README.md:1-50`, `audit/package.json:1-17` and three workflows. Contract, web client, deployment scripts and test bodies were not sampled. No chain, wallet, browser, tests or deployment were run. This is not a smart-contract audit. [Plan](REMEDIATION_PLAN.md).

## Architecture

README identifies separate play and wall pages and `contracts/GhostHandshake.sol`, using Monad Testnet ([README.md:3-9](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/README.md#L3-L9)). The audit manifest describes a local commit/reveal/match/cancel harness ([audit/package.json:5-10](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/audit/package.json#L5-L10)); actual contract invariants and test assertions were not inspected. Pages is a static client, separate from on-chain deployment.

## Findings

- **GH-1 — High, unverified risk:** README says participants pick a `secret word` and reveal on-chain, and lists a small set of example words ([README.md:3,11](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/README.md#L3-L11)). A low-entropy secret can be guessed if commitments lack an adequate hidden random salt; the actual commitment scheme was not inspected. Verify the encoding, entropy and privacy guarantees and avoid claiming secrecy beyond the threat model.
- **GH-2 — Medium, confirmed static:** testnet deploy and seeding workflows use `npm ... install --no-audit` immediately before executing scripts with a deployment key available ([deploy-testnet.yml:13-22](https://github.com/knarayanareddy/ghosthandshake/blob/665f57471e2cfc765cd212b158e39b607872ab7e/.github/workflows/deploy-testnet.yml#L13-L22)). A lockfile is listed but deterministic installation and independent dependency review are not established. Use locked installs, reviewed dependencies and restricted deployment approvals.
- **GH-3 — High, unverified risk:** contract authorization, commitment binding, replay, front-running, timing, cancellation and wallet-network checks were not examined. Restrict use to testnet until independent contract and client review.
- **GH-4 — Informational, historical CI:** [Pages deployment](https://github.com/knarayanareddy/ghosthandshake/actions/runs/33260379428) succeeded on this SHA. A [seed run](https://github.com/knarayanareddy/ghosthandshake/actions/runs/33257206945) succeeded on a different SHA (`bdf7d4732d03f5d77bfd8aed9d8a42626fa548d9`); neither proves current contract correctness.

## Five disciplines

- **Correctness:** local harness claims a lifecycle test, but its source and real deployed bytecode were not examined. Verify commit/reveal state transitions and client-to-contract identity.
- **Automation:** README lists `forge test`; audit manifest lists a local harness. Neither was run and the snapshot has no evidence of required automated contract tests.
- **DevOps:** Pages and manually dispatched testnet workflows exist; key custody, deployment approvals, artifact provenance and rollback are unverified. On-chain actions cannot be presumed reversible.
- **OWASP:** wallet authentication, chain binding, replay, injection through client content, secret exposure and dependency integrity are unverified. The word itself may be sensitive; do not expose it in logs or describe a public reveal as private.
- **UI/UX:** play, wall and how-to pages exist; wallet consent, network mismatch, transaction failures, keyboard use and accessibility were not tested.

## Owner decisions and limitations

Owner must approve supported network, privacy promises, deployment authority, key custody, threat model and any real-value use. Snapshot inspection is restricted to README, audit manifest and workflows; contract/test/client code and actual deployment state remain unread. No chain interaction, external account access, security test, accessibility check or rollback was performed.
