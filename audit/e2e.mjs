// End-to-end audit of GhostHandshake.sol — compiles the real repo file with
// solc 0.8.24 (optimizer OFF, matching foundry.toml defaults) and drives the
// full commit/reveal/match/cancel lifecycle on a local EVM (ganache).
// Revert expectations are checked via eth_call (staticCall) so custom error
// names are visible; happy paths use real transactions.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require("fs");
const solc = require("solc");
import { ethers, solidityPackedKeccak256, keccak256, toUtf8Bytes, hexlify, randomBytes } from "ethers";

const CONTRACT = new URL("../contracts/GhostHandshake.sol", import.meta.url).pathname;

// ---------- 1. compile ----------
const input = {
  language: "Solidity",
  sources: { "GhostHandshake.sol": { content: fs.readFileSync(CONTRACT, "utf8") } },
  settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
};
const out = JSON.parse(solc.compile(JSON.stringify(input)));
for (const e of out.errors ?? []) if (e.severity === "error") { console.error("COMPILE ERROR:", e.formattedMessage); process.exit(1); }
const art = out.contracts["GhostHandshake.sol"]["GhostHandshake"];
console.log("compiled OK, bytecode bytes:", art.evm.bytecode.object.length / 2);

// ---------- 2. EVM (hardhat node on :8556) ----------
const RPC_URL = "http://127.0.0.1:8556";
const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, { staticNetwork: true });
provider.pollingInterval = 50;
const keys = {
  alice: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  bob:   "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  carol: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  dave:  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
};
const alice = new ethers.Wallet(keys.alice, provider), bob = new ethers.Wallet(keys.bob, provider);
const carol = new ethers.Wallet(keys.carol, provider), dave = new ethers.Wallet(keys.dave, provider);
const A = await alice.getAddress(), B = await bob.getAddress(), C = await carol.getAddress(), D = await dave.getAddress();

const gh = await new ethers.ContractFactory(art.abi, "0x" + art.evm.bytecode.object, alice).deploy();
await gh.waitForDeployment();
const ghRead = gh.connect(provider); // eth_call binding for revert detection
console.log("deployed at", await gh.getAddress());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const blockNumber = async () => (await provider.getBlock("latest")).number;
const mine = async (n) => { const before = await blockNumber(); const t0 = Date.now(); for (let i = 0; i < n; i++) await provider.send("evm_mine", []); const after = await blockNumber(); if (after - before !== BigInt(n)) console.log(`WARN  mined ${after - before}, expected ${n}`); else console.log(`INFO  +${n} blocks in ${Date.now() - t0}ms`); };
const wordHash = (w) => keccak256(toUtf8Bytes(w));
const packHash = (w, s) => solidityPackedKeccak256(["string", "bytes32"], [w, s]); // exact web/index.html path
const ZERO32 = "0x" + "00".repeat(32);

// ganache (in-process) can lag state visibility on eth_call right after mining;
// poll a getter until two consecutive reads agree.
const norm = (x) => (x === undefined ? null : JSON.parse(JSON.stringify(x, (_, v) => (typeof v === "bigint" ? v.toString() + "n" : v))));
const readStable = async (fn, rounds = 20, ms = 40) => {
  let prev = undefined, last = undefined;
  for (let i = 0; i < rounds; i++) {
    last = await fn();
    if (last !== undefined && JSON.stringify(norm(last)) === JSON.stringify(norm(prev))) return last;
    prev = last;
    await sleep(ms);
  }
  console.log(`WARN  read did not converge: ${JSON.stringify(norm(last))}`);
  return last;
};

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`PASS  ${name} ${extra}`); }
  else { fail++; console.log(`FAIL  ${name} ${extra}`); }
};
const revertsTo = async (name, fn, errName) => {
  try { await fn(); ok(name, false, "(did not revert)"); }
  catch (e) {
    const got = e.revert?.name ?? (String(e.message).match(/reverted:? ?(\w+)/)?.[1]);
    ok(name, got === errName, `-> expected ${errName}, got ${got ?? e.shortMessage}`);
  }
};
const tx = async (w, f, tries = 12) => { // real tx from wallet w (hardhat auto-mines); retry stale-nonce races
  for (let i = 0; i < tries; i++) {
    try {
      const t = await f();
      return await t.wait();
    } catch (e) {
      if ((e.code === "NONCE_EXPIRED" || e.code === "NONCE_TOO_LOW" || /nonce/i.test(String(e.message))) && i < tries - 1) {
        await sleep(100);
        continue;
      }
      throw e;
    }
  }
  throw new Error("tx retries exhausted");
};
const commitOf = (w) => { const s = hexlify(randomBytes(32)); return { s, h: packHash(w, s) }; };

// ---------- T1: reveal without commit ----------
await revertsTo("T1 reveal-before-commit", () => ghRead.reveal.staticCall("canal", ZERO32, { from: B }), "NoCommit");

