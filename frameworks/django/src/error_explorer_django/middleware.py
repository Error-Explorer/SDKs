"""
Django middleware for Error Explorer.

Captures request/response information as breadcrumbs and handles exceptions.
"""

from typing import Any, Callable, Dict, Optional
from datetime import timezone, datetime
import logging

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.core.exceptions import PermissionDenied
from django.http import Http404


logger = logging.getLogger(__name__)


class ErrorExplorerMiddleware:
    """
    Middleware that integrates Error Explorer with Django.

    - Captures request information as breadcrumbs
    - Sets user context from Django auth
    - Captures unhandled exceptions
    - Adds response status as breadcrumb

    Usage:
        MIDDLEWARE = [
            'error_explorer_django.middleware.ErrorExplorerMiddleware',
            ...  # Should be early in the list to catch all errors
        ]
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response
        self._config = getattr(settings, "ERROR_EXPLORER", {})

    def __call__(self, request: HttpRequest) -> HttpResponse:
        """Process request/response cycle."""
        from error_explorer import ErrorExplorer

        if not ErrorExplorer.is_initialized():
            return self.get_response(request)

        # Add request breadcrumb
        self._add_request_breadcrumb(request)

        # Set user context
        self._set_user_context(request)

        # Set request context
        self._set_request_context(request)

        try:
            response = self.get_response(request)
        except Exception as exc:
            self._handle_exception(request, exc)
            raise

        # Add response breadcrumb
        self._add_response_breadcrumb(request, response)

        return response

    def process_exception(
        self, request: HttpRequest, exception: Exception
    ) -> Optional[HttpResponse]:
        """
        Called when a view raises an exception.

        This is called before Django's exception handling, allowing us to
        capture the exception before it's potentially swallowed.
        """
        self._handle_exception(request, exception)
        return None  # Let Django continue normal exception handling

    def _add_request_breadcrumb(self, request: HttpRequest) -> None:
        """Add breadcrumb for incoming request."""
        from error_explorer import ErrorExplorer, Breadcrumb, BreadcrumbType

        client = ErrorExplorer.get_client()
        if client is None:
            return

        # Get view name if available
        view_name = None
        if hasattr(request, "resolver_match") and request.resolver_match:
            view_name = request.resolver_match.view_name

        data: Dict[str, Any] = {
            "method": request.method,
            "path": request.path,
            "query_string": request.META.get("QUERY_STRING", ""),
        }

        if view_name:
            data["view"] = view_name

        # Add safe headers
        safe_headers = self._get_safe_headers(request)
        if safe_headers:
            data["headers"] = safe_headers

        client.add_breadcrumb(Breadcrumb(
            message=f"{request.method} {request.path}",
            category="http.request",
            type=BreadcrumbType.HTTP,
            data=data,
        ))

    def _add_response_breadcrumb(
        self, request: HttpRequest, response: HttpResponse
    ) -> None:
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
                "reason": response.reason_phrase,
                "content_type": response.get("Content-Type", ""),
            },
        ))

    def _set_user_context(self, request: HttpRequest) -> None:
        """Set user context from Django auth."""
        from error_explorer import ErrorExplorer, User

        if not self._config.get("capture_user", True):
            return

        client = ErrorExplorer.get_client()
        if client is None:
            return

        user = getattr(request, "user", None)
        if user is None or not hasattr(user, "is_authenticated"):
            return

        if not user.is_authenticated:
            return

        user_data: Dict[str, Any] = {}

        # Get user ID
        if hasattr(user, "pk"):
            user_data["id"] = str(user.pk)

        # Get email if PII is allowed
        if self._config.get("send_default_pii", False):
            if hasattr(user, "email") and user.email:
                user_data["email"] = user.email

        # Get username
        if hasattr(user, "get_username"):
            user_data["username"] = user.get_username()

        if user_data:
            client.set_user(User(**user_data))

    def _set_request_context(self, request: HttpRequest) -> None:
        """Set request context for error events."""
        from error_explorer import ErrorExplorer

        client = ErrorExplorer.get_client()
        if client is None:
            return

        context: Dict[str, Any] = {
            "url": request.build_absolute_uri(),
            "method": request.method,
            "query_string": request.META.get("QUERY_STRING", ""),
        }

        # Add headers (filtered for security)
        context["headers"] = self._get_safe_headers(request)

        # Add client IP
        context["ip"] = self._get_client_ip(request)

        # Add user agent
        if "HTTP_USER_AGENT" in request.META:
            context["user_agent"] = request.META["HTTP_USER_AGENT"]

        client.set_context("request", context)

    def _handle_exception(
        self, request: HttpRequest, exception: Exception
    ) -> None:
        """Handle exception and send to Error Explorer."""
        from error_explorer import ErrorExplorer, CaptureContext

        client = ErrorExplorer.get_client()
        if client is None:
            return

        # Don't capture 404s unless configured
        if isinstance(exception, Http404):
            if not self._config.get("capture_404", False):
                return

        # Don't capture 403s unless configured
        if isinstance(exception, PermissionDenied):
            if not self._config.get("capture_403", False):
                return

        # Capture the exception
        client.capture_exception(
            exception,
            CaptureContext(
                tags={
                    "django.view": self._get_view_name(request),
                    "django.method": request.method or "UNKNOWN",
                },
            ),
        )

    def _get_safe_headers(self, request: HttpRequest) -> Dict[str, str]:
        """Get headers that are safe to include (no sensitive data)."""
        safe_header_names = {
            "HTTP_HOST",
            "HTTP_USER_AGENT",
            "HTTP_ACCEPT",
            "HTTP_ACCEPT_LANGUAGE",
            "HTTP_ACCEPT_ENCODING",
            "HTTP_REFERER",
            "HTTP_ORIGIN",
            "CONTENT_TYPE",
            "CONTENT_LENGTH",
        }

        headers = {}
        for key in safe_header_names:
            if key in request.META:
                # Convert HTTP_HEADER_NAME to Header-Name
                header_name = key.replace("HTTP_", "").replace("_", "-").title()
                headers[header_name] = request.META[key]

        return headers

    def _get_client_ip(self, request: HttpRequest) -> str:
        """Get client IP address, respecting proxy headers."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            # Take the first IP in the list
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "")

    def _get_view_name(self, request: HttpRequest) -> str:
        """Get the view name from the request."""
        if hasattr(request, "resolver_match") and request.resolver_match:
            return request.resolver_match.view_name or "unknown"
        return "unknown"
