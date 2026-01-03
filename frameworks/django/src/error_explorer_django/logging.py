"""
Django logging handler for Error Explorer.

Captures log messages as breadcrumbs and errors as exceptions.
"""

import logging
from typing import Any, Dict, Optional

from error_explorer import Breadcrumb, BreadcrumbType, BreadcrumbLevel


class ErrorExplorerHandler(logging.Handler):
    """
    Logging handler that sends logs to Error Explorer.

    - DEBUG, INFO, WARNING logs are captured as breadcrumbs
    - ERROR, CRITICAL logs are captured as error events

    Usage:
        LOGGING = {
            'version': 1,
            'handlers': {
                'error_explorer': {
                    'class': 'error_explorer_django.logging.ErrorExplorerHandler',
                    'level': 'DEBUG',
                },
            },
            'loggers': {
                'django': {
                    'handlers': ['error_explorer'],
                    'level': 'INFO',
                },
                'myapp': {
                    'handlers': ['error_explorer'],
                    'level': 'DEBUG',
                },
            },
        }
    """

    # Mapping from Python logging levels to Error Explorer breadcrumb levels
    LEVEL_MAP: Dict[int, BreadcrumbLevel] = {
        logging.DEBUG: BreadcrumbLevel.DEBUG,
        logging.INFO: BreadcrumbLevel.INFO,
        logging.WARNING: BreadcrumbLevel.WARNING,
        logging.ERROR: BreadcrumbLevel.ERROR,
        logging.CRITICAL: BreadcrumbLevel.FATAL,
    }

    def __init__(
        self,
        level: int = logging.NOTSET,
        capture_errors: bool = True,
        capture_breadcrumbs: bool = True,
    ) -> None:
        """
        Initialize the handler.

        Args:
            level: Minimum log level to capture
            capture_errors: Whether to capture ERROR/CRITICAL as events
            capture_breadcrumbs: Whether to capture other levels as breadcrumbs
        """
        super().__init__(level)
        self.capture_errors = capture_errors
        self.capture_breadcrumbs = capture_breadcrumbs

    def emit(self, record: logging.LogRecord) -> None:
        """
        Emit a log record.

        Args:
            record: The log record to process
        """
        from error_explorer import ErrorExplorer

        if not ErrorExplorer.is_initialized():
            return

        client = ErrorExplorer.get_client()
        if client is None:
            return

        try:
            if record.levelno >= logging.ERROR and self.capture_errors:
                self._capture_error(client, record)
            elif self.capture_breadcrumbs:
                self._add_breadcrumb(client, record)
        except Exception:
            # Never let logging errors crash the application
            self.handleError(record)

    def _add_breadcrumb(self, client: Any, record: logging.LogRecord) -> None:
        """Add a log record as a breadcrumb."""
        level = self.LEVEL_MAP.get(record.levelno, BreadcrumbLevel.INFO)

        data: Dict[str, Any] = {
            "logger": record.name,
        }

        # Add extra data from record
        if hasattr(record, "args") and record.args:
            try:
                data["args"] = str(record.args)
            except Exception:
                pass

        # Add location info
        if record.pathname and record.lineno:
            data["location"] = f"{record.pathname}:{record.lineno}"

        # Add function name
        if record.funcName:
            data["function"] = record.funcName

        client.add_breadcrumb(Breadcrumb(
            message=self.format(record) if self.formatter else record.getMessage(),
            category=f"logging.{record.name}",
            type=BreadcrumbType.DEBUG,
            level=level,
            data=data,
        ))

    def _capture_error(self, client: Any, record: logging.LogRecord) -> None:
        """Capture an error log as an exception event."""
        from error_explorer import CaptureContext

        # If there's an exception attached, capture it
        if record.exc_info and record.exc_info[1]:
            client.capture_exception(
                record.exc_info[1],
                CaptureContext(
                    tags={
                        "logger": record.name,
                        "log_level": record.levelname,
                    },
                    extra={
                        "log_message": record.getMessage(),
                        "pathname": record.pathname,
                        "lineno": record.lineno,
                        "funcName": record.funcName,
                    },
                ),
            )
        else:
            # No exception, just capture as a message
            level = "critical" if record.levelno >= logging.CRITICAL else "error"
            client.capture_message(
                record.getMessage(),
                level=level,
            )

            # Also add as breadcrumb for context
            self._add_breadcrumb(client, record)
