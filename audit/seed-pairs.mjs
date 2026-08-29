import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const solc = require("solc");
import { ethers, solidityPackedKeccak256, randomBytes, hexlify } from "ethers";

const candidateRPCs = (process.env.RPC_URL && process.env.RPC_URL.trim() !== "")
  ? [process.env.RPC_URL.trim(), "https://testnet-rpc.monad.xyz", "https://rpc.ankr.com/monad_testnet"]
  : ["https://testnet-rpc.monad.xyz", "https://rpc.ankr.com/monad_testnet"];

let provider;
let RPC;
for (const rpcUrl of candidateRPCs) {
  try {
    const testProvider = new ethers.JsonRpcProvider(rpcUrl);
    await testProvider.getBlockNumber();
    provider = testProvider;
    RPC = rpcUrl;
    break;
  } catch (e) {
    console.warn(`RPC warning (${rpcUrl}): ${e.message}`);
  }
}

if (!provider) {
  console.error("ERROR: Unable to connect to Monad Testnet RPC.");
  process.exit(1);
}

let rawPk = (process.env.PK || "").trim().replace(/^['"]|['"]$/g, "");
if (rawPk && !rawPk.startsWith("0x") && /^[0-9a-fA-F]{64}$/i.test(rawPk)) {
  rawPk = "0x" + rawPk;
}
if (!rawPk || !/^0x[0-9a-fA-F]{64}$/i.test(rawPk)) {
  console.error("ERROR: GH_DEPLOY_PK is missing or invalid.");
  process.exit(1);
}

const mainWallet = new ethers.Wallet(rawPk, provider);
const contractAddress = process.env.CONTRACT_ADDRESS || "0xBd051598e1beC7f450bbe26e8b98A680Adde0d4b";

console.log("Seeding pairs on contract:", contractAddress);
console.log("Main funder wallet       :", mainWallet.address);

// ABI for GhostHandshake
const abi = [
  "function commit(bytes32 commitHash) external",
  "function reveal(string calldata word, bytes32 salt) external",
  "function totalPairs() external view returns (uint256)",
  "function getAllPairs() external view returns (tuple(address a, address b, bytes32 wordHash, uint64 matchedAtBlock)[])"
];

const contract = new ethers.Contract(contractAddress, abi, mainWallet);

const seedWords = ["canal", "blitz", "fog"];

for (const word of seedWords) {
  console.log(`\n--- Seeding pair for word "${word}" ---`);

  // Create two ephemeral wallets for this pair
  const w1 = ethers.Wallet.createRandom().connect(provider);
  const w2 = ethers.Wallet.createRandom().connect(provider);

  // Fund w1 and w2 with 0.05 MON each from mainWallet
  console.log(`Funding ${w1.address} and ${w2.address}...`);
  const fee = await provider.getFeeData();
  
  const tx1 = await mainWallet.sendTransaction({
    to: w1.address,
    value: ethers.parseEther("0.05"),
    maxFeePerGas: fee.maxFeePerGas,
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas
  });
  await tx1.wait();

  const tx2 = await mainWallet.sendTransaction({
    to: w2.address,
    value: ethers.parseEther("0.05"),
    maxFeePerGas: fee.maxFeePerGas,
    maxPriorityFeePerGas: fee.maxPriorityFeePerGas
  });
  await tx2.wait();

  // Commit on w1
  const salt1 = hexlify(randomBytes(32));
  const hash1 = solidityPackedKeccak256(["string", "bytes32"], [word, salt1]);
  console.log(`Wallet 1 committing...`);
  const c1 = await contract.connect(w1).commit(hash1);
  await c1.wait();

  // Commit on w2
  const salt2 = hexlify(randomBytes(32));
  const hash2 = solidityPackedKeccak256(["string", "bytes32"], [word, salt2]);
  console.log(`Wallet 2 committing...`);
  const c2 = await contract.connect(w2).commit(hash2);
  await c2.wait();

  // Reveal on w1
  console.log(`Wallet 1 revealing...`);
  const r1 = await contract.connect(w1).reveal(word, salt1);
  await r1.wait();

  // Reveal on w2
  console.log(`Wallet 2 revealing...`);
  const r2 = await contract.connect(w2).reveal(word, salt2);
  await r2.wait();

  console.log(`Successfully matched pair for "${word}"!`);
}

const total = await contract.totalPairs();
console.log(`\nDONE! Total Pairs on-chain: ${total.toString()}`);
