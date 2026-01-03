"""
Integration tests for Error Explorer SDK.
"""

import pytest
from datetime import datetime
from unittest.mock import MagicMock
from error_explorer import (
    ErrorExplorer,
    Breadcrumb,
    BreadcrumbType,
    CaptureContext,
    User,
)


class TestEndToEndFlow:
    """End-to-end integration tests."""

    def test_complete_error_capture_flow(self, mock_transport: MagicMock) -> None:
        """Test complete flow from initialization to error capture."""
        # Initialize
        client = ErrorExplorer.init({
            "token": "test_token",
            "project": "integration-test",
            "environment": "test",
            "release": "1.0.0",
            "send_default_pii": True,  # Allow PII in test
        })

        # Set user
        client.set_user(User(
            id="user_123",
            email="test@example.com",
            username="testuser",
        ))

        # Set tags
        client.set_tags({
            "version": "1.0.0",
            "feature_flag": "new_checkout",
        })

        # Add breadcrumbs simulating user actions
        client.add_breadcrumb(Breadcrumb(
            message="User logged in",
            category="auth",
            type=BreadcrumbType.USER,
        ))

        client.add_breadcrumb(Breadcrumb(
            message="Navigated to checkout",
            category="navigation",
            type=BreadcrumbType.NAVIGATION,
        ))

        client.add_breadcrumb(Breadcrumb(
            message="API call to /api/cart",
            category="http",
            type=BreadcrumbType.HTTP,
            data={"method": "GET", "status_code": 200},
        ))

        # Capture an error
        try:
            # Simulate checkout error
            raise ValueError("Payment processing failed: Invalid card")
        except ValueError as e:
            result = client.capture_exception(e, CaptureContext(
                extra={"cart_id": "cart_abc123", "total": 99.99},
            ))

        assert result is not None
        mock_transport.send.assert_called_once()

        # Verify the event structure
        event = mock_transport.send.call_args[0][0]

        # Check basic event fields (new webhook format)
        assert event["severity"] == "error"
        assert event["environment"] == "test"
        assert event["release"] == "1.0.0"
        assert event["project"] == "integration-test"

        # Check user
        assert event["user"]["id"] == "user_123"
        assert event["user"]["email"] == "test@example.com"

        # Check tags
        assert event["tags"]["version"] == "1.0.0"
        assert event["tags"]["feature_flag"] == "new_checkout"

        # Check extra data
        assert event["extra"]["cart_id"] == "cart_abc123"
        assert event["extra"]["total"] == 99.99

        # Check breadcrumbs (new format uses list directly)
        assert len(event["breadcrumbs"]) == 3
        assert event["breadcrumbs"][0]["message"] == "User logged in"

        # Check exception (new format uses exception_class and stack_trace)
        assert event["exception_class"] == "ValueError"
        assert "Payment processing failed" in event["message"]

        # Check contexts
        assert "os" in event["contexts"]
        assert "runtime" in event["contexts"]

        # Check SDK info
        assert event["sdk"]["name"] == "error-explorer-python"

    def test_multiple_errors_captured(self, mock_transport: MagicMock) -> None:
        """Test capturing multiple errors in sequence."""
        client = ErrorExplorer.init({"token": "test"})

        errors = [
            ValueError("Error 1"),
            RuntimeError("Error 2"),
            TypeError("Error 3"),
        ]

        for error in errors:
            client.capture_exception(error)

        assert mock_transport.send.call_count == 3

    def test_message_and_exception_capture(self, mock_transport: MagicMock) -> None:
        """Test mixing message and exception captures."""
        client = ErrorExplorer.init({"token": "test"})

        # Capture a message
        client.capture_message("Application started", level="info")

        # Capture an exception
        try:
            raise ValueError("Something went wrong")
        except ValueError as e:
            client.capture_exception(e)

        # Capture another message
        client.capture_message("Operation completed", level="debug")

        assert mock_transport.send.call_count == 3

        # Verify levels (new format uses 'severity')
        calls = mock_transport.send.call_args_list
        assert calls[0][0][0]["severity"] == "info"
        assert calls[1][0][0]["severity"] == "error"
        assert calls[2][0][0]["severity"] == "debug"

    def test_scope_isolation(self, mock_transport: MagicMock) -> None:
        """Test that scope changes are properly isolated."""
        client = ErrorExplorer.init({"token": "test"})

        # Set global user
        client.set_user(User(id="global_user"))
        client.set_tag("global_tag", "global_value")

        # Capture in scope
        with client.push_scope() as scope:
            scope.set_user(User(id="scoped_user"))
            scope.set_tag("scoped_tag", "scoped_value")
            client.capture_message("In scope")

        # Capture outside scope
        client.capture_message("Outside scope")

        calls = mock_transport.send.call_args_list

        # First call should have scoped values
        in_scope_event = calls[0][0][0]
        assert in_scope_event["user"]["id"] == "scoped_user"
        assert in_scope_event["tags"]["scoped_tag"] == "scoped_value"
        assert in_scope_event["tags"]["global_tag"] == "global_value"

        # Second call should have global values only
        outside_scope_event = calls[1][0][0]
        assert outside_scope_event["user"]["id"] == "global_user"
        assert "scoped_tag" not in outside_scope_event["tags"]
        assert outside_scope_event["tags"]["global_tag"] == "global_value"

    def test_breadcrumb_accumulation(self, mock_transport: MagicMock) -> None:
        """Test that breadcrumbs accumulate across captures."""
        client = ErrorExplorer.init({"token": "test"})

        client.add_breadcrumb(Breadcrumb(message="Action 1"))
        client.capture_message("First capture")

        client.add_breadcrumb(Breadcrumb(message="Action 2"))
        client.capture_message("Second capture")

        calls = mock_transport.send.call_args_list

        # First capture has 1 breadcrumb (new format uses list directly)
        assert len(calls[0][0][0]["breadcrumbs"]) == 1

        # Second capture has 2 breadcrumbs
        assert len(calls[1][0][0]["breadcrumbs"]) == 2

    def test_before_send_integration(self, mock_transport: MagicMock) -> None:
        """Test before_send hook in real scenario."""
        dropped_events = []

        def before_send(event):
            # Drop debug messages (new format uses 'severity')
            if event.get("severity") == "debug":
                dropped_events.append(event)
                return None

            # Add custom tag
            event["tags"] = event.get("tags", {})
            event["tags"]["processed"] = "true"
            return event

        client = ErrorExplorer.init({
            "token": "test",
            "before_send": before_send,
        })

        # This should be dropped
        client.capture_message("Debug message", level="debug")

        # This should go through
        client.capture_message("Info message", level="info")

        # Only one event sent
        assert mock_transport.send.call_count == 1

        # The sent event should have the custom tag
        event = mock_transport.send.call_args[0][0]
        assert event["tags"]["processed"] == "true"

        # One event was dropped
        assert len(dropped_events) == 1

    def test_flush_before_close(self, mock_transport: MagicMock) -> None:
        """Test that close properly flushes pending events."""
        client = ErrorExplorer.init({"token": "test"})

        client.capture_message("Test message")
        client.close()

        mock_transport.flush.assert_called()
        mock_transport.close.assert_called()


