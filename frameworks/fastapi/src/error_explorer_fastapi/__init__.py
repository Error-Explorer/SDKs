"""
Error Explorer FastAPI SDK.

Provides FastAPI integration for Error Explorer error tracking.
"""

from .middleware import ErrorExplorerMiddleware
from .logging import ErrorExplorerHandler

__all__ = [
    "ErrorExplorerMiddleware",
    "ErrorExplorerHandler",
]

__version__ = "1.0.0"
