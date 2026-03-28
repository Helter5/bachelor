"""OAuth2 utilities for Google Sign-In"""
from typing import Optional
import logging
import httpx

from ..config import get_settings

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
    # Google's token verification endpoint
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token}"

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)

            if response.status_code != 200:
                return None

            data = response.json()

            # Verify the token is for our app
            if data.get("aud") != settings.google_client_id:
                return None

            # Verify email is verified
            if not data.get("email_verified"):
                return None

            # Extract user info
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


def generate_username_from_email(email: str) -> str:
    """
    Generate username from email address

    Args:
        email: Email address

    Returns:
        str: Username (part before @)
    """
    return email.split("@")[0]