class TestErrorScenarios:
    """Tests for various error scenarios."""

    def test_chained_exceptions(self, mock_transport: MagicMock) -> None:
        """Test capturing chained exceptions."""
        client = ErrorExplorer.init({"token": "test"})

        try:
            try:
                raise ValueError("Original error")
            except ValueError as e:
                raise RuntimeError("Wrapper error") from e
        except RuntimeError as e:
            client.capture_exception(e)

        event = mock_transport.send.call_args[0][0]
        # New format uses exception_class
        assert event["exception_class"] == "RuntimeError"

    def test_exception_with_no_traceback(self, mock_transport: MagicMock) -> None:
        """Test capturing exception without traceback."""
        client = ErrorExplorer.init({"token": "test"})

        # Create exception without raising
        error = ValueError("No traceback")
        client.capture_exception(error)

        event = mock_transport.send.call_args[0][0]
        # New format uses exception_class
        assert event["exception_class"] == "ValueError"
        # Should still capture even without stack trace

    def test_unicode_in_error_message(self, mock_transport: MagicMock) -> None:
        """Test capturing errors with unicode characters."""
        client = ErrorExplorer.init({"token": "test"})

        try:
            raise ValueError("Error with unicode: 日本語 🎉 émojis")
        except ValueError as e:
            client.capture_exception(e)

        event = mock_transport.send.call_args[0][0]
        # New format puts the error message in 'message' field
        assert "日本語" in event["message"]
        assert "🎉" in event["message"]

    def test_very_large_exception_message(self, mock_transport: MagicMock) -> None:
        """Test capturing exception with large message."""
        client = ErrorExplorer.init({"token": "test"})

        large_message = "A" * 10000
        try:
            raise ValueError(large_message)
        except ValueError as e:
            client.capture_exception(e)

        # Should not crash
        mock_transport.send.assert_called_once()

    def test_nested_exception_context(self, mock_transport: MagicMock) -> None:
        """Test deeply nested exception context."""
        client = ErrorExplorer.init({"token": "test"})

        def level_1():
            level_2()

        def level_2():
            level_3()

        def level_3():
            level_4()

        def level_4():
            raise ValueError("Deep error")

        try:
            level_1()
        except ValueError as e:
            client.capture_exception(e)

        event = mock_transport.send.call_args[0][0]
        # New format uses 'frames' directly
        frames = event["frames"]

        # Should have multiple frames
        assert len(frames) >= 4

        # Should include our nested functions
        function_names = [f.get("function") for f in frames]
        assert "level_1" in function_names
        assert "level_4" in function_names
