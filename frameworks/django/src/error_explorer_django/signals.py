"""
Django signals integration for Error Explorer.

Captures various Django signals as breadcrumbs for better error context.
"""

from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)

_signals_connected = False


def setup_signals() -> None:
    """
    Connect to Django signals for automatic breadcrumb capture.

    This should be called once during app initialization.
    """
    global _signals_connected

    if _signals_connected:
        return

    _connect_auth_signals()
    _connect_db_signals()
    _connect_cache_signals()

    _signals_connected = True


def _connect_auth_signals() -> None:
    """Connect to Django auth signals."""
    try:
        from django.contrib.auth.signals import (
            user_logged_in,
            user_logged_out,
            user_login_failed,
        )

        user_logged_in.connect(_on_user_logged_in)
        user_logged_out.connect(_on_user_logged_out)
        user_login_failed.connect(_on_user_login_failed)
    except ImportError:
        # django.contrib.auth not installed
        pass


def _connect_db_signals() -> None:
    """Connect to Django database signals."""
    try:
        from django.db.backends.signals import connection_created
        from django.db.models.signals import pre_save, post_save, pre_delete, post_delete

        connection_created.connect(_on_connection_created)
        # Note: model signals are too noisy, only connect if explicitly configured
    except ImportError:
        pass


def _connect_cache_signals() -> None:
    """Connect to Django cache signals if available."""
    # Django doesn't have built-in cache signals, but we could hook into
    # cache backends if needed in the future
    pass


# Auth signal handlers
def _on_user_logged_in(
    sender: Any, request: Any, user: Any, **kwargs: Any
) -> None:
    """Handle user login."""
    from error_explorer import ErrorExplorer, Breadcrumb, BreadcrumbType

    if not ErrorExplorer.is_initialized():
        return

    client = ErrorExplorer.get_client()
    if client is None:
        return

    username = getattr(user, "username", str(user.pk) if hasattr(user, "pk") else "unknown")

    client.add_breadcrumb(Breadcrumb(
        message=f"User logged in: {username}",
        category="auth",
        type=BreadcrumbType.USER,
        level="info",
        data={
            "user_id": str(user.pk) if hasattr(user, "pk") else None,
            "username": username,
            "action": "login",
        },
    ))


def _on_user_logged_out(
    sender: Any, request: Any, user: Any, **kwargs: Any
) -> None:
    """Handle user logout."""
    from error_explorer import ErrorExplorer, Breadcrumb, BreadcrumbType

    if not ErrorExplorer.is_initialized():
        return

    if user is None:
        return

    client = ErrorExplorer.get_client()
    if client is None:
        return

    username = getattr(user, "username", str(user.pk) if hasattr(user, "pk") else "unknown")

    client.add_breadcrumb(Breadcrumb(
        message=f"User logged out: {username}",
        category="auth",
        type=BreadcrumbType.USER,
        level="info",
        data={
            "user_id": str(user.pk) if hasattr(user, "pk") else None,
            "username": username,
            "action": "logout",
        },
    ))

    # Clear user context
    client.clear_user()


def _on_user_login_failed(
    sender: Any,
    credentials: Optional[dict] = None,
    request: Any = None,
    **kwargs: Any,
) -> None:
    """Handle failed login attempt."""
    from error_explorer import ErrorExplorer, Breadcrumb, BreadcrumbType

    if not ErrorExplorer.is_initialized():
        return

    client = ErrorExplorer.get_client()
    if client is None:
        return

    # Don't include actual credentials for security
    username = credentials.get("username", "unknown") if credentials else "unknown"

    client.add_breadcrumb(Breadcrumb(
        message=f"Login failed for: {username}",
        category="auth",
        type=BreadcrumbType.USER,
        level="warning",
        data={
            "action": "login_failed",
        },
    ))


# Database signal handlers
def _on_connection_created(
    sender: Any, connection: Any, **kwargs: Any
) -> None:
    """Handle database connection creation."""
    from error_explorer import ErrorExplorer, Breadcrumb, BreadcrumbType

    if not ErrorExplorer.is_initialized():
        return

    client = ErrorExplorer.get_client()
    if client is None:
        return

    alias = getattr(connection, "alias", "default")
    vendor = getattr(connection, "vendor", "unknown")

    client.add_breadcrumb(Breadcrumb(
        message=f"Database connection created: {alias}",
        category="db",
        type=BreadcrumbType.QUERY,
        level="debug",
        data={
            "alias": alias,
            "vendor": vendor,
        },
    ))
