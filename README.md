# PENSA — AI-managed micro-pension for gig workers

PENSA turns every gig payout into a pension. When a gig worker receives a payment, a configurable slice (default **3%**) is automatically routed into an on-chain pension vault. An open-source AI agent continuously rebalances the vault across treasuries, liquidity pools, and stable assets.

Built for **OKX X Layer** (EVM, chain 196 mainnet / 1952 testnet).

```
Frontend (React + Vite)  ──►  Backend (FastAPI)  ──►  PENSA contracts (Solidity)
        ▲                          │                         │
        │                          ▼                         ▼
   Wallet (MetaMask/OKX)    AI Agent (LLM + rules)    Vaults/Factory/Strategy
```

The **AI agent** is a core component of PENSA, not a bolt-on. It analyzes each
worker's profile (age, income, risk tolerance), reads live market yields, and
produces the portfolio the vault's strategy hash points at. The backend invokes
it for every recommendation, and `pnpm agent` runs it as a standalone rebalance
loop / CLI. See `ai-agent/`.

## Repository layout

```
├── contracts/        Solidity: PENSAVault, PENSAFactory, PENSAStrategy, MockERC20
├── scripts/          Hardhat deploy, seed, verify
├── backend/          FastAPI: vault/payment/strategy routes + X Layer client
├── ai-agent/         PENSAgent — profile analysis, portfolio optimization, rebalance
├── bot/              Telegram bot for pension management by chat
├── frontend/         React landing page + wallet dashboard
├── deployments/    Generated contract addresses per network
└── test/             Contract tests (Hardhat)
```

## Prerequisites

- **Node.js 20+** and **pnpm** (`corepack enable` or `npm i -g pnpm`)
- **Python 3.12+** (developed on 3.14)
- A browser wallet: MetaMask or OKX Wallet

## 1. Install

```bash
pnpm install                    # contracts toolchain (hardhat, ethers, chai)
python -m pip install -r requirements.txt   # backend + agent + bot
```

## 2. Configure

Copy `.env.example` to `.env` and fill in what you need:

```bash
cp .env.example .env
```

| Key | Purpose | Needed for |
|-----|---------|-----------|
| `APP_ENV=dev` | Runs everything in offline SIMULATION (in-memory vaults, demo data) | local demo |
| `APP_ENV=staging` | Talks to the X Layer **testnet** (chain 1952) | testnet testing |
| `DEPLOYER_PRIVATE_KEY` | Wallet that deploys contracts (needs testnet OKB gas) | deploy/seed |
| `AGENT_PRIVATE_KEY` | Wallet the AI agent signs txs with | staging on-chain |
| `HUGGINGFACE_API_KEY` | Optional — LLM analysis (falls back to rules without it) | AI quality |
| `TELEGRAM_BOT_TOKEN` | Optional — Telegram bot | bots |

> **Never commit a real private key.** Left blank, the project runs in simulation.

## 3. Run the whole stack (local simulation)

Terminal 1 — backend:
```bash
python -m uvicorn backend.server:app --port 8000
```
Terminal 2 — frontend:
```bash
cd frontend && pnpm dev
```
Open http://localhost:5173, click **Open the dashboard**, connect your wallet, and explore all five tabs (Overview, Holdings, Strategy, Activity, Settings). With `APP_ENV=dev` the UI works fully without a chain.

Run the AI agent (core component) in standalone mode:
```bash
pnpm agent                 # or: python ai-agent/agent.py
```
It works offline too: without a HUGGINGFACE_API_KEY it falls back to a rules
engine, so the strategy pipeline is exercisable end-to-end with no external calls.

## 4. Smart contracts

Compile and test:
```bash
pnpm compile    # hardhat compile
pnpm test       # 21 hardhat contract tests
```

## 5. Testnet deploy (chain 1952)

