# Ghost Handshake × Afterimage

Strangers pick the same secret word without saying it. They reveal on Monad. Each bond draws a glyph on a picture that only grows.

- Play: `web/index.html`
- Wall: `web/canvas.html`
- Contract: `contracts/GhostHandshake.sol`

Network: **Monad Testnet (10143)** · RPC `https://testnet-rpc.monad.xyz`

Words: canal · blitz · parallel · monad · ghost · tulip · amstel · fog

## Deploy

```bash
forge install foundry-rs/forge-std
forge script script/Deploy.s.sol:Deploy --rpc-url https://testnet-rpc.monad.xyz --broadcast --private-key $PK
```

Open with `?c=0x…` (beats localStorage):

```
http://127.0.0.1:8765/?c=0xYOURCONTRACT
http://127.0.0.1:8765/canvas.html?c=0xYOURCONTRACT
```

## Serve locally (required — not file://)

```bash
python3 -m http.server 8765 --directory web
```

Play: http://127.0.0.1:8765/ · Wall: http://127.0.0.1:8765/canvas.html

```bash
forge test
```

## Hosting (GitHub Pages)

`.github/workflows/deploy-pages.yml` deploys `web/` to Pages on every push to `main`.
One-time activation (repo admin): **Settings → Pages → Source: “GitHub Actions”**.

- Play: `https://knarayanareddy.github.io/ghosthandshake/?c=0xBd051598e1beC7f450bbe26e8b98A680Adde0d4b`
- Wall: `https://knarayanareddy.github.io/ghosthandshake/canvas.html?c=0xBd051598e1beC7f450bbe26e8b98A680Adde0d4b`
- Contract: `0xBd051598e1beC7f450bbe26e8b98A680Adde0d4b` (Monad Testnet 10143)

## Builder agents

**`START.md` first**, then `HANDOVER.md` → `AGENT_MONAD.md` → `AGENT_UI.md` → `AGENT_BLITZ.md`.
