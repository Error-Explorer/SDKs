"""
Error Explorer Django Integration

Automatic error tracking and monitoring for Django applications.

Usage:
    # settings.py
    INSTALLED_APPS = [
        ...
        'error_explorer_django',
    ]

    MIDDLEWARE = [
        'error_explorer_django.middleware.ErrorExplorerMiddleware',
        ...
    ]

    ERROR_EXPLORER = {
        'token': 'your_token_here',
        'environment': 'production',
        'release': '1.0.0',
    }
"""

from .middleware import ErrorExplorerMiddleware
from .apps import ErrorExplorerConfig
from .logging import ErrorExplorerHandler
from .signals import setup_signals

__version__ = "1.0.0"
__all__ = [
    "ErrorExplorerMiddleware",
    "ErrorExplorerConfig",
    "ErrorExplorerHandler",
    "setup_signals",
]

default_app_config = "error_explorer_django.apps.ErrorExplorerConfig"