1. Fund a wallet with testnet **OKB** from the X Layer faucet
   (https://web3.okx.com/xlayer/faucet/xlayerfaucet) and put its key in `.env`.
2. Set `APP_ENV=staging` so the backend targets the testnet RPC.
3. Deploy, fund, and seed:
```bash
pnpm deploy:testnet   # writes deployments/xlayerTestnet.json
pnpm fund:testnet     # deploys a mintable demo USDC + funds demo wallets (testnet OKB faucet first)
pnpm seed:testnet     # demo vaults + AI strategy + simulated $1,000 payouts
```

> **About demo USDC.** Circle's testnet faucet does not list X Layer, so real
> testnet USDC is not freely mintable there. `fund:testnet` deploys a mintable
> `MockERC20` demo USDC and stores its address in `deployments/xlayerTestnet.json`
> (`usdc`). The backend and seed scripts automatically prefer it over the
> canonical bridged USDC, so vault holdings, the payment sim, and the dashboard
> all show live on-chain numbers without real capital. Paste the deployer
> address into https://www.okx.com/xlayer/faucet first — it needs ~0.1 OKB for
> gas to run the funding txs (it also tops up the two derived demo wallets).
4. Restart the backend — it auto-reads the deployed factory address.
5. In the frontend, pick **Testnet** on the onboarding page, connect, and your
   wallet is switched to the testnet chain.

## 6. Mainnet (chain 196)

```bash
pnpm deploy:mainnet   # requires a real funded deployer key + `APP_ENV=prod`
pnpm seed:mainnet
```

## 7. Deploy for judging — one public URL, near-zero cost

Everything ships in a single Docker image (`Dockerfile`): the built frontend SPA
is served **same-origin** by the FastAPI backend (which embeds the AI agent) and
the Telegram bot runs in the same container. One URL is enough for the whole
product — no CORS, no cross-origin RPC. It listens on `$PORT` (default `7860`,
the Hugging Face Spaces port).

```bash
docker build -t pensa . && docker run -d -p 7860:7860 \
  -v "$PWD/.env:/app/.env:ro" \
  -e TELEGRAM_BOT_TOKEN="$TELEGRAM_BOT_TOKEN" pensa
```

Set these in the target platform (HF Spaces → Settings → Variables and Secrets;
never bake real keys into the image — `.env` is gitignore'd and not copied):

| Variable | Notes |
|----------|-------|
| `APP_ENV` | `staging` (testnet) or `prod` (mainnet) |
| `DEPLOYER_PRIVATE_KEY`, `AGENT_PRIVATE_KEY` | needed for on-chain write flows |
| `HUGGINGFACE_API_KEY` | optional, improves AI; rules fallback without it |
| `TELEGRAM_BOT_TOKEN` | optional — starts the Telegram bot when set |
| `SERVE_SPA` | `0` to disable SPA serving if you mount the UI elsewhere |

**Zero-cost hosting (recommended for judging):**
- **Hugging Face Spaces** — new Space → `Docker` SDK → point at this repo
  (or paste the Dockerfile). Free CPU tier, no credit card, persistent public
  URL like `https://<you>-pensa.hf.space`. Port auto-detected via `$PORT`.
- **Alternative**: Railway / Render / Fly.io can run the same Dockerfile
  unchanged.

### Judge demo script (external judges, anywhere in the world)

1. Open the **one public URL** — the landing page loads from the same server.
2. On the onboarding page pick **Testnet** (chain 1952) and connect a wallet
   (OKX/MetaMask). The backend auto-creates a vault for that address and stores
   an AI strategy hash on-chain. Explain the 3% auto-allocation.
3. Open the **Dashboard**: live vault holdings (mintable demo USDC from
   `fund:testnet`), risk score, expected APR, and Holdings/Strategy tabs update
   in real time. 3 seeded demo vaults are already on-chain.
4. Live payout routes:
   - `POST {URL}/payments/auto` `{"user":"0x…","asset":"USDC","amount":1000}` →
     allocates 3% into the vault (real testnet tx; agent signs).
   - `GET {URL}/payments/x402/meta` → x402 payment rail discovery.
5. AI on demand: `POST {URL}/strategies/recommend` returns live market yields
   (RWA/DeFi/stables), the resulting allocations, and `expectedApr` — even with
   no HF key the rule engine produces a sane portfolio.
6. (Optional) Telegram bot: start it with `/network testnet`, then `/balance`,
   `/strategy`, `/adjust 5`, `/pay 1000`.

Sanity endpoints judges can hit instantly — `GET /health`, `GET /system/config`.

## Verification

- `GET /health` → `{"status":"ok","service":"pensa-backend","env":"dev|staging"}`
- `GET /system/config` → deployed factory/strategy + chain id + `simulated` flag
- `GET /vaults/{address}` → on-chain vault balance/holdings (404 when none)
- `POST /strategies/apply` → returns `expectedApr`, per-asset allocations, and a
  strategy hash stored on the vault
- `POST /payments/auto` and `POST /payments/x402` → route an incoming payout and
  capture the allocation percent into the vault

## x402 payment rail

PENSA uses x402 (an HTTP-payment standard) as the rail for gig payouts. A payer
fetches `/payments/x402/meta`, signs the payment intent, and posts verification:
```bash
curl http://localhost:8000/payments/x402/meta
```
The verified intent auto-routes the allocation percent into the payer's pension vault.

## Architecture notes

- **Vaults are clones.** Each user gets an EIP-1167 minimal proxy from
  `PENSAFactory`, so vault creation costs ~90k gas instead of a full deploy.
- **One vault per wallet.** `createVault` is a singleton per address.
- **Fee on returns only.** The protocol charges 50 bps (configurable) on earned
  returns, never on principal.
- **Simulation first.** In `dev`, everything runs against an in-memory store so
  the product is fully demoable offline; `staging`/`prod` switch to real chain I/O.

## Known deployment addresses (testnet)

See `deployments/xlayerTestnet.json` for the current testnet factory, vault
implementation, and strategy registry.

---

*MIT licensed. X Layer network is provided by Metax Technology Company Limited.*