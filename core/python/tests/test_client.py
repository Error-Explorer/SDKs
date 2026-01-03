"""
Tests for ErrorExplorer client.
"""

import sys
import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch, call
from error_explorer import (
    ErrorExplorer,
    ErrorExplorerOptions,
    Breadcrumb,
    BreadcrumbLevel,
    BreadcrumbType,
    CaptureContext,
    User,
)


class TestErrorExplorerInitialization:
    """Tests for ErrorExplorer initialization."""

    def test_singleton_pattern(self, mock_transport: MagicMock) -> None:
        client1 = ErrorExplorer.init({"token": "test1"})
        client2 = ErrorExplorer.init({"token": "test2"})
        assert client1 is client2

    def test_init_with_dict_options(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test_token",
            "project": "my-project",
            "environment": "production",
        })
        assert client.is_initialized()
        assert client._options.token == "test_token"
        assert client._options.project == "my-project"

    def test_init_with_options_object(self, mock_transport: MagicMock) -> None:
        options = ErrorExplorerOptions(
            token="test_token",
            project="test-project",
            environment="staging",
            release="1.0.0",
        )
        client = ErrorExplorer.init(options)
        assert client.is_initialized()
        assert client._options.release == "1.0.0"

    def test_get_client(self, mock_transport: MagicMock) -> None:
        ErrorExplorer.init({"token": "test"})
        client = ErrorExplorer.get_client()
        assert client is not None
        assert client.is_initialized()

    def test_get_client_before_init(self) -> None:
        client = ErrorExplorer.get_client()
        assert client is None

    def test_is_initialized_before_init(self) -> None:
        assert ErrorExplorer.is_initialized() is False

    def test_reset(self, mock_transport: MagicMock) -> None:
        ErrorExplorer.init({"token": "test"})
        assert ErrorExplorer.is_initialized()
        ErrorExplorer.reset()
        assert not ErrorExplorer.is_initialized()


