"""Configuration for the demo agent server."""

import os
from pathlib import Path

from pydantic import BaseModel


def _read_env_file(path: Path) -> dict[str, str]:
    """Read simple KEY=VALUE lines without adding a python-dotenv dependency."""
    if not path.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")

    return values


_PACKAGE_ROOT = Path(__file__).resolve().parents[1]
_REPO_ROOT = Path(__file__).resolve().parents[3]
_LOCAL_ENV = {
    **_read_env_file(_REPO_ROOT / ".env.local"),
    **_read_env_file(_PACKAGE_ROOT / ".env.local"),
}


def _env(key: str, default: str = "") -> str:
    return os.getenv(key) or _LOCAL_ENV.get(key, default)


class Settings(BaseModel):
    """Application settings."""

    host: str = "0.0.0.0"
    port: int = 8000
    mcp_server_url: str = "http://localhost:3100/mcp"
    mock_api_url: str = "http://localhost:3200"
    debug: bool = True
    openai_api_key: str = _env("OPENAI_API_KEY")
    openai_model: str = _env("OPENAI_MODEL", "gpt-4.1-mini")
    openai_base_url: str = _env("OPENAI_BASE_URL", "https://api.openai.com/v1")


settings = Settings()
