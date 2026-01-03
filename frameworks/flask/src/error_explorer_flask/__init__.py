"""
Error Explorer Flask SDK.

Provides Flask integration for Error Explorer error tracking.
"""

from .extension import ErrorExplorerFlask
from .logging import ErrorExplorerHandler

__all__ = [
    "ErrorExplorerFlask",
    "ErrorExplorerHandler",
]

__version__ = "1.0.0"