class TestCaptureException:
    """Tests for capture_exception method."""

    def test_capture_exception_basic(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        error = ValueError("Test error message")
        result = initialized_client.capture_exception(error)

        assert result == "mock-event-id"
        mock_transport.send.assert_called_once()

        event = mock_transport.send.call_args[0][0]
        # New webhook format uses 'severity' instead of 'level'
        assert event["severity"] == "error"
        # New webhook format uses 'exception_class' instead of 'exception.values'
        assert event["exception_class"] == "ValueError"

    def test_capture_exception_with_context(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        error = RuntimeError("Runtime failure")
        context = CaptureContext(
            user=User(id="user_123", email="test@test.com"),
            tags={"version": "1.0"},
            extra={"request_id": "req_abc"},
        )
        result = initialized_client.capture_exception(error, context)

        assert result is not None
        event = mock_transport.send.call_args[0][0]
        assert event["user"]["id"] == "user_123"
        assert event["tags"]["version"] == "1.0"
        assert event["extra"]["request_id"] == "req_abc"

    def test_capture_exception_with_dict_context(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        error = Exception("Test")
        result = initialized_client.capture_exception(error, {
            "tags": {"env": "test"},
            "extra": {"foo": "bar"},
        })

        assert result is not None
        event = mock_transport.send.call_args[0][0]
        assert event["tags"]["env"] == "test"

    def test_capture_exception_disabled(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test",
            "enabled": False,
        })
        result = client.capture_exception(ValueError("Test"))
        assert result is None
        mock_transport.send.assert_not_called()

    def test_capture_exception_sample_rate(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test",
            "sample_rate": 0.0,  # 0% sample rate
        })
        result = client.capture_exception(ValueError("Test"))
        assert result is None

    def test_capture_exception_includes_breadcrumbs(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        initialized_client.add_breadcrumb(Breadcrumb(message="Action 1", category="action"))
        initialized_client.add_breadcrumb(Breadcrumb(message="Action 2", category="action"))

        error = Exception("Error after actions")
        initialized_client.capture_exception(error)

        event = mock_transport.send.call_args[0][0]
        assert "breadcrumbs" in event
        # New webhook format uses breadcrumbs as a list directly
        assert len(event["breadcrumbs"]) == 2

    def test_capture_exception_with_fingerprint(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        error = Exception("Test")
        initialized_client.capture_exception(error, CaptureContext(
            fingerprint=["custom-fingerprint", "{{ default }}"]
        ))

        event = mock_transport.send.call_args[0][0]
        assert event["fingerprint"] == ["custom-fingerprint", "{{ default }}"]

    def test_capture_current_exception(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        try:
            raise ValueError("Current exception")
        except ValueError:
            result = initialized_client.capture_exception()

        assert result is not None
        event = mock_transport.send.call_args[0][0]
        # New webhook format uses exception_class
        assert event["exception_class"] == "ValueError"

    def test_capture_exception_no_current_exception(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        result = initialized_client.capture_exception(None)
        assert result is None
        mock_transport.send.assert_not_called()


class TestCaptureMessage:
    """Tests for capture_message method."""

    def test_capture_message_basic(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        result = initialized_client.capture_message("Test message")

        assert result == "mock-event-id"
        event = mock_transport.send.call_args[0][0]
        assert event["message"] == "Test message"
        # New webhook format uses 'severity' instead of 'level'
        assert event["severity"] == "info"

    def test_capture_message_with_level(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        initialized_client.capture_message("Warning message", level="warning")

        event = mock_transport.send.call_args[0][0]
        # New webhook format uses 'severity' instead of 'level'
        assert event["severity"] == "warning"

    def test_capture_message_with_context(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        initialized_client.capture_message(
            "Test",
            context=CaptureContext(tags={"source": "api"})
        )

        event = mock_transport.send.call_args[0][0]
        assert event["tags"]["source"] == "api"

    def test_capture_message_disabled(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test",
            "enabled": False,
        })
        result = client.capture_message("Test")
        assert result is None


class TestBreadcrumbs:
    """Tests for breadcrumb management."""

    def test_add_breadcrumb_basic(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.add_breadcrumb(Breadcrumb(
            message="User clicked button",
            category="ui.click",
        ))

        assert len(initialized_client._breadcrumbs) == 1
        assert initialized_client._breadcrumbs[0].message == "User clicked button"

    def test_add_breadcrumb_dict(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.add_breadcrumb({
            "message": "HTTP request",
            "category": "http",
            "type": "http",
            "data": {"url": "/api/users"},
        })

        assert len(initialized_client._breadcrumbs) == 1
        assert initialized_client._breadcrumbs[0].category == "http"

    def test_max_breadcrumbs_limit(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test",
            "max_breadcrumbs": 5,
        })

        for i in range(10):
            client.add_breadcrumb(Breadcrumb(message=f"Breadcrumb {i}"))

        assert len(client._breadcrumbs) == 5
        # Should keep the most recent
        assert client._breadcrumbs[0].message == "Breadcrumb 5"
        assert client._breadcrumbs[4].message == "Breadcrumb 9"

    def test_clear_breadcrumbs(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.add_breadcrumb(Breadcrumb(message="Test"))
        initialized_client.add_breadcrumb(Breadcrumb(message="Test 2"))

        initialized_client.clear_breadcrumbs()
        assert len(initialized_client._breadcrumbs) == 0


class TestUserContext:
    """Tests for user context management."""

    def test_set_user(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.set_user(User(id="user_123", email="test@test.com"))

        assert initialized_client._user is not None
        assert initialized_client._user.id == "user_123"
        assert initialized_client._user.email == "test@test.com"

    def test_set_user_dict(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.set_user({"id": "user_456", "username": "john"})

        assert initialized_client._user is not None
        assert initialized_client._user.id == "user_456"
        assert initialized_client._user.username == "john"

    def test_clear_user(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.set_user(User(id="123"))
        initialized_client.clear_user()

        assert initialized_client._user is None

    def test_set_user_none(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.set_user(User(id="123"))
        initialized_client.set_user(None)

        assert initialized_client._user is None

    def test_user_included_in_event(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        initialized_client.set_user(User(id="user_abc", email="abc@test.com"))
        initialized_client.capture_exception(ValueError("Test"))

        event = mock_transport.send.call_args[0][0]
        assert event["user"]["id"] == "user_abc"
        assert event["user"]["email"] == "abc@test.com"


class TestTagsAndExtra:
    """Tests for tags and extra data."""

    def test_set_tag(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.set_tag("version", "1.0.0")
        assert initialized_client._tags["version"] == "1.0.0"

    def test_set_tags(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.set_tags({
            "env": "production",
            "region": "us-east",
        })
        assert initialized_client._tags["env"] == "production"
        assert initialized_client._tags["region"] == "us-east"

    def test_remove_tag(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.set_tag("key", "value")
        initialized_client.remove_tag("key")
        assert "key" not in initialized_client._tags

    def test_set_extra(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.set_extra("request_id", "req_123")
        assert initialized_client._extra["request_id"] == "req_123"

    def test_set_context(self, initialized_client: ErrorExplorer) -> None:
        initialized_client.set_context("browser", {
            "name": "Chrome",
            "version": "120",
        })
        assert initialized_client._contexts["browser"]["name"] == "Chrome"

    def test_tags_included_in_event(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        initialized_client.set_tag("release", "2.0.0")
        initialized_client.capture_message("Test")

        event = mock_transport.send.call_args[0][0]
        assert event["tags"]["release"] == "2.0.0"


class TestScope:
    """Tests for scope management."""

    def test_push_scope_basic(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        initialized_client.set_tag("global", "value")

        with initialized_client.push_scope() as scope:
            scope.set_tag("local", "scoped_value")
            scope.set_user(User(id="scope_user"))

            assert "local" in initialized_client._tags
            assert initialized_client._user is not None

        # After scope, local changes should be reverted
        assert "local" not in initialized_client._tags
        assert initialized_client._user is None
        # Global tag should remain
        assert initialized_client._tags["global"] == "value"

    def test_scope_add_breadcrumb(self, initialized_client: ErrorExplorer) -> None:
        with initialized_client.push_scope() as scope:
            scope.add_breadcrumb(Breadcrumb(message="Scoped breadcrumb"))
            assert len(initialized_client._breadcrumbs) == 1

        # Breadcrumbs are not reverted by scope
        assert len(initialized_client._breadcrumbs) == 1

    def test_scope_set_context(self, initialized_client: ErrorExplorer) -> None:
        with initialized_client.push_scope() as scope:
            scope.set_context("custom", {"key": "value"})
            assert "custom" in initialized_client._contexts

        assert "custom" not in initialized_client._contexts


class TestBeforeSend:
    """Tests for before_send hook."""

    def test_before_send_modifies_event(self, mock_transport: MagicMock) -> None:
        def before_send(event: dict) -> dict:
            event["tags"] = event.get("tags", {})
            event["tags"]["modified"] = "true"
            return event

        client = ErrorExplorer.init({
            "token": "test",
            "before_send": before_send,
        })
        client.capture_message("Test")

        event = mock_transport.send.call_args[0][0]
        assert event["tags"]["modified"] == "true"

    def test_before_send_drops_event(self, mock_transport: MagicMock) -> None:
        def before_send(event: dict) -> None:
            return None  # Drop the event

        client = ErrorExplorer.init({
            "token": "test",
            "before_send": before_send,
        })
        result = client.capture_message("Test")

        assert result is None
        mock_transport.send.assert_not_called()


class TestFlushAndClose:
    """Tests for flush and close methods."""

    def test_flush(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        result = initialized_client.flush(timeout=1.0)
        assert result is True
        mock_transport.flush.assert_called_once_with(1.0)

    def test_close(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        initialized_client.close()
        mock_transport.flush.assert_called()
        mock_transport.close.assert_called()

    def test_close_not_initialized(self) -> None:
        client = ErrorExplorer()
        client._initialized = False
        # Should not raise
        client.close()


class TestSystemContext:
    """Tests for system context extraction."""

    def test_system_contexts_included(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        initialized_client.capture_message("Test")

        event = mock_transport.send.call_args[0][0]
        assert "contexts" in event
        assert "os" in event["contexts"]
        assert "runtime" in event["contexts"]
        assert event["contexts"]["runtime"]["name"] == "Python"


class TestDataScrubbing:
    """Tests for data scrubbing in events."""

    def test_sensitive_data_scrubbed(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        initialized_client.set_extra("password", "secret123")
        initialized_client.set_extra("api_key", "key_abc")
        initialized_client.capture_message("Test")

        event = mock_transport.send.call_args[0][0]
        assert event["extra"]["password"] == "[Filtered]"
        assert event["extra"]["api_key"] == "[Filtered]"

    def test_normal_data_preserved(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        initialized_client.set_extra("user_name", "john")
        initialized_client.set_extra("count", 42)
        initialized_client.capture_message("Test")

        event = mock_transport.send.call_args[0][0]
        assert event["extra"]["user_name"] == "john"
        assert event["extra"]["count"] == 42


class TestSDKInfo:
    """Tests for SDK information in events."""

    def test_sdk_info_included(self, initialized_client: ErrorExplorer, mock_transport: MagicMock) -> None:
        initialized_client.capture_message("Test")

        event = mock_transport.send.call_args[0][0]
        assert "sdk" in event
        assert event["sdk"]["name"] == "error-explorer-python"
        assert event["sdk"]["version"] == "1.0.0"

    def test_environment_included(self, mock_transport: MagicMock) -> None:
        client = ErrorExplorer.init({
            "token": "test",
            "environment": "staging",
            "release": "2.0.0-beta",
        })
        client.capture_message("Test")

        event = mock_transport.send.call_args[0][0]
        assert event["environment"] == "staging"
        assert event["release"] == "2.0.0-beta"
