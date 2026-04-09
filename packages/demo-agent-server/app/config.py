"""Configuration for the demo agent server."""

from pydantic import BaseModel


class Settings(BaseModel):
    """Application settings."""

    host: str = "0.0.0.0"
    port: int = 8000
    mcp_server_url: str = "http://localhost:3100/mcp"
    mock_api_url: str = "http://localhost:3200"
    debug: bool = True


settings = Settings()
