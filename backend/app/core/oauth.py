"""OAuth2 utilities for Google Sign-In"""
from typing import Optional
import logging

from ..config import get_settings
from .http import http_client_ctx

logger = logging.getLogger(__name__)

settings = get_settings()


async def verify_google_token(token: str) -> Optional[dict]:
    """
    Verify Google ID token and extract user info

    Args:
        token: Google ID token from frontend

    Returns:
        dict: User info (email, name, picture) if valid, None otherwise
    """
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"

    try:
        async with http_client_ctx() as client:
            response = await client.get(url, timeout=30.0)

        if response.status_code != 200:
            return None

        data = response.json()

        if data.get("aud") != settings.google_client_id:
            return None

        if not data.get("email_verified"):
            return None

        return {
            "email": data.get("email"),
            "given_name": data.get("given_name", ""),
            "family_name": data.get("family_name", ""),
            "picture": data.get("picture"),
            "google_id": data.get("sub"),  # Google's unique user ID
        }

    except Exception as e:
        logger.error("Error verifying Google token: %s", e)
        return None


async def verify_google_access_token(token: str) -> Optional[dict]:
    """Verify a Google OAuth access token and fetch the signed-in user profile."""
    tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?access_token={token}"
    userinfo_url = "https://openidconnect.googleapis.com/v1/userinfo"

    try:
        async with http_client_ctx() as client:
            token_response = await client.get(tokeninfo_url, timeout=30.0)

            if token_response.status_code != 200:
                return None

            token_data = token_response.json()
            audience = (
                token_data.get("aud")
                or token_data.get("audience")
                or token_data.get("issued_to")
            )
            if audience and audience != settings.google_client_id:
                return None

            user_response = await client.get(
                userinfo_url,
                headers={"Authorization": f"Bearer {token}"},
                timeout=30.0,
            )

        if user_response.status_code != 200:
            return None

        data = user_response.json()

        if not data.get("email_verified"):
            return None

        return {
            "email": data.get("email"),
            "given_name": data.get("given_name", ""),
            "family_name": data.get("family_name", ""),
            "picture": data.get("picture"),
            "google_id": data.get("sub"),
        }

    except Exception as e:
        logger.error("Error verifying Google access token: %s", e)
        return None


def generate_username_from_email(email: str) -> str:
    """
    Generate username from email address

    Args:
        email: Email address

    Returns:
        str: Username (part before @)
    """
    return email.split("@")[0]
