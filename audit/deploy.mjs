// Self-contained Monad Testnet deployer for GhostHandshake.
//
// Usage — on ANY machine with internet access to the Monad RPC
// (this sandbox is firewalled from it, so run it locally or via CI):
//
//   cd audit && npm install
//   PK=0x<64-hex-private-key> node deploy.mjs
//
// Optional: RPC_URL=https://rpc.ankr.com/monad_testnet   (official alternative)
//
// Prints the deployer address, balance, tx hash, and the deployed contract
// address. The key is read from the environment only — never written anywhere.

import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const solc = require("solc");
import { ethers } from "ethers";

const RPC = (process.env.RPC_URL && process.env.RPC_URL.trim() !== "")
  ? process.env.RPC_URL.trim()
  : "https://testnet-rpc.monad.xyz";
const pk = process.env.PK;
if (!pk || !/^0x[0-9a-fA-F]{64}$/i.test(pk)) {
  console.error("ERROR: GH_DEPLOY_PK is missing or invalid!");
  console.error("Must be a 0x-prefixed 64-character HEX PRIVATE KEY (not a public address).");
  console.error("Example format: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
  process.exit(1);
}

// compile the real contract, same settings as the repo (solc 0.8.24, optimizer off)
const source = readFileSync(new URL("../contracts/GhostHandshake.sol", import.meta.url), "utf8");
const out = JSON.parse(
  solc.compile(
    JSON.stringify({
      language: "Solidity",
      sources: { "GhostHandshake.sol": { content: source } },
      settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } },
    })
  )
);
for (const e of out.errors ?? []) if (e.severity === "error") { console.error(e.formattedMessage); process.exit(1); }
const art = out.contracts["GhostHandshake.sol"]["GhostHandshake"];

const provider = new ethers.JsonRpcProvider(RPC);
const w = new ethers.Wallet(pk, provider);
// Safety: only deploy from the wallet that actually holds the MON.
// (Public address, not a secret — override with EXPECT_ADDRESS=0x… if you
//  deploy from a different funded wallet.)
const expect = process.env.EXPECT_ADDRESS || "0x94CAC88F29d1370757B052a410B785cfE10F7bB1";
const bal = await provider.getBalance(w.address);
console.log("rpc      :", RPC);
console.log("deployer :", w.address);
console.log("balance  :", ethers.formatEther(bal), "MON");
if (w.address.toLowerCase() !== expect.toLowerCase()) {
  console.error("");
  console.error("STOP — derived address does not match the funded wallet.");
  console.error(`  key      -> ${w.address}`);
  console.error(`  expected -> ${expect}`);
  console.error("Nothing was sent. Set EXPECT_ADDRESS=0x… if this key is intentional.");
  process.exit(1);
}
if (bal === 0n) {
  console.error("No MON for this wallet. Claim first: https://faucet.monad.xyz (and/or Devnads claim).");
  process.exit(1);
}

const fee = await provider.getFeeData();
const factory = new ethers.ContractFactory(art.abi, "0x" + art.evm.bytecode.object, w);
// Monad bills gas_limit * price — keep the limit tight with a small buffer.
const est = await factory.estimateGas.deploy();
console.log("gas est  :", est, "(limit", (est * 12n) / 10n + ")");
const tx = await factory.deploy({
  gasLimit: (est * 12n) / 10n,
  maxFeePerGas: fee.maxFeePerGas,
  maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
});
console.log("tx       :", tx.hash);
const rc = await tx.wait();
if (rc.status !== 1) { console.error("deploy REVERTED — nothing was deployed."); process.exit(1); }
console.log("");
console.log("CONTRACT :", rc.contractAddress);
console.log("");
console.log("Now open (paste the address):");
console.log("  local : http://127.0.0.1:8765/?c=" + rc.contractAddress);
console.log("  page  : <your-hosted-url>/?c=" + rc.contractAddress);
console.log("  wall  : <your-hosted-url>/canvas.html?c=" + rc.contractAddress);
