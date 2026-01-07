"""
Type definitions for Error Explorer SDK.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union


class BreadcrumbLevel(str, Enum):
    """Breadcrumb severity level."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    FATAL = "fatal"


class BreadcrumbType(str, Enum):
    """Breadcrumb type."""
    DEFAULT = "default"
    DEBUG = "debug"
    ERROR = "error"
    NAVIGATION = "navigation"
    HTTP = "http"
    INFO = "info"
    QUERY = "query"
    TRANSACTION = "transaction"
    UI = "ui"
    USER = "user"


@dataclass
class Breadcrumb:
    """
    Breadcrumb for tracking user actions and events leading to an error.
    """
    message: str
    category: str = "default"
    type: Union[BreadcrumbType, str] = BreadcrumbType.DEFAULT
    level: Union[BreadcrumbLevel, str] = BreadcrumbLevel.INFO
    data: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None

    def __post_init__(self) -> None:
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc)
        if isinstance(self.type, str):
            try:
                self.type = BreadcrumbType(self.type)
            except ValueError:
                pass  # Keep as string for custom types
        if isinstance(self.level, str):
            try:
                self.level = BreadcrumbLevel(self.level)
            except ValueError:
                pass

    def to_dict(self) -> Dict[str, Any]:
        """Convert breadcrumb to dictionary for serialization."""
        result: Dict[str, Any] = {
            "message": self.message,
            "category": self.category,
            "type": self.type.value if isinstance(self.type, BreadcrumbType) else self.type,
            "level": self.level.value if isinstance(self.level, BreadcrumbLevel) else self.level,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
        if self.data:
            result["data"] = self.data
        return result


@dataclass
class User:
    """
    User information for error context.
    """
    id: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    ip_address: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary for serialization."""
        result: Dict[str, Any] = {}
        if self.id:
            result["id"] = self.id
        if self.email:
            result["email"] = self.email
        if self.username:
            result["username"] = self.username
        if self.ip_address:
            result["ip_address"] = self.ip_address
        if self.extra:
            result.update(self.extra)
        return result


@dataclass
class CaptureContext:
    """
    Context for capturing errors.
    """
    user: Optional[User] = None
    tags: Optional[Dict[str, str]] = None
    extra: Optional[Dict[str, Any]] = None
    fingerprint: Optional[List[str]] = None
    level: Optional[str] = None
    contexts: Optional[Dict[str, Dict[str, Any]]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary for serialization."""
        result: Dict[str, Any] = {}
        if self.user:
            result["user"] = self.user.to_dict()
        if self.tags:
            result["tags"] = self.tags
        if self.extra:
            result["extra"] = self.extra
        if self.fingerprint:
            result["fingerprint"] = self.fingerprint
        if self.level:
            result["level"] = self.level
        if self.contexts:
            result["contexts"] = self.contexts
        return result


@dataclass
class AutoCaptureOptions:
    """Options for automatic error capture."""
    uncaught_exceptions: bool = True
    unhandled_threads: bool = True
    logging: bool = False


@dataclass
class BreadcrumbOptions:
    """Options for breadcrumb capture."""
    enabled: bool = True
    max_breadcrumbs: int = 100
    logging: bool = True
    http: bool = True


@dataclass
class ErrorExplorerOptions:
    """
    Configuration options for Error Explorer SDK.

    Note: For max_breadcrumbs, use either:
    - breadcrumbs.max_breadcrumbs (preferred, nested config)
    - max_breadcrumbs (top-level, legacy)
    If both are set, breadcrumbs.max_breadcrumbs takes precedence.
    """
    token: str
    project: Optional[str] = None
    environment: str = "production"
    release: Optional[str] = None
    endpoint: str = "https://error-explorer.com/api/v1/webhook"
    hmac_secret: Optional[str] = None
    debug: bool = False
    enabled: bool = True
    sample_rate: float = 1.0
    max_breadcrumbs: int = 100  # Legacy, use breadcrumbs.max_breadcrumbs instead
    attach_stacktrace: bool = True
    send_default_pii: bool = False
    server_name: Optional[str] = None
    auto_capture: Optional[AutoCaptureOptions] = None
    breadcrumbs: Optional[BreadcrumbOptions] = None
    before_send: Optional[Callable[[Dict[str, Any]], Optional[Dict[str, Any]]]] = None
    scrub_fields: Optional[List[str]] = None
    timeout: float = 10.0

    def __post_init__(self) -> None:
        # Convert dict to AutoCaptureOptions if needed
        if self.auto_capture is None:
            self.auto_capture = AutoCaptureOptions()
        elif isinstance(self.auto_capture, dict):
            self.auto_capture = AutoCaptureOptions(**self.auto_capture)

        # Convert dict to BreadcrumbOptions if needed
        if self.breadcrumbs is None:
            # Sync max_breadcrumbs from top-level to nested config
            self.breadcrumbs = BreadcrumbOptions(max_breadcrumbs=self.max_breadcrumbs)
        elif isinstance(self.breadcrumbs, dict):
            # If nested max_breadcrumbs not specified, use top-level
            if 'max_breadcrumbs' not in self.breadcrumbs:
                self.breadcrumbs['max_breadcrumbs'] = self.max_breadcrumbs
            self.breadcrumbs = BreadcrumbOptions(**self.breadcrumbs)

        if self.scrub_fields is None:
            self.scrub_fields = [
                "password", "passwd", "secret", "api_key", "apikey",
                "access_token", "auth_token", "credentials", "credit_card",
                "card_number", "cvv", "ssn", "social_security",
            ]


@dataclass
class StackFrame:
    """A single frame in a stack trace."""
    filename: str
    lineno: int
    function: str
    context_line: Optional[str] = None
    pre_context: Optional[List[str]] = None
    post_context: Optional[List[str]] = None
    module: Optional[str] = None
    in_app: bool = True
    vars: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert frame to dictionary for serialization."""
        result: Dict[str, Any] = {
            "filename": self.filename,
            "lineno": self.lineno,
            "function": self.function,
            "in_app": self.in_app,
        }
        if self.context_line:
            result["context_line"] = self.context_line
        if self.pre_context:
            result["pre_context"] = self.pre_context
        if self.post_context:
            result["post_context"] = self.post_context
        if self.module:
            result["module"] = self.module
        if self.vars:
            result["vars"] = self.vars
        return result


@dataclass
class ExceptionInfo:
    """Information about a captured exception."""
    type: str
    value: str
    module: Optional[str] = None
    stacktrace: Optional[List[StackFrame]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception info to dictionary for serialization."""
        result: Dict[str, Any] = {
            "type": self.type,
            "value": self.value,
        }
        if self.module:
            result["module"] = self.module
        if self.stacktrace:
            result["stacktrace"] = {
                "frames": [frame.to_dict() for frame in self.stacktrace]
            }
        return result


@dataclass
class Event:
    """Error event to be sent to Error Explorer."""
    event_id: str
    timestamp: datetime
    level: str = "error"
    message: Optional[str] = None
    exception: Optional[ExceptionInfo] = None
    breadcrumbs: Optional[List[Breadcrumb]] = None
    user: Optional[User] = None
    tags: Optional[Dict[str, str]] = None
    extra: Optional[Dict[str, Any]] = None
    contexts: Optional[Dict[str, Dict[str, Any]]] = None
    fingerprint: Optional[List[str]] = None
    environment: Optional[str] = None
    release: Optional[str] = None
    server_name: Optional[str] = None
    sdk: Optional[Dict[str, str]] = None
    platform: str = "python"

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization."""
        result: Dict[str, Any] = {
            "event_id": self.event_id,
            "timestamp": self.timestamp.isoformat(),
            "level": self.level,
            "platform": self.platform,
        }

        if self.message:
            result["message"] = self.message
        if self.exception:
            result["exception"] = {"values": [self.exception.to_dict()]}
        if self.breadcrumbs:
            result["breadcrumbs"] = {
                "values": [b.to_dict() for b in self.breadcrumbs]
            }
        if self.user:
            result["user"] = self.user.to_dict()
        if self.tags:
            result["tags"] = self.tags
        if self.extra:
            result["extra"] = self.extra
        if self.contexts:
            result["contexts"] = self.contexts
        if self.fingerprint:
            result["fingerprint"] = self.fingerprint
        if self.environment:
            result["environment"] = self.environment
        if self.release:
            result["release"] = self.release
        if self.server_name:
            result["server_name"] = self.server_name
        if self.sdk:
            result["sdk"] = self.sdk

        return result
