"""Settings for the payments package.

Order of priority for each PAYSTACK_* setting:
  1. the project's .env file
  2. the real environment (what a hosting platform provides in production)

.env wins on purpose: python-dotenv's load_dotenv() never overrides variables
that already exist, so a stale PAYSTACK_SECRET_KEY set in Windows would
otherwise silently beat the key in your project.
"""
import os
from functools import lru_cache

try:
    from dotenv import dotenv_values, find_dotenv
except ImportError:  # python-dotenv not installed: fall back to the environment
    dotenv_values = None


@lru_cache(maxsize=1)
def _dotenv() -> dict:
    if dotenv_values is None:
        return {}
    # usecwd=True looks for .env in the folder the server is started from.
    return dict(dotenv_values(find_dotenv(usecwd=True)))


def get_setting(name: str, default: str | None = None) -> str | None:
    return _dotenv().get(name) or os.environ.get(name) or default