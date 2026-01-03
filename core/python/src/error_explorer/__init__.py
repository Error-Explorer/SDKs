"""
Error Explorer SDK for Python

Automatic error tracking and monitoring for Python applications.
"""

from .client import ErrorExplorer
from .types import (
    Breadcrumb,
    BreadcrumbLevel,
    BreadcrumbType,
    CaptureContext,
    ErrorExplorerOptions,
    User,
)
from .transport import Transport, HttpTransport
from .scrubber import DataScrubber

__version__ = "1.0.0"
__all__ = [
    "ErrorExplorer",
    "ErrorExplorerOptions",
    "Breadcrumb",
    "BreadcrumbLevel",
    "BreadcrumbType",
    "CaptureContext",
    "User",
    "Transport",
    "HttpTransport",
    "DataScrubber",
]
