"""
Flask extension for Error Explorer.

Captures request/response information as breadcrumbs and handles exceptions.
"""

from typing import Any, Callable, Dict, Optional
from datetime import timezone, datetime
import logging

from flask import Flask, request, g, has_request_context
from flask.signals import (
    request_started,
    request_finished,
    got_request_exception,
)
from werkzeug.exceptions import NotFound, Forbidden


logger = logging.getLogger(__name__)


class ErrorExplorerFlask:
    """
    Flask extension that integrates Error Explorer.

    - Captures request information as breadcrumbs
    - Sets user context from Flask-Login
    - Captures unhandled exceptions
    - Adds response status as breadcrumb

    Usage:
        app = Flask(__name__)
        error_explorer = ErrorExplorerFlask(app)

        # Or with factory pattern:
        error_explorer = ErrorExplorerFlask()
        error_explorer.init_app(app)
    """

    def __init__(self, app: Optional[Flask] = None) -> None:
        self.app = app
        self._config: Dict[str, Any] = {}

        if app is not None:
            self.init_app(app)

    def init_app(self, app: Flask) -> None:
        """Initialize the extension with a Flask app."""
        self.app = app
        self._config = app.config.get("ERROR_EXPLORER", {})

        # Register extension
        app.extensions["error_explorer"] = self

        # Connect signals
        request_started.connect(self._on_request_started, app)
        request_finished.connect(self._on_request_finished, app)
        got_request_exception.connect(self._on_got_request_exception, app)

    def _on_request_started(self, sender: Flask, **kwargs: Any) -> None:
        """Handle request started signal."""
        from error_explorer import ErrorExplorer

        if not ErrorExplorer.is_initialized():
            return

        # Add request breadcrumb
        self._add_request_breadcrumb()

        # Set user context
        self._set_user_context()

        # Set request context
        self._set_request_context()

    def _on_request_finished(
        self, sender: Flask, response: Any, **kwargs: Any
    ) -> None:
        """Handle request finished signal."""
        from error_explorer import ErrorExplorer

        if not ErrorExplorer.is_initialized():
            return

        self._add_response_breadcrumb(response)

    def _on_got_request_exception(
        self, sender: Flask, exception: Exception, **kwargs: Any
    ) -> None:
        """Handle exception signal."""
        self._handle_exception(exception)

    def _add_request_breadcrumb(self) -> None:
        """Add breadcrumb for incoming request."""
        from error_explorer import ErrorExplorer, Breadcrumb, BreadcrumbType

        client = ErrorExplorer.get_client()
        if client is None:
            return

        data: Dict[str, Any] = {
            "method": request.method,
            "path": request.path,
            "query_string": request.query_string.decode("utf-8", errors="replace"),
        }

        # Add endpoint name if available
        if request.endpoint:
            data["endpoint"] = request.endpoint

        # Add safe headers
        safe_headers = self._get_safe_headers()
        if safe_headers:
            data["headers"] = safe_headers

        client.add_breadcrumb(Breadcrumb(
            message=f"{request.method} {request.path}",
            category="http.request",
            type=BreadcrumbType.HTTP,
            data=data,
        ))

    def _add_response_breadcrumb(self, response: Any) -> None:
        """Add breadcrumb for response."""
        from error_explorer import ErrorExplorer, Breadcrumb, BreadcrumbType

        client = ErrorExplorer.get_client()
        if client is None:
            return

        # Determine level based on status code
        level = "info"
        if response.status_code >= 400:
            level = "warning"
        if response.status_code >= 500:
            level = "error"

        client.add_breadcrumb(Breadcrumb(
            message=f"Response {response.status_code}",
            category="http.response",
            type=BreadcrumbType.HTTP,
            level=level,
            data={
                "status_code": response.status_code,
                "content_type": response.content_type or "",
            },
        ))

    def _set_user_context(self) -> None:
        """Set user context from Flask-Login."""
        from error_explorer import ErrorExplorer, User

        if not self._config.get("capture_user", True):
            return

        client = ErrorExplorer.get_client()
        if client is None:
            return

        # Try to get user from Flask-Login
        try:
            from flask_login import current_user

            if current_user.is_authenticated:
                user_data: Dict[str, Any] = {}

                # Get user ID
                if hasattr(current_user, "id"):
                    user_data["id"] = str(current_user.id)
                elif hasattr(current_user, "get_id"):
                    user_data["id"] = str(current_user.get_id())

                # Get email if PII is allowed
                if self._config.get("send_default_pii", False):
                    if hasattr(current_user, "email") and current_user.email:
                        user_data["email"] = current_user.email

                # Get username
                if hasattr(current_user, "username"):
                    user_data["username"] = current_user.username

                if user_data:
                    client.set_user(User(**user_data))
        except ImportError:
            # Flask-Login not installed
            pass
        except RuntimeError:
            # Outside request context
            pass

    def _set_request_context(self) -> None:
        """Set request context for error events."""
        from error_explorer import ErrorExplorer

        client = ErrorExplorer.get_client()
        if client is None:
            return

        context: Dict[str, Any] = {
            "url": request.url,
            "method": request.method,
            "query_string": request.query_string.decode("utf-8", errors="replace"),
        }

        # Add headers (filtered for security)
        context["headers"] = self._get_safe_headers()

        # Add client IP
        context["ip"] = self._get_client_ip()

        # Add user agent
        if request.user_agent:
            context["user_agent"] = request.user_agent.string

        client.set_context("request", context)

    def _handle_exception(self, exception: Exception) -> None:
        """Handle exception and send to Error Explorer."""
        from error_explorer import ErrorExplorer, CaptureContext

        client = ErrorExplorer.get_client()
        if client is None:
            return

        # Don't capture 404s unless configured
        if isinstance(exception, NotFound):
            if not self._config.get("capture_404", False):
                return

        # Don't capture 403s unless configured
        if isinstance(exception, Forbidden):
            if not self._config.get("capture_403", False):
                return

        # Capture the exception
        tags: Dict[str, str] = {
            "flask.method": request.method or "UNKNOWN",
        }

        if request.endpoint:
            tags["flask.endpoint"] = request.endpoint

        client.capture_exception(
            exception,
            CaptureContext(tags=tags),
        )

    def _get_safe_headers(self) -> Dict[str, str]:
        """Get headers that are safe to include (no sensitive data)."""
        safe_header_names = {
            "Host",
            "User-Agent",
            "Accept",
            "Accept-Language",
            "Accept-Encoding",
            "Referer",
            "Origin",
            "Content-Type",
            "Content-Length",
        }

        headers = {}
        for key in safe_header_names:
            if key in request.headers:
                headers[key] = request.headers[key]

        return headers

    def _get_client_ip(self) -> str:
        """Get client IP address, respecting proxy headers."""
        # Check X-Forwarded-For
        if request.headers.get("X-Forwarded-For"):
            # Take the first IP in the list
            return request.headers["X-Forwarded-For"].split(",")[0].strip()

        # Check X-Real-IP
        if request.headers.get("X-Real-IP"):
            return request.headers["X-Real-IP"]

        return request.remote_addr or ""
