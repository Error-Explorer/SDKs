"""
Tests for type definitions.
"""

import pytest
from datetime import datetime, timezone
from error_explorer.types import (
    Breadcrumb,
    BreadcrumbLevel,
    BreadcrumbType,
    CaptureContext,
    ErrorExplorerOptions,
    Event,
    ExceptionInfo,
    StackFrame,
    User,
)


class TestBreadcrumb:
    """Tests for Breadcrumb dataclass."""

    def test_create_basic_breadcrumb(self) -> None:
        breadcrumb = Breadcrumb(message="Test message")
        assert breadcrumb.message == "Test message"
        assert breadcrumb.category == "default"
        assert breadcrumb.type == BreadcrumbType.DEFAULT
        assert breadcrumb.level == BreadcrumbLevel.INFO
        assert breadcrumb.timestamp is not None

    def test_create_breadcrumb_with_all_fields(self) -> None:
        timestamp = datetime(2024, 1, 1, 12, 0, 0)
        breadcrumb = Breadcrumb(
            message="User clicked button",
            category="ui.click",
            type=BreadcrumbType.UI,
            level=BreadcrumbLevel.INFO,
            data={"button_id": "submit"},
            timestamp=timestamp,
        )
        assert breadcrumb.message == "User clicked button"
        assert breadcrumb.category == "ui.click"
        assert breadcrumb.type == BreadcrumbType.UI
        assert breadcrumb.data == {"button_id": "submit"}
        assert breadcrumb.timestamp == timestamp

    def test_breadcrumb_with_string_type(self) -> None:
        breadcrumb = Breadcrumb(message="Test", type="custom_type")
        assert breadcrumb.type == "custom_type"

    def test_breadcrumb_with_string_level(self) -> None:
        breadcrumb = Breadcrumb(message="Test", level="warning")
        assert breadcrumb.level == BreadcrumbLevel.WARNING

    def test_breadcrumb_to_dict(self) -> None:
        timestamp = datetime(2024, 1, 1, 12, 0, 0)
        breadcrumb = Breadcrumb(
            message="Test",
            category="test",
            type=BreadcrumbType.DEBUG,
            level=BreadcrumbLevel.ERROR,
            data={"key": "value"},
            timestamp=timestamp,
        )
        result = breadcrumb.to_dict()
        assert result["message"] == "Test"
        assert result["category"] == "test"
        assert result["type"] == "debug"
        assert result["level"] == "error"
        assert result["data"] == {"key": "value"}
        assert result["timestamp"] == "2024-01-01T12:00:00"


class TestUser:
    """Tests for User dataclass."""

    def test_create_user_with_id(self) -> None:
        user = User(id="user_123")
        assert user.id == "user_123"
        assert user.email is None

    def test_create_user_with_all_fields(self) -> None:
        user = User(
            id="user_123",
            email="test@example.com",
            username="testuser",
            ip_address="192.168.1.1",
            extra={"subscription": "pro"},
        )
        assert user.id == "user_123"
        assert user.email == "test@example.com"
        assert user.username == "testuser"
        assert user.ip_address == "192.168.1.1"
        assert user.extra == {"subscription": "pro"}

    def test_user_to_dict(self) -> None:
        user = User(id="123", email="test@test.com", extra={"role": "admin"})
        result = user.to_dict()
        assert result["id"] == "123"
        assert result["email"] == "test@test.com"
        assert result["role"] == "admin"
        assert "username" not in result  # None values excluded

    def test_empty_user_to_dict(self) -> None:
        user = User()
        result = user.to_dict()
        assert result == {}


class TestCaptureContext:
    """Tests for CaptureContext dataclass."""

    def test_empty_context(self) -> None:
        context = CaptureContext()
        assert context.user is None
        assert context.tags is None
        assert context.extra is None

    def test_context_with_user(self) -> None:
        user = User(id="123")
        context = CaptureContext(user=user)
        assert context.user == user

    def test_context_with_all_fields(self) -> None:
        context = CaptureContext(
            user=User(id="123"),
            tags={"version": "1.0"},
            extra={"request_id": "abc"},
            fingerprint=["error-type", "{{ default }}"],
            level="warning",
            contexts={"browser": {"name": "Chrome"}},
        )
        assert context.user.id == "123"
        assert context.tags == {"version": "1.0"}
        assert context.extra == {"request_id": "abc"}
        assert context.fingerprint == ["error-type", "{{ default }}"]
        assert context.level == "warning"

    def test_context_to_dict(self) -> None:
        context = CaptureContext(
            user=User(id="123"),
            tags={"env": "test"},
        )
        result = context.to_dict()
        assert result["user"]["id"] == "123"
        assert result["tags"]["env"] == "test"


