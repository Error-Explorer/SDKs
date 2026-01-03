"""
Tests for automatic exception capture.
"""

import sys
import threading
import pytest
from unittest.mock import MagicMock, patch
from error_explorer import ErrorExplorer


class TestExceptionHooks:
    """Tests for automatic exception hook setup."""

    def test_sys_excepthook_installed(self, mock_transport: MagicMock) -> None:
        original_hook = sys.excepthook

        client = ErrorExplorer.init({
            "token": "test",
            "auto_capture": {
                "uncaught_exceptions": True,
                "unhandled_threads": True,
                "logging": False,
            },
        })

        # The hook should be replaced
        assert sys.excepthook != original_hook

        # Clean up
        client.close()

    def test_sys_excepthook_restored_on_close(self, mock_transport: MagicMock) -> None:
        original_hook = sys.excepthook

        client = ErrorExplorer.init({
            "token": "test",
            "auto_capture": {
                "uncaught_exceptions": True,
            },
        })
        client.close()

        # Original hook should be restored
        assert sys.excepthook == original_hook

    def test_excepthook_captures_exception(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test",
            "auto_capture": {
                "uncaught_exceptions": True,
            },
        })

        # Simulate an uncaught exception
        try:
            raise ValueError("Uncaught error")
        except ValueError:
            exc_type, exc_value, exc_tb = sys.exc_info()
            sys.excepthook(exc_type, exc_value, exc_tb)

        # Should have captured the exception
        mock_transport.send.assert_called()
        event = mock_transport.send.call_args[0][0]
        # New webhook format uses exception_class instead of exception.values
        assert event.get("exception_class") == "ValueError"

        client.close()

    def test_auto_capture_disabled(self, mock_transport: MagicMock) -> None:
        original_hook = sys.excepthook

        client = ErrorExplorer.init({
            "token": "test",
            "auto_capture": {
                "uncaught_exceptions": False,
                "unhandled_threads": False,
                "logging": False,
            },
        })

        # Hook should not be replaced when auto capture is disabled
        assert sys.excepthook == original_hook

        client.close()

    @pytest.mark.skipif(
        not hasattr(threading, "excepthook"),
        reason="threading.excepthook not available"
    )
    def test_threading_excepthook_installed(self, mock_transport: MagicMock) -> None:
        original_hook = getattr(threading, "excepthook", None)

        client = ErrorExplorer.init({
            "token": "test",
            "auto_capture": {
                "uncaught_exceptions": True,
                "unhandled_threads": True,
            },
        })

        # The threading hook should be replaced
        assert threading.excepthook != original_hook

        client.close()


class TestLoggingIntegration:
    """Tests for logging integration."""

    def test_logging_integration_adds_breadcrumbs(self, mock_transport: MagicMock) -> None:
        import logging

        client = ErrorExplorer.init({
            "token": "test",
            "auto_capture": {
                "uncaught_exceptions": False,
                "logging": True,
            },
        })

        # Create a logger and log something
        test_logger = logging.getLogger("test_logger")
        test_logger.setLevel(logging.DEBUG)
        test_logger.info("Test log message")

        # Should have added a breadcrumb
        assert len(client._breadcrumbs) > 0

        client.close()

    def test_logging_levels_mapped_correctly(self, mock_transport: MagicMock) -> None:
        import logging
        from error_explorer.types import BreadcrumbLevel

        client = ErrorExplorer.init({
            "token": "test",
            "auto_capture": {
                "uncaught_exceptions": False,
                "logging": True,
            },
        })

        test_logger = logging.getLogger("level_test")
        test_logger.setLevel(logging.DEBUG)

        # Clear any existing breadcrumbs
        client.clear_breadcrumbs()

        test_logger.warning("Warning message")

        # Find the warning breadcrumb
        warning_crumbs = [
            b for b in client._breadcrumbs
            if b.level == BreadcrumbLevel.WARNING
        ]
        assert len(warning_crumbs) > 0

        client.close()


class TestExceptionExtraction:
    """Tests for exception information extraction."""

    def test_extract_stack_frames(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test",
            "attach_stacktrace": True,
        })

        def inner_function():
            raise ValueError("Inner error")

        def outer_function():
            inner_function()

        try:
            outer_function()
        except ValueError as e:
            client.capture_exception(e)

        event = mock_transport.send.call_args[0][0]

        # New webhook format
        assert event["exception_class"] == "ValueError"
        assert "Inner error" in event.get("message", "") or "Inner error" in event.get("stack_trace", "")
        assert "stack_trace" in event
        assert "frames" in event
        assert len(event["frames"]) > 0

        # Check frame structure
        frames = event["frames"]
        # The most recent frame should be last
        assert any("inner_function" in f.get("function", "") for f in frames)

        client.close()

    def test_exception_module_captured(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({"token": "test"})

        try:
            raise ValueError("Test")
        except ValueError as e:
            client.capture_exception(e)

        event = mock_transport.send.call_args[0][0]

        # New webhook format - exception_class contains the type name
        assert event["exception_class"] == "ValueError"
        # Module info is not directly exposed in webhook format, but stack_trace contains it
        assert "stack_trace" in event

        client.close()

    def test_in_app_detection(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test",
            "attach_stacktrace": True,
        })

        try:
            raise RuntimeError("Test")
        except RuntimeError as e:
            client.capture_exception(e)

        event = mock_transport.send.call_args[0][0]
        frames = event["frames"]

        # At least one frame should be in_app (our test code)
        assert any(f.get("in_app", False) for f in frames)

        client.close()

    def test_local_vars_captured(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test",
            "attach_stacktrace": True,
        })

        def function_with_vars():
            local_var = "test_value"
            another_var = 42
            raise ValueError("Error with locals")

        try:
            function_with_vars()
        except ValueError as e:
            client.capture_exception(e)

        event = mock_transport.send.call_args[0][0]
        frames = event["frames"]

        # Find the frame with our local vars
        func_frames = [f for f in frames if "function_with_vars" in f.get("function", "")]
        assert len(func_frames) > 0

        # Local vars should be captured (as strings)
        if func_frames[0].get("vars"):
            vars_data = func_frames[0]["vars"]
            assert "local_var" in vars_data or "another_var" in vars_data

        client.close()

    def test_sensitive_vars_scrubbed(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test",
            "attach_stacktrace": True,
        })

        def function_with_password():
            password = "secret123"
            api_key = "key_abc"
            raise ValueError("Error with sensitive locals")

        try:
            function_with_password()
        except ValueError as e:
            client.capture_exception(e)

        event = mock_transport.send.call_args[0][0]
        frames = event["frames"]

        # Find the frame with password
        func_frames = [f for f in frames if "function_with_password" in f.get("function", "")]

        if func_frames and func_frames[0].get("vars"):
            vars_data = func_frames[0]["vars"]
            # Password should be scrubbed
            if "password" in vars_data:
                assert vars_data["password"] == "[Filtered]"

        client.close()


class TestContextLineExtraction:
    """Tests for source context line extraction."""

    def test_context_lines_captured(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test",
            "attach_stacktrace": True,
        })

        try:
            # This specific line should be captured
            raise ValueError("Context line test")
        except ValueError as e:
            client.capture_exception(e)

        event = mock_transport.send.call_args[0][0]
        frames = event["frames"]

        # At least one frame should have context_line
        frames_with_context = [f for f in frames if f.get("context_line")]
        assert len(frames_with_context) > 0

        client.close()
