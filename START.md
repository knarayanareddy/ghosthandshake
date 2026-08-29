# START HERE

You are building **Ghost Handshake × Afterimage**. This folder is the entire project. Do not use sibling directories.

## Read, in this order

1. This file  
2. `HANDOVER.md` — product, contract rules, demo, timeline  
3. `AGENT_MONAD.md` — chain **10143**, RPC, gas, logs  
4. `AGENT_UI.md` — hashing, two screens, design  
5. `AGENT_BLITZ.md` — Devnads submit (GitHub + HTTPS Live)

Visual law: `DESIGN.md`. One-liner: `PRODUCT.md`.

## Serve (ES modules — do not open `file://`)

From this folder:

```bash
python3 -m http.server 8765 --directory web
```

- Play: http://127.0.0.1:8765/  
- Wall: http://127.0.0.1:8765/canvas.html  

Contract address via query (wins over localStorage):

```
http://127.0.0.1:8765/?c=0xYOURCONTRACT
http://127.0.0.1:8765/canvas.html?c=0xYOURCONTRACT
```

## Deploy

```bash
forge install foundry-rs/forge-std
forge test
forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://testnet-rpc.monad.xyz \
  --broadcast --private-key $PK
```

Then pass `?c=` into both URLs. Network: Monad Testnet, chain id **10143**.

## Do not

Stake MON, retire words (keep `retireWords` false), `eth_getLogs` from block 0, mainnet 143 unless organizers say so, rewrite the hash to `abi.encode`.