class TestStackFrame:
    """Tests for StackFrame dataclass."""

    def test_basic_frame(self) -> None:
        frame = StackFrame(
            filename="/app/main.py",
            lineno=42,
            function="process",
        )
        assert frame.filename == "/app/main.py"
        assert frame.lineno == 42
        assert frame.function == "process"
        assert frame.in_app is True

    def test_frame_with_context(self) -> None:
        frame = StackFrame(
            filename="/app/main.py",
            lineno=42,
            function="process",
            context_line="    raise ValueError('invalid')",
            pre_context=["def process():", "    x = 1"],
            post_context=["except:", "    pass"],
            module="main",
            in_app=True,
            vars={"x": "1"},
        )
        result = frame.to_dict()
        assert result["context_line"] == "    raise ValueError('invalid')"
        assert result["pre_context"] == ["def process():", "    x = 1"]
        assert result["module"] == "main"
        assert result["vars"] == {"x": "1"}


class TestExceptionInfo:
    """Tests for ExceptionInfo dataclass."""

    def test_basic_exception(self) -> None:
        exc = ExceptionInfo(type="ValueError", value="invalid input")
        assert exc.type == "ValueError"
        assert exc.value == "invalid input"

    def test_exception_with_stacktrace(self) -> None:
        frames = [
            StackFrame(filename="a.py", lineno=1, function="foo"),
            StackFrame(filename="b.py", lineno=2, function="bar"),
        ]
        exc = ExceptionInfo(
            type="RuntimeError",
            value="something failed",
            module="mymodule",
            stacktrace=frames,
        )
        result = exc.to_dict()
        assert result["type"] == "RuntimeError"
        assert result["module"] == "mymodule"
        assert len(result["stacktrace"]["frames"]) == 2


class TestErrorExplorerOptions:
    """Tests for ErrorExplorerOptions dataclass."""

    def test_minimal_options(self) -> None:
        options = ErrorExplorerOptions(token="test_token")
        assert options.token == "test_token"
        assert options.environment == "production"
        assert options.endpoint == "https://error-explorer.com/api/v1/webhook"
        assert options.enabled is True
        assert options.sample_rate == 1.0
        assert options.auto_capture is not None
        assert options.breadcrumbs is not None

    def test_full_options(self) -> None:
        options = ErrorExplorerOptions(
            token="my_token",
            project="my-project",
            environment="staging",
            release="2.0.0",
            endpoint="https://custom.endpoint.com/api",
            hmac_secret="secret123",
            debug=True,
            enabled=True,
            sample_rate=0.5,
            max_breadcrumbs=50,
            attach_stacktrace=True,
            send_default_pii=True,
            server_name="web-1",
            scrub_fields=["custom_field"],
            timeout=5.0,
        )
        assert options.token == "my_token"
        assert options.project == "my-project"
        assert options.environment == "staging"
        assert options.release == "2.0.0"
        assert options.endpoint == "https://custom.endpoint.com/api"
        assert options.hmac_secret == "secret123"
        assert options.debug is True
        assert options.sample_rate == 0.5
        assert options.max_breadcrumbs == 50
        assert options.server_name == "web-1"
        assert "custom_field" in options.scrub_fields

    def test_default_scrub_fields(self) -> None:
        options = ErrorExplorerOptions(token="test")
        assert "password" in options.scrub_fields
        assert "api_key" in options.scrub_fields
        assert "credit_card" in options.scrub_fields


class TestEvent:
    """Tests for Event dataclass."""

    def test_minimal_event(self) -> None:
        event = Event(
            event_id="abc123",
            timestamp=datetime(2024, 1, 1, 12, 0, 0),
        )
        assert event.event_id == "abc123"
        assert event.level == "error"
        assert event.platform == "python"

    def test_event_to_dict(self) -> None:
        event = Event(
            event_id="abc123",
            timestamp=datetime(2024, 1, 1, 12, 0, 0),
            level="warning",
            message="Test message",
            user=User(id="user123"),
            tags={"version": "1.0"},
            extra={"request_id": "req123"},
            environment="test",
            release="1.0.0",
            sdk={"name": "error-explorer-python", "version": "1.0.0"},
        )
        result = event.to_dict()
        assert result["event_id"] == "abc123"
        assert result["level"] == "warning"
        assert result["message"] == "Test message"
        assert result["user"]["id"] == "user123"
        assert result["tags"]["version"] == "1.0"
        assert result["environment"] == "test"
        assert result["sdk"]["name"] == "error-explorer-python"

    def test_event_with_exception(self) -> None:
        exception = ExceptionInfo(type="ValueError", value="bad value")
        event = Event(
            event_id="abc",
            timestamp=datetime.now(timezone.utc),
            exception=exception,
        )
        result = event.to_dict()
        assert "exception" in result
        assert result["exception"]["values"][0]["type"] == "ValueError"

    def test_event_with_breadcrumbs(self) -> None:
        breadcrumbs = [
            Breadcrumb(message="First action"),
            Breadcrumb(message="Second action"),
        ]
        event = Event(
            event_id="abc",
            timestamp=datetime.now(timezone.utc),
            breadcrumbs=breadcrumbs,
        )
        result = event.to_dict()
        assert "breadcrumbs" in result
        assert len(result["breadcrumbs"]["values"]) == 2
