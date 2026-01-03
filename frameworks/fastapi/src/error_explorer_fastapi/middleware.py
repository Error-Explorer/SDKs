"""
FastAPI middleware for Error Explorer.

Captures request/response information as breadcrumbs and handles exceptions.
"""

from typing import Any, Callable, Dict, Optional
from datetime import timezone, datetime
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp
from fastapi import FastAPI, HTTPException


logger = logging.getLogger(__name__)


class ErrorExplorerMiddleware(BaseHTTPMiddleware):
    """
    Middleware that integrates Error Explorer with FastAPI.

    - Captures request information as breadcrumbs
    - Sets user context
    - Captures unhandled exceptions
    - Adds response status as breadcrumb

    Usage:
        from fastapi import FastAPI
        from error_explorer_fastapi import ErrorExplorerMiddleware

        app = FastAPI()
        app.add_middleware(ErrorExplorerMiddleware)
    """

    def __init__(
        self,
        app: ASGIApp,
        capture_user: bool = True,
        send_default_pii: bool = False,
        capture_404: bool = False,
        capture_403: bool = False,
    ) -> None:
        super().__init__(app)
        self.capture_user = capture_user
        self.send_default_pii = send_default_pii
        self.capture_404 = capture_404
        self.capture_403 = capture_403

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Any]
    ) -> Response:
        """Process request/response cycle."""
        from error_explorer import ErrorExplorer

        if not ErrorExplorer.is_initialized():
            return await call_next(request)

        # Add request breadcrumb
        self._add_request_breadcrumb(request)

        # Set user context
        await self._set_user_context(request)

        # Set request context
        self._set_request_context(request)

        try:
            response = await call_next(request)
        except Exception as exc:
            self._handle_exception(request, exc)
            raise

        # Add response breadcrumb
        self._add_response_breadcrumb(request, response)

        return response

    def _add_request_breadcrumb(self, request: Request) -> None:
        """Add breadcrumb for incoming request."""
        from error_explorer import ErrorExplorer, Breadcrumb, BreadcrumbType

        client = ErrorExplorer.get_client()
        if client is None:
            return

        data: Dict[str, Any] = {
            "method": request.method,
            "path": request.url.path,
            "query_string": str(request.query_params),
        }

        # Add route name if available
        if request.scope.get("route"):
            route = request.scope["route"]
            if hasattr(route, "name") and route.name:
                data["route"] = route.name

        # Add safe headers
        safe_headers = self._get_safe_headers(request)
        if safe_headers:
            data["headers"] = safe_headers

        client.add_breadcrumb(Breadcrumb(
            message=f"{request.method} {request.url.path}",
            category="http.request",
            type=BreadcrumbType.HTTP,
            data=data,
        ))

    def _add_response_breadcrumb(
        self, request: Request, response: Response
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

        content_type = response.headers.get("content-type", "")

        client.add_breadcrumb(Breadcrumb(
            message=f"Response {response.status_code}",
            category="http.response",
            type=BreadcrumbType.HTTP,
            level=level,
            data={
                "status_code": response.status_code,
                "content_type": content_type,
            },
        ))

    async def _set_user_context(self, request: Request) -> None:
        """Set user context from request state."""
        from error_explorer import ErrorExplorer, User

        if not self.capture_user:
            return

        client = ErrorExplorer.get_client()
        if client is None:
            return

        # Try to get user from request state (common pattern with auth middleware)
        user = getattr(request.state, "user", None)
        if user is None:
            return

        user_data: Dict[str, Any] = {}

        # Get user ID
        if hasattr(user, "id"):
            user_data["id"] = str(user.id)

        # Get email if PII is allowed
        if self.send_default_pii:
            if hasattr(user, "email") and user.email:
                user_data["email"] = user.email

        # Get username
        if hasattr(user, "username"):
            user_data["username"] = user.username

        if user_data:
            client.set_user(User(**user_data))

    def _set_request_context(self, request: Request) -> None:
        """Set request context for error events."""
        from error_explorer import ErrorExplorer

        client = ErrorExplorer.get_client()
        if client is None:
            return

        context: Dict[str, Any] = {
            "url": str(request.url),
            "method": request.method,
            "query_string": str(request.query_params),
        }

        # Add headers (filtered for security)
        context["headers"] = self._get_safe_headers(request)

        # Add client IP
        context["ip"] = self._get_client_ip(request)

        # Add user agent
        if "user-agent" in request.headers:
            context["user_agent"] = request.headers["user-agent"]

        client.set_context("request", context)

    def _handle_exception(
        self, request: Request, exception: Exception
    ) -> None:
        """Handle exception and send to Error Explorer."""
        from error_explorer import ErrorExplorer, CaptureContext

        client = ErrorExplorer.get_client()
        if client is None:
            return

        # Check for HTTP exceptions
        if isinstance(exception, HTTPException):
            if exception.status_code == 404 and not self.capture_404:
                return
            if exception.status_code == 403 and not self.capture_403:
                return

        # Build tags
        tags: Dict[str, str] = {
            "fastapi.method": request.method or "UNKNOWN",
        }

        if request.scope.get("route"):
            route = request.scope["route"]
            if hasattr(route, "name") and route.name:
                tags["fastapi.route"] = route.name

        client.capture_exception(
            exception,
            CaptureContext(tags=tags),
        )

    def _get_safe_headers(self, request: Request) -> Dict[str, str]:
        """Get headers that are safe to include (no sensitive data)."""
        safe_header_names = {
            "host",
            "user-agent",
            "accept",
            "accept-language",
            "accept-encoding",
            "referer",
            "origin",
            "content-type",
            "content-length",
        }

        headers = {}
        for key in safe_header_names:
            if key in request.headers:
                headers[key.title()] = request.headers[key]

        return headers

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address, respecting proxy headers."""
        # Check X-Forwarded-For
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        # Check X-Real-IP
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fallback to client host
        if request.client:
            return request.client.host

        return ""


def setup_error_explorer(
    app: FastAPI,
    capture_user: bool = True,
    send_default_pii: bool = False,
    capture_404: bool = False,
    capture_403: bool = False,
) -> None:
    """
    Set up Error Explorer for a FastAPI application.

    This is a convenience function that adds the middleware and sets up
    exception handlers.

    Usage:
        from fastapi import FastAPI
        from error_explorer import ErrorExplorer
        from error_explorer_fastapi import setup_error_explorer

        app = FastAPI()
        ErrorExplorer.init({"token": "your-token"})
        setup_error_explorer(app)
    """
    app.add_middleware(
        ErrorExplorerMiddleware,
        capture_user=capture_user,
        send_default_pii=send_default_pii,
        capture_404=capture_404,
        capture_403=capture_403,
    )