// ---------- T2: double commit ----------
{
  const { h } = commitOf("canal");
  await tx(alice, () => gh.connect(alice).commit(h));
  await revertsTo("T2 double-commit", () => ghRead.commit.staticCall(h, { from: A }), "AlreadyCommitted");
  await mine(2001);
  await tx(bob, () => gh.connect(bob).cancel(A)); // cleanup so T3/T4 start fresh
}

// ---------- T3: JS hash accepted by Solidity (exact frontend path) ----------
{
  const word = "canal";
  const salt = hexlify(randomBytes(32));
  const h = packHash(word, salt); // exactly web/index.html hashCommit()
  await tx(alice, () => gh.connect(alice).commit(h));
  const rc3 = await tx(alice, () => gh.connect(alice).reveal(word, salt)); // same device: must succeed
  const pend3 = await readStable(() => gh.pendingRevealer(wordHash("canal")));
  ok("T3a frontend hash accepted by contract", rc3.status === 1 && pend3 === A, `(status=${rc3.status}, pending=${pend3})`);
  await revertsTo("T3b other device -> NoCommit (by design)", () => ghRead.reveal.staticCall(word, salt, { from: B }), "NoCommit");
  await mine(2001);
  await tx(bob, () => gh.connect(bob).cancel(A)); // cleanup
}

// ---------- T4: happy path two players ----------
let pairA, pairB;
{
  const a = commitOf("tulip"), b = commitOf("tulip");
  await tx(alice, () => gh.connect(alice).commit(a.h));
  await tx(bob, () => gh.connect(bob).commit(b.h));
  await tx(alice, () => gh.connect(alice).reveal("tulip", a.s));
  const rc = await tx(bob, () => gh.connect(bob).reveal("tulip", b.s));
  const evs = rc.logs.map((l) => { try { return gh.interface.parseLog(l); } catch { return null; } }).filter(Boolean);
  const m = evs.find((e) => e.name === "Matched");
  pairA = m?.args.a; pairB = m?.args.b;
  ok("T4 Matched event", !!m, `a=${pairA} b=${pairB} pairIndex=${m?.args.pairIndex}`);
  const p = await gh.getPair(0);
  ok("T4 pair data", p.wordHash === wordHash("tulip") && p.matchedAtBlock > 0n && (await gh.totalPairs()) === 1n);
  ok("T4 handshake counts", (await readStable(() => gh.handshakeCount(A))) === 1n && (await readStable(() => gh.handshakeCount(B))) === 1n);
  const all = await gh.getAllPairs();
  ok("T4 getAllPairs == getPair", all.length === 1 && all[0].a === pairA && all[0].b === pairB);
  ok("T4 commitments cleared after match", (await readStable(() => gh.commitments(A)))[0] === ZERO32 && (await readStable(() => gh.commitments(B)))[0] === ZERO32);
}

// ---------- T5: wrong word ----------
{
  const { h, s } = commitOf("fog");
  await tx(carol, () => gh.connect(carol).commit(h));
  await revertsTo("T5 wrong-word reveal", () => ghRead.reveal.staticCall("ghost", s, { from: C }), "BadReveal");
  await mine(2001);
  await tx(bob, () => gh.connect(bob).cancel(C)); // carol's "fog" commit lingers until cancelled — needed before she can play again
}

// ---------- T6: self window expiry ----------
{
  const { h, s } = commitOf("amstel");
  await tx(dave, () => gh.connect(dave).commit(h));
  await mine(2001); // > REVEAL_WINDOW
  await revertsTo("T6 reveal after 2001 blocks", () => ghRead.reveal.staticCall("amstel", s, { from: D }), "WindowExpired");
  await tx(alice, () => gh.connect(alice).cancel(D)); // clean dave (his window is over)
}

// ---------- T7: partner window expiry + permissionless unstick ----------
{
  const a = commitOf("blitz");
  await tx(alice, () => gh.connect(alice).commit(a.h));                 // alice commits at X
  await tx(alice, () => gh.connect(alice).reveal("blitz", a.s));        // alice now pendingRevealer
  await mine(2001); // alice's window (X+2000) now in the past
  const b = commitOf("blitz");
  await tx(bob, () => gh.connect(bob).commit(b.h));                     // bob commits fresh, inside his own window
  await revertsTo("T7 fresh commit vs expired pending partner", () => ghRead.reveal.staticCall("blitz", b.s, { from: B }), "WindowExpired");
  // permissionless unstick: bob cancels lonely alice
  await tx(bob, () => gh.connect(bob).cancel(A));
  ok("T7 pendingRevealer cleared by cancel", await readStable(() => gh.pendingRevealer(wordHash("blitz"))) === "0x0000000000000000000000000000000000000000");
  ok("T7 alice commitment cleared", (await readStable(() => gh.commitments(A)))[0] === ZERO32);
  // bob re-reveals: becomes the new pending revealer
  await tx(bob, () => gh.connect(bob).reveal("blitz", b.s));
  const c2 = commitOf("blitz");
  await tx(carol, () => gh.connect(carol).commit(c2.h));
  const rc2 = await tx(carol, () => gh.connect(carol).reveal("blitz", c2.s));
  const evs2 = rc2.logs.map((l) => { try { return gh.interface.parseLog(l); } catch { return null; } }).filter(Boolean);
  ok("T7 match after unstick (bob,carol)", evs2.some((e) => e.name === "Matched" && e.args.a === B && e.args.b === C));
}

