from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class Settings:
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
    analysis_provider: str = os.getenv("ANALYSIS_PROVIDER", "openai")
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change_this_in_production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))
    bootstrap_admin_email: str = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@rb.local")
    bootstrap_admin_password: str = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "admin1234")
    bootstrap_admin_full_name: str = os.getenv("BOOTSTRAP_ADMIN_FULL_NAME", "Administrador RB")
    frontend_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
        ).split(",")
        if origin.strip()
    )


settings = Settings()
