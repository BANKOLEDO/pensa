# PENSA — OKX Build X AI Season Submission Guide

**Deadline:** August 21, 2026, 23:59 UTC
**Live demo:** https://pensa-l2w7.onrender.com
**Repo:** https://github.com/BANKOLEDO/pensa

---

## 1. Project one-liner

> PENSA turns every gig payout into a pension — an open-source AI agent manages an
> on-chain pension vault on OKX X Layer, routing 3% of every payment into
> tokenized treasuries (RWA), DeFi lending, and stable assets, rebalanced live.

---

## 2. Key facts (use these everywhere)

| Item | Value |
|---|---|
| Chain | X Layer testnet (chain **1952**) / mainnet (196) |
| Factory | `0x8C7723E91C677847c4FF1a50CE126fC30bd63681` |
| Vault implementation | `0xEb9904B13e8067f310ED10e5329845F31300dF5A` |
| Strategy registry | `0xDd097d7644ecf8774BCe299a2ea0f3df9072c8D4` |
| Demo vault | `0xAFD75D42538BaA8AAd61361BEA0524fa801f0cF5` |
| Demo wallet | `0xCbf5c87c79Bc1d823f049e1Ed7707bc38Eb7D939` |
| Demo USDC (testnet) | `0x7411a136e1f85b762f53c81D8095E8A33942e5c5` |
| Market data | Live DefiLlama snapshot (26 RWA · 3,391 DeFi · 215 stable pools) |

Live verification endpoints judges can hit instantly:

- `GET https://pensa-l2w7.onrender.com/health`
- `GET https://pensa-l2w7.onrender.com/system/config`
- `GET https://pensa-l2w7.onrender.com/vaults/0xCbf5c87c79Bc1d823f049e1Ed7707bc38Eb7D939`
- `GET https://pensa-l2w7.onrender.com/strategies/market/snapshot`
- `GET https://pensa-l2w7.onrender.com/payments/x402/meta`

---

## 3. Google Form fields (copy-paste)

### Project Name
PENSA — AI-managed micro-pension for gig workers

### Project Description
PENSA turns every gig payout into a pension. When a gig worker receives a
payment, a configurable slice (default 3%) is automatically routed into an
on-chain pension vault on OKX X Layer. An open-source AI agent analyzes the
worker's age, income, and risk appetite, reads live market yields, and
continuously rebalances the vault across tokenized treasuries (RWA), DeFi
lending pools, and stable assets. The resulting portfolio strategy hash is
recorded on-chain and verifiable by anyone. The product ships as one URL: a
React dashboard + FastAPI backend (with the embedded AI agent) + Solidity
vaults on X Layer testnet (chain 1952), a Telegram bot interface, and a
wallet-to-web3 payout rail (x402).

### Project URL
https://pensa-l2w7.onrender.com

### GitHub
https://github.com/BANKOLEDO/pensa

### Email
_(your email)_

### Telegram
_(your Telegram handle)_

### X (Twitter) Handle
_(your handle — tag @XLayerOfficial in your post)_

### X (Twitter) Post URL
_(link to your main submission tweet, after posting — step 5)_

---

## 4. Twitter/X posts (tag @XLayerOfficial, in every post)

### 4a. Main submission tweet (post FIRST, then put its URL in the form)

> 🚀 Say hello to PENSA — the AI-managed pension for gig workers, live on X Layer.
>
> Every gig payout → 3% auto-routes into your on-chain pension vault. An
> open-source AI agent reads real market yields and rebalances your mix across
> tokenized treasuries (RWA), DeFi lending, and stable assets — recorded on-chain.
>
> 🧠 Agent-optimized. On-chain verifiable. Zero friction.
>
> 🔗 https://pensa-l2w7.onrender.com
> 📦 Contract on X Layer testnet: 0xAFD7…0Fc5
> #BuildX #XLayer #OKX @XLayerOfficial

### 4b. Demo video post (attach the 90-second video)

