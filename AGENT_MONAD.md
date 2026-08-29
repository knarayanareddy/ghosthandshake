# AGENT BRIEF — Monad docs for this build

https://docs.monad.xyz/  
Deployment summary: https://docs.monad.xyz/developer-essentials/summary  
Testnet: https://docs.monad.xyz/developer-essentials/testnet  
RPC differences: https://docs.monad.xyz/reference/rpc-differences  

This file wins on chain ID, RPC, gas, logs, Foundry.

---

## Chain (default)

| | Testnet (Blitz) | Mainnet |
|--|-----------------|---------|
| Chain ID | **10143** (`0x279f`) | 143 |
| RPC | `https://testnet-rpc.monad.xyz` | `https://rpc.monad.xyz` |
| WS | `wss://testnet-rpc.monad.xyz` | `wss://rpc.monad.xyz` |
| Explorer | https://testnet.monadvision.com | https://monadvision.com |
| Faucet | https://faucet.monad.xyz + Devnads | — |

Testnet was **reset 2025-12-16**. Mainnet launched 24 Nov 2025 — **do not deploy mainnet** unless the event says so.

`wallet_addEthereumChain`:

```json
{
  "chainId": "0x279f",
  "chainName": "Monad Testnet",
  "nativeCurrency": { "name": "MON", "symbol": "MON", "decimals": 18 },
  "rpcUrls": ["https://testnet-rpc.monad.xyz"],
  "blockExplorerUrls": ["https://testnet.monadvision.com"]
}
```

---

## Timing (tune REVEAL_WINDOW here)

Docs: **~300ms** blocks, **~600ms** finality (two blocks). `TIMESTAMP` opcode is **1-second** granularity → 3–4 blocks share a timestamp.

`REVEAL_WINDOW = 2000` ≈ 10 minutes. After first RPC, `cast block --rpc-url https://testnet-rpc.monad.xyz` and confirm interval; change the **one constant** if needed. **Do not use 40 blocks** (~12s).

---

## Gas

Charged = **`gas_price * gas_limit`**, not gas used. Tight `estimateGas` + small buffer. Tx cap 30M; these functions are tiny. Min base fee 100 MON-gwei. `eth_maxPriorityFeePerGas` may return a hardcoded 2 gwei.

Wait for **receipt** per wallet before the next send. Monad may **accept** nonce-gap txs that Ethereum would reject.

---

## RPC

- `eth_getLogs`: max range often 1000; use **1–10** blocks if you subscribe. **Prefer `getAllPairs()` + `Matched` events from deploy block**, not logs from 0.  
- No `eth_subscribe("newPendingTransactions")`.  
- Testnet QuickNode ~50 rps (25 for `eth_call` / `estimateGas`). Canvas poll every 4s is fine.  
- Some RPCs lack historical `eth_call`. Always latest.  
- Foundry **v1.8+**. `forge install foundry-rs/forge-std`.  
- Verify contract on MonadVision after deploy.  
- ethers v6 on a static page is OK; if you rewrite, viem ≥ 2.40.

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast --private-key $PK
```

Add `--legacy` if 1559 estimation fails.

---

## Parallelism

Two wallets commit/reveal = different mapping slots → parallel. Good. Don’t 20-wallet spam `pendingRevealer` for the same word.

---

## Not needed

x402, 4337, 7702, Permit2, Multicall, Execution Events SDK, P256.

---

## Pitch accuracy

Say **300ms blocks / a reveal that finalizes in about a second**, not “we demonstrate 10k TPS.” The demo is **a bond as a fact + a line on the wall**.
