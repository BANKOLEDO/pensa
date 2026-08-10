"""PENSA Telegram bot — the zero-cost user interface.

Runs entirely against the PENSA backend (dev simulation or X Layer). Needs
only a free bot token from @BotFather. Start it with:

    set TELEGRAM_BOT_TOKEN=...  (or add to .env)
    python bot/telegram_bot.py

Commands:
    /start      welcome + quick start
    /connect    how to connect a wallet / create a vault
    /balance    current pension balance + projected value
    /strategy   current AI strategy
    /adjust     change the auto-allocation percentage
    /pay        simulate an incoming payout (auto-allocates 3%)
    /help       list commands
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import Application, CommandHandler, ContextTypes

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from backend.config import get_settings
from backend.utils.xlayer_client import CLIENT

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("pensa.bot")

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
BASE_URL = os.getenv("TELEGRAM_BASE_URL", "http://127.0.0.1:8000")

SUPPORTED_ASSETS = ["USDC", "USDT", "TBILL", "USDY", "AAVE-USDC"]


def _usd(value) -> str:
    return f"${float(value):,.2f}"


async def _fetch_vault(user: str) -> dict | None:
    try:
        import requests
        resp = requests.get(f"{BASE_URL}/vaults/{user}", timeout=10)
        if resp.status_code == 200:
            return resp.json()
    except Exception as exc:
        log.warning("backend fetch failed: %s", exc)
    return None


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    mode = "SIMULATION mode (dev)" if CLIENT.is_simulation else f"{CLIENT.settings.app_env} · chain {CLIENT.settings.chain_id}"
    await update.message.reply_text(
        f"*PENSA — Your AI Pension*\n"
        f"`{mode}`\n\n"
        "Every gig payout you receive, 3% goes straight into your on-chain pension vault — "
        "invested by AI across RWA treasuries, DeFi, and stable assets.\n\n"
        "Commands:\n"
        "/connect — connect wallet & create vault\n"
        "/balance — check pension balance\n"
        "/strategy — view AI strategy\n"
        "/adjust — change allocation\n"
        "/pay — simulate a payout\n"
        "/help — all commands\n\n"
        "Built on @XLayerOfficial",
        parse_mode="Markdown",
    )


async def connect(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    keyboard = [
        [InlineKeyboardButton("Open OKX Wallet", url="https://www.okx.com/web3")],
        [InlineKeyboardButton("View X Layer Explorer", url="https://www.oklink.com/x-layer")],
    ]
    await update.message.reply_text(
        "Connect your wallet to start your pension:\n\n"
        "1. Install the OKX Wallet browser extension / app\n"
        "2. Switch the network to *X Layer* (chain ID `196`)\n"
        "3. Create a vault with your address:\n"
        "`/create 0xYOUR_ADDRESS`\n\n"
        "In dev mode no wallet is needed — try `/balance` or `/pay`.",
        reply_markup=InlineKeyboardMarkup(keyboard),
        parse_mode="Markdown",
    )


async def create(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Usage: `/create 0xYOUR_ADDRESS`")
        return
    user = context.args[0]
    try:
        import requests
        resp = requests.post(
            f"{BASE_URL}/vaults",
            json={"user": user, "allocationPercent": 300, "riskTolerance": 50, "preferredAssets": ["USDC", "TBILL"]},
            timeout=10,
        )
        if resp.status_code in (200, 201):
            data = resp.json()
            await update.message.reply_text(
                f"Vault ready for `{user}`\n"
                f"Allocation: `{data.get('allocationPercent', 300)} bps` (3.00%)\n"
                f"Risk: `{data.get('riskTolerance', 50)}/100`\n"
                f"Vault: `{data.get('vault', 'n/a')}`",
                parse_mode="Markdown",
            )
        else:
            await update.message.reply_text(f"Error: {resp.status_code} {resp.text[:200]}")
    except Exception as exc:
        await update.message.reply_text(f"Backend unreachable ({exc}). Is it running?")


async def balance(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = _resolve_user(context)
    if not user:
        await update.message.reply_text("Set an address with `/set 0xYOUR_ADDRESS` or pass one: `/balance 0x...`")
        return
    vault = await _fetch_vault(user)
    if not vault:
        await update.message.reply_text("No vault found. Create one with `/create 0xYOUR_ADDRESS`.")
        return
    total = vault.get("totalValue", 0)
    deposited = vault.get("totalDeposited", 0)
    returns = vault.get("totalReturns", 0)
    growth = vault.get("growthPct", 0)

    # Simple projection: deposit balance grows at expected APR until retirement.
    years = max(1, 65 - 30)
    monthly = deposited / max(1, (90 * 12))
    projected = monthly * years * 12 * 1.04  # 4% blended net APR assumption

    holdings = vault.get("holdings", {})
    lines = "\n".join(f"• {k}: {_usd(v)}" for k, v in holdings.items()) or "—"
    await update.message.reply_text(
        f"*Pension Balance*\n\n"
        f"Total value: {_usd(total)}\n"
        f"Deposited: {_usd(deposited)}\n"
        f"Returns: {_usd(returns)} ({growth:+.2f}%)\n"
        f"Projected at 65: {_usd(projected)}\n\n"
        f"*Holdings*\n{lines}",
        parse_mode="Markdown",
    )


async def strategy(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = _resolve_user(context)
    if not user:
        await update.message.reply_text("Set an address with `/set 0xYOUR_ADDRESS`.")
        return
    try:
        import requests
        resp = requests.post(
            f"{BASE_URL}/strategies/recommend",
            json={"user": user, "age": 30, "monthly_income": 2000, "riskTolerance": 50, "retirement_age": 65},
            timeout=30,
        )
        if resp.status_code != 200:
            await update.message.reply_text("Strategy service unavailable.")
            return
        data = resp.json()
        risk = data.get("risk", {})
        alloc = data.get("allocations", [])
        lines = "\n".join(
            f"• {a.get('category','').upper():<7} {a.get('asset','?'):<12} {a.get('percentage',0):>5.1f}%  APY {a.get('apy',0):.1f}%"
            for a in alloc
        )
        await update.message.reply_text(
            f"*AI Strategy*\n\n"
            f"Risk score: `{risk.get('score','?')}/100` ({risk.get('level','?')})\n"
            f"Expected APR: `{data.get('expectedApr', 0)}%`\n"
            f"Source: `{'live market' if not data.get('market', {}).get('is_fallback') else 'fallback'}`\n\n"
            f"```\n{lines}\n```",
            parse_mode="Markdown",
        )
    except Exception as exc:
        await update.message.reply_text(f"Strategy service error: {exc}")


async def adjust(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Usage: `/adjust 5` (sets allocation to 5%)")
        return
    try:
        pct = int(context.args[0])
    except ValueError:
        await update.message.reply_text("Use a whole number, e.g. `/adjust 5`")
        return
    if not (0 <= pct <= 10):
        await update.message.reply_text("Allocation must be between 0 and 10%.")
        return
    user = _resolve_user(context)
    if not user:
        await update.message.reply_text("Set an address first: `/set 0xYOUR_ADDRESS`")
        return
    try:
        import requests
        resp = requests.patch(f"{BASE_URL}/vaults/{user}/allocation", json={"allocationPercent": pct * 100}, timeout=10)
        if resp.status_code in (200, 201):
            await update.message.reply_text(f"Allocation updated to *{pct}%* of every payout.")
        else:
            await update.message.reply_text(f"Error: {resp.status_code} {resp.text[:200]}")
    except Exception as exc:
        await update.message.reply_text(f"Backend unreachable ({exc}).")


async def pay(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = _resolve_user(context)
    if not user:
        await update.message.reply_text("Set an address with `/set 0xYOUR_ADDRESS`.")
        return
    amount = 1000.0
    if context.args:
        try:
            amount = float(context.args[0])
        except ValueError:
            amount = 1000.0
    try:
        import requests
        resp = requests.post(
            f"{BASE_URL}/payments/auto",
            json={"user": user, "asset": "USDC", "amount": amount},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            await update.message.reply_text(
                f"Payout received: *{_usd(amount)}* USDC\n"
                f"Auto-allocated to pension: *{_usd(data['allocation']['captured'])}*\n"
                f"`{data.get('message', '')}`",
                parse_mode="Markdown",
            )
        else:
            await update.message.reply_text(f"Error: {resp.status_code} {resp.text[:200]}")
    except Exception as exc:
        await update.message.reply_text(f"Backend unreachable ({exc}).")


async def set_address(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Usage: `/set 0xYOUR_ADDRESS`")
        return
    context.user_data["pensa_address"] = context.args[0]
    await update.message.reply_text(f"Address saved: `{context.args[0]}`", parse_mode="Markdown")


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "/start — welcome\n"
        "/connect — wallet setup\n"
        "/create 0x... — create a vault\n"
        "/set 0x... — remember your address\n"
        "/balance — pension balance\n"
        "/strategy — AI allocation\n"
        "/adjust 5 — set allocation %\n"
        "/pay 1000 — simulate a payout\n"
        "/help — this list"
    )


def _resolve_user(context: ContextTypes.DEFAULT_TYPE) -> str | None:
    if context.args and len(context.args) >= 1 and context.args[0].startswith("0x"):
        return context.args[0]
    return context.user_data.get("pensa_address")


def main() -> None:
    if not TOKEN:
        log.error("TELEGRAM_BOT_TOKEN is not set. Get one from @BotFather and set it in .env")
        sys.exit(1)
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("connect", connect))
    app.add_handler(CommandHandler("create", create))
    app.add_handler(CommandHandler("set", set_address))
    app.add_handler(CommandHandler("balance", balance))
    app.add_handler(CommandHandler("strategy", strategy))
    app.add_handler(CommandHandler("adjust", adjust))
    app.add_handler(CommandHandler("pay", pay))
    app.add_handler(CommandHandler("help", help_cmd))
    log.info("PENSA bot polling started")
    app.run_polling()


if __name__ == "__main__":
    main()