// ---------- T8: cancel semantics ----------
{
  const { h } = commitOf("parallel");
  await tx(alice, () => gh.connect(alice).commit(h));
  await revertsTo("T8 cancel within window", () => ghRead.cancel.staticCall(A, { from: A }), "WindowOpen");
  await mine(2001);
  await tx(bob, () => gh.connect(bob).cancel(A)); // permissionless, by a stranger
  await revertsTo("T8 cancel with no commit", () => ghRead.cancel.staticCall(A, { from: B }), "NoCommit");
}

// ---------- T9: re-commit after match ----------
{
  const { h } = commitOf("monad");
  await tx(alice, () => gh.connect(alice).commit(h)); // T4 matched, commitment was deleted
  ok("T9 re-commit after match", (await readStable(() => gh.commitments(A)))[0] !== ZERO32);
  await mine(2001);
  await tx(bob, () => gh.connect(bob).cancel(A)); // clean up
}

// ---------- T10: retirement ----------
{
  await revertsTo("T10 setRetireWords not owner", () => ghRead.setRetireWords.staticCall(true, { from: B }), "NotOwner");
  await tx(alice, () => gh.connect(alice).setRetireWords(true));
  ok("T10 retireWords on", (await readStable(() => gh.retireWords())) === true);
  const a1 = commitOf("ghost"), b1 = commitOf("ghost");
  await tx(alice, () => gh.connect(alice).commit(a1.h));
  await tx(bob, () => gh.connect(bob).commit(b1.h));
  await tx(alice, () => gh.connect(alice).reveal("ghost", a1.s));
  await tx(bob, () => gh.connect(bob).reveal("ghost", b1.s));
  ok("T10 wordClaimed set after match", (await readStable(() => gh.wordClaimed(wordHash("ghost")))) === true);
  const c1 = commitOf("ghost");
  await tx(carol, () => gh.connect(carol).commit(c1.h));
  await revertsTo("T10 retired word rejected", () => ghRead.reveal.staticCall("ghost", c1.s, { from: C }), "WordRetired");
  await mine(2001);
  await tx(bob, () => gh.connect(bob).cancel(C)); // carol's un-revealed "ghost" commit lingers until cancelled
  await tx(alice, () => gh.connect(alice).setRetireWords(false));
  const d1 = commitOf("ghost");
  await tx(dave, () => gh.connect(dave).commit(d1.h));
  await tx(dave, () => gh.connect(dave).reveal("ghost", d1.s)); // allowed again after toggle off
  ok("T10 toggle off re-opens word", (await readStable(() => gh.pendingRevealer(wordHash("ghost")))) === D);
  await mine(2001);
  await tx(bob, () => gh.connect(bob).cancel(D));
}

// ---------- T11: window boundary (strict >) ----------
{
  const { h, s } = commitOf("fog");
  await tx(carol, () => gh.connect(carol).commit(h));   // carol's commit executes in block N
  const start = await blockNumber();                    // N
  await mine(1999);                                     // latest = N+1999
  // the reveal tx itself will be mined as block N+2000 => executes exactly at committedAtBlock + REVEAL_WINDOW
  const revealResp = await gh.connect(carol).reveal("fog", s);
  const rcB = await revealResp.wait();
  ok("T11 reveal executed at exactly +2000", rcB.blockNumber === start + 2000, `(executed in ${rcB.blockNumber}, commit ${start})`);
  ok("T11 boundary reveal accepted (strict >)", rcB.status === 1 && (await readStable(() => gh.pendingRevealer(wordHash("fog")))) === C);
  const d = commitOf("fog");
  await tx(dave, () => gh.connect(dave).commit(d.h));   // N+2001
  await revertsTo("T11 +1 block later: partner expired", () => ghRead.reveal.staticCall("fog", d.s, { from: D }), "WindowExpired");
  await mine(2001); // push both windows fully past, then clean
  await tx(alice, () => gh.connect(alice).cancel(C));
  await tx(alice, () => gh.connect(alice).cancel(D));
}

// ---------- T12: gas snapshot (repo deploys optimizer OFF, foundry default) ----------
{
  const all = await gh.getAllPairs();
  const last = all[all.length - 1];
  const gCommit = await gh.connect(alice).commit.estimateGas(packHash("canal", hexlify(randomBytes(32)))).catch(() => null);
  const gReveal = await gh.connect(carol).reveal.estimateGas("fog", hexlify(randomBytes(32))).catch(() => null);
  ok("T12 gas estimates available", gCommit !== null, gCommit ? `(commit est. ${gCommit}, reveal est. ${gReveal})` : "");
  console.log(`INFO  total pairs now: ${all.length}; last: a=${last.a.slice(0, 8)}… b=${last.b.slice(0, 8)}… block=${last.matchedAtBlock}`);
}

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
