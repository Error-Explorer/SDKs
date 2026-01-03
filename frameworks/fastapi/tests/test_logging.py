"""
Tests for FastAPI logging handler.
"""

import pytest
import logging
from unittest.mock import MagicMock

from error_explorer_fastapi import ErrorExplorerHandler
from error_explorer import BreadcrumbLevel


class TestErrorExplorerHandler:
    """Tests for ErrorExplorerHandler."""

    @pytest.fixture
    def handler(self):
        """Create handler instance."""
        return ErrorExplorerHandler(level=logging.DEBUG)

    @pytest.fixture
    def logger(self, handler):
        """Create logger with handler."""
        logger = logging.getLogger("test_fastapi_logger")
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        yield logger
        logger.removeHandler(handler)

    def test_handler_adds_debug_breadcrumb(
        self, logger, initialized_client
    ):
        """Test that DEBUG logs are added as breadcrumbs."""
        logger.debug("Debug message")

        breadcrumbs = initialized_client._breadcrumbs
        debug_crumbs = [b for b in breadcrumbs if "Debug message" in b.message]
        assert len(debug_crumbs) == 1
        assert debug_crumbs[0].level == BreadcrumbLevel.DEBUG

    def test_handler_adds_info_breadcrumb(
        self, logger, initialized_client
    ):
        """Test that INFO logs are added as breadcrumbs."""
        logger.info("Info message")

        breadcrumbs = initialized_client._breadcrumbs
        info_crumbs = [b for b in breadcrumbs if "Info message" in b.message]
        assert len(info_crumbs) == 1
        assert info_crumbs[0].level == BreadcrumbLevel.INFO

    def test_handler_adds_warning_breadcrumb(
        self, logger, initialized_client
    ):
        """Test that WARNING logs are added as breadcrumbs."""
        logger.warning("Warning message")

        breadcrumbs = initialized_client._breadcrumbs
        warning_crumbs = [b for b in breadcrumbs if "Warning message" in b.message]
        assert len(warning_crumbs) == 1
        assert warning_crumbs[0].level == BreadcrumbLevel.WARNING

    def test_handler_captures_error_as_event(
        self, logger, initialized_client, mock_transport
    ):
        """Test that ERROR logs are captured as events."""
        logger.error("Error message")

        mock_transport.send.assert_called_once()
        event = mock_transport.send.call_args[0][0]
        assert event["severity"] == "error"
        assert "Error message" in event["message"]

    def test_handler_captures_critical_as_event(
        self, logger, initialized_client, mock_transport
    ):
        """Test that CRITICAL logs are captured as events."""
        logger.critical("Critical message")

        mock_transport.send.assert_called_once()
        event = mock_transport.send.call_args[0][0]
        # Python SDK maps "fatal" level to "critical" severity
        assert event["severity"] == "critical"

    def test_handler_captures_exception_with_traceback(
        self, logger, initialized_client, mock_transport
    ):
        """Test that exceptions are captured with traceback."""
        try:
            raise ValueError("Test exception")
        except ValueError:
            logger.exception("Error with exception")

        mock_transport.send.assert_called_once()
        event = mock_transport.send.call_args[0][0]
        assert event["exception_class"] == "ValueError"
        assert "Test exception" in event["message"]

    def test_handler_includes_logger_name_in_category(
        self, logger, initialized_client
    ):
        """Test that logger name is included in category."""
        logger.info("Test message")

        breadcrumbs = initialized_client._breadcrumbs
        assert len(breadcrumbs) >= 1
        assert "test_fastapi_logger" in breadcrumbs[-1].category

    def test_handler_with_capture_errors_disabled(
        self, initialized_client, mock_transport
    ):
        """Test handler with capture_errors disabled."""
        handler = ErrorExplorerHandler(
            level=logging.DEBUG,
            capture_errors=False,
        )
        logger = logging.getLogger("test_no_errors_fastapi")
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)

        logger.error("Error that should not be captured")

        mock_transport.send.assert_not_called()

        logger.removeHandler(handler)

    def test_handler_with_capture_breadcrumbs_disabled(
        self, initialized_client, mock_transport
    ):
        """Test handler with capture_breadcrumbs disabled."""
        handler = ErrorExplorerHandler(
            level=logging.DEBUG,
            capture_breadcrumbs=False,
        )
        logger = logging.getLogger("test_no_breadcrumbs_fastapi")
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)

        logger.info("Info that should not be breadcrumb")

        breadcrumbs = initialized_client._breadcrumbs
        info_crumbs = [b for b in breadcrumbs if "Info that should not" in b.message]
        assert len(info_crumbs) == 0

        logger.removeHandler(handler)

    def test_handler_does_nothing_when_not_initialized(self, handler):
        """Test that handler does nothing when Error Explorer is not initialized."""
        from error_explorer import ErrorExplorer
        ErrorExplorer.reset()

        logger = logging.getLogger("test_uninit_fastapi")
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)

        # Should not raise any errors
        logger.info("Message when not initialized")
        logger.error("Error when not initialized")

        logger.removeHandler(handler)

    def test_handler_includes_location_data(
        self, logger, initialized_client
    ):
        """Test that location info is included in breadcrumb data."""
        logger.info("Message with location")

        breadcrumbs = initialized_client._breadcrumbs
        last_crumb = breadcrumbs[-1]

        assert "location" in last_crumb.data
        assert "test_logging.py" in last_crumb.data["location"]

    def test_level_mapping(self, handler):
        """Test that log levels are correctly mapped."""
        assert handler.LEVEL_MAP[logging.DEBUG] == BreadcrumbLevel.DEBUG
        assert handler.LEVEL_MAP[logging.INFO] == BreadcrumbLevel.INFO
        assert handler.LEVEL_MAP[logging.WARNING] == BreadcrumbLevel.WARNING
        assert handler.LEVEL_MAP[logging.ERROR] == BreadcrumbLevel.ERROR
        assert handler.LEVEL_MAP[logging.CRITICAL] == BreadcrumbLevel.FATAL
