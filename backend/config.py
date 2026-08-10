"""PENSA backend configuration (pydantic-settings, env driven)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings

ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    app_env: str = "dev"  # dev | staging | prod
    x_layer_rpc: str = "https://rpc.xlayer.tech"
    x_layer_testnet_rpc: str = "https://testrpc.xlayer.tech"
    chain_id: int = 196

    agent_private_key: str = ""
    deployer_private_key: str = ""

    factory_address: str = ""
    strategy_address: str = ""

    huggingface_api_key: str = ""
    huggingface_model: str = "mistralai/Mistral-7B-Instruct-v0.3"
    ai_fallback_sleep: float = 20.0

    telegram_bot_token: str = ""
    admin_chat_id: str = ""

    # Cross-origin for the Vite dev server + production domain.
    cors_origins: str = "*"

    class Config:
        env_file = ROOT / ".env"
        env_file_encoding = "utf-8"

    @property
    def is_simulation(self) -> bool:
        return self.app_env == "dev"

    @property
    def effective_chain_id(self) -> int:
        return 1952 if self.app_env == "staging" else self.chain_id

    @property
    def effective_rpc(self) -> str:
        if self.app_env == "staging":
            return self.x_layer_testnet_rpc
        return self.x_layer_rpc

    def load_deployments(self) -> dict:
        """Addresses written by scripts/deploy.js for the current env."""
        if self.factory_address:
            return {"factory": self.factory_address, "strategy": self.strategy_address, "rpc": self.effective_rpc}
        network = "xlayer" if self.app_env == "prod" else ("xlayerTestnet" if self.app_env == "staging" else "localhost")
        path = ROOT / "deployments" / f"{network}.json"
        if path.exists():
            data = json.loads(path.read_text())
            data["rpc"] = self.effective_rpc
            return data
        return {}


@lru_cache
def get_settings() -> Settings:
    return Settings()
