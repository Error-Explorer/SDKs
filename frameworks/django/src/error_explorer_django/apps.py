"""
Django app configuration for Error Explorer.
"""

from django.apps import AppConfig
from django.conf import settings
from typing import Any, Dict, Optional


class ErrorExplorerConfig(AppConfig):
    """Django app configuration that auto-initializes Error Explorer."""

    name = "error_explorer_django"
    verbose_name = "Error Explorer"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self) -> None:
        """Initialize Error Explorer when Django starts."""
        from error_explorer import ErrorExplorer

        config = self._get_config()

        if not config.get("token"):
            # Skip initialization if no token is configured
            return

        # Don't initialize in management commands unless explicitly enabled
        if self._is_management_command() and not config.get("capture_cli", False):
            return

        # Initialize Error Explorer
        ErrorExplorer.init({
            "token": config.get("token"),
            "endpoint": config.get("endpoint"),
            "hmac_secret": config.get("hmac_secret"),
            "project": config.get("project"),
            "environment": config.get("environment", self._get_environment()),
            "release": config.get("release"),
            "debug": config.get("debug", settings.DEBUG),
            "sample_rate": config.get("sample_rate", 1.0),
            "max_breadcrumbs": config.get("max_breadcrumbs", 50),
            "attach_stacktrace": config.get("attach_stacktrace", True),
            "send_default_pii": config.get("send_default_pii", False),
            "scrub_fields": config.get("scrub_fields"),
            "auto_capture": config.get("auto_capture", {
                "uncaught_exceptions": True,
                "unhandled_threads": True,
                "logging": config.get("capture_logging", True),
            }),
        })

        # Setup Django signals for breadcrumbs
        if config.get("capture_signals", True):
            from .signals import setup_signals
            setup_signals()

    def _get_config(self) -> Dict[str, Any]:
        """Get Error Explorer configuration from Django settings."""
        return getattr(settings, "ERROR_EXPLORER", {})

    def _get_environment(self) -> str:
        """Determine environment from Django settings."""
        if settings.DEBUG:
            return "development"
        return getattr(settings, "ENVIRONMENT", "production")

    def _is_management_command(self) -> bool:
        """Check if running in a management command."""
        import sys
        return len(sys.argv) > 1 and sys.argv[0].endswith("manage.py")
