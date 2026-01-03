"""
Logging handler for Error Explorer Flask integration.

Captures log messages as breadcrumbs and error events.
"""

import logging
from typing import Any, Dict

from error_explorer import Breadcrumb, BreadcrumbType, BreadcrumbLevel


class ErrorExplorerHandler(logging.Handler):
    """
    Logging handler that sends log messages to Error Explorer.

    - DEBUG, INFO, WARNING levels are added as breadcrumbs
    - ERROR, CRITICAL levels are captured as error events

    Usage:
        import logging
        from error_explorer_flask import ErrorExplorerHandler

        handler = ErrorExplorerHandler(level=logging.DEBUG)
        logging.getLogger().addHandler(handler)
    """

    # Map Python log levels to Error Explorer breadcrumb levels
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
        super().__init__(level)
        self.capture_errors = capture_errors
        self.capture_breadcrumbs = capture_breadcrumbs

    def emit(self, record: logging.LogRecord) -> None:
        """Emit a log record."""
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
            self.handleError(record)

    def _capture_error(self, client: Any, record: logging.LogRecord) -> None:
        """Capture log record as error event."""
        from error_explorer import CaptureContext

        # Check if there's exception info
        if record.exc_info and record.exc_info[1] is not None:
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
            # Use "fatal" for CRITICAL to get "critical" severity in webhook
            level = "fatal" if record.levelno >= logging.CRITICAL else "error"
            client.capture_message(
                record.getMessage(),
                level=level,
            )

            # Also add as breadcrumb for context
            self._add_breadcrumb(client, record)

    def _add_breadcrumb(self, client: Any, record: logging.LogRecord) -> None:
        """Add log record as breadcrumb."""
        level = self.LEVEL_MAP.get(record.levelno, BreadcrumbLevel.INFO)

        data: Dict[str, Any] = {
            "logger": record.name,
        }

        # Add location info
        if record.pathname and record.lineno:
            data["location"] = f"{record.filename}:{record.lineno}"

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