> 🎬 90-second demo of PENSA — building a pension in your pocket:
> 1️⃣ Connect wallet → 2️⃣ Set age/income/risk → 3️⃣ AI builds your portfolio
> 4️⃣ Live market monitor streams real yields → 5️⃣ Strategy hash lands on-chain
>
> Watch the agent re-optimize against live DefiLlama data in real time. No
> spreadsheets, no advisors, no fees.
>
> 🔗 https://pensa-l2w7.onrender.com
> #BuildX #XLayer #AI @XLayerOfficial

### 4c. Follow-up posts (space these out through the day)

**Problem post:**
> 1 in 2 gig workers has zero retirement savings. No 401(k), no pension plan —
> just a wallet. PENSA turns that wallet into a pension that grows itself.
> Every payout compounds automatically. #BuildX @XLayerOfficial

**AI post:**
> Your pension is managed by an open-source AI agent, not a broker. It reads
> live yields, scores 3,000+ pools, and rebalances for your age + risk appetite.
> Auditable, transparent, yours. #AI #XLayer @XLayerOfficial

**Telegram bot post:**
> Manage your pension from Telegram. Check your balance, view your AI strategy,
> adjust your auto-save rate, simulate payouts — all from chat. Zero apps, zero
> fees. #BuildX @XLayerOfficial

**Tech post:**
> Built on OKX X Layer: Solidity vaults + factory, FastAPI backend, AI
> optimization agent, React dashboard, Telegram bot. One URL, full product.
> Strategy hashes verifiable on-chain. #BuildX @XLayerOfficial

---

## 5. Submission steps (top to bottom)

1. **Health-check the live site** — open https://pensa-l2w7.onrender.com and
   confirm it loads in ~1s (no long loading spinner).
2. **Post the main tweet (4a)** on your X account, tagging @XLayerOfficial.
3. **Copy the tweet's URL** from X.
4. **Open the Google Form** (from the Build X AI Season page) and fill every
   field with the values in section 3.
5. **Submit the form** before August 21, 2026, 23:59 UTC.
6. **Post the demo video (4b)** with the video attached.
7. **Post the follow-ups (4c)** spaced through the day for visibility.

---

## 6. Telegram bot (a full product surface for judges)

The bot is a real interface, not a mockup. It runs in the same container as the
backend, needs only a free token from @BotFather, and talks to the live backend.

**Commands judges can try (if you paste a token into the deployed env):**

```
/start      welcome + quick start
/connect    how to connect a wallet / create a vault
/network    switch testnet | mainnet
/balance    current pension balance + projected value
/strategy   current AI strategy
/adjust 5   change the auto-allocation percentage (e.g. 5%)
/pay 1000   simulate an incoming payout (auto-allocates 3%)
/help       list commands
```

Run locally or in the container: `python bot/telegram_bot.py` with
`TELEGRAM_BOT_TOKEN` set.

---

## 7. Verification checklist (prove it's real, not mock)

- `GET /health` → `{"status":"ok","service":"pensa-backend","env":"staging"}`
- `GET /system/config` → `simulated: false` + real factory address + chain 1952
- `GET /vaults/0xCbf5…D939` → real on-chain holdings + strategy hash
- `GET /strategies/market/snapshot` → live DefiLlama pools (`is_fallback: false`)
- `POST /strategies/recommend` with a profile → real allocations + `expectedApr`
- `POST /payments/auto` (needs `X-PENSA-ADMIN` header) → routes 3% into the vault
- Telegram `/balance` → real vault numbers from the same backend

---

## 8. Final reminders

- Deadline is **August 21, 2026 23:59 UTC** — do not wait.
- Every tweet must tag @XLayerOfficial.
- The demo video is a bonus, not required — 1–3 min walkthrough preferred.
- The app is already easy to use: connect wallet → 3 fields → dashboard loads
  instantly, strategy streams in, guided tour walks through the first time.