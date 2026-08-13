"""Encryption helpers for user-supplied Gemini API keys."""

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from backend.app.core.config import settings


def _fernet() -> Fernet:
    # Fernet needs a URL-safe 32-byte key. Deriving it from the app secret keeps
    # the database value unreadable without the server's SECRET_KEY.
    key = base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
    return Fernet(key)


def encrypt_api_key(api_key: str) -> str:
    return _fernet().encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted_key: str | None) -> str | None:
    if not encrypted_key:
        return None
    try:
        return _fernet().decrypt(encrypted_key.encode()).decode()
    except (InvalidToken, ValueError):
        return None
