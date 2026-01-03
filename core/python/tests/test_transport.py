"""
Tests for transport layer.
"""

import json
import pytest
import time
from unittest.mock import MagicMock, patch, Mock
from error_explorer.transport import HttpTransport, Transport


class TestHttpTransport:
    """Tests for HttpTransport class."""

    @pytest.fixture
    def mock_session(self) -> MagicMock:
        """Mock requests.Session."""
        with patch("error_explorer.transport.requests") as mock_requests:
            mock_requests.Session.return_value = MagicMock()
            yield mock_requests

    def test_transport_initialization(self, mock_session: MagicMock) -> None:
        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="test_token",
            background=False,
        )
        assert transport.endpoint == "https://api.example.com/webhook"
        assert transport.token == "test_token"
        transport.close()

    def test_transport_with_hmac(self, mock_session: MagicMock) -> None:
        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="test_token",
            hmac_secret="secret123",
            background=False,
        )
        assert transport.hmac_secret == "secret123"
        transport.close()

    def test_generate_hmac(self, mock_session: MagicMock) -> None:
        transport = HttpTransport(
            endpoint="https://api.example.com",
            token="test",
            hmac_secret="my_secret",
            background=False,
        )
        timestamp = 1234567890
        signature = transport._generate_hmac('{"test": "data"}', timestamp)
        # Signature should be a hex string (SHA256 = 64 chars)
        assert len(signature) == 64
        assert all(c in '0123456789abcdef' for c in signature)
        transport.close()

    def test_generate_hmac_without_secret(self, mock_session: MagicMock) -> None:
        transport = HttpTransport(
            endpoint="https://api.example.com",
            token="test",
            hmac_secret=None,
            background=False,
        )
        timestamp = 1234567890
        signature = transport._generate_hmac('{"test": "data"}', timestamp)
        assert signature == ""
        transport.close()

    def test_sync_send_success(self, mock_session: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_session.Session.return_value.post.return_value = mock_response

        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="test_token",
            background=False,
        )

        event = {"event_id": "abc123", "message": "Test error"}
        result = transport.send(event)

        assert result == "abc123"
        mock_session.Session.return_value.post.assert_called_once()
        transport.close()

    def test_sync_send_failure(self, mock_session: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_session.Session.return_value.post.return_value = mock_response

        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="test_token",
            background=False,
            debug=True,
        )

        event = {"event_id": "abc123", "message": "Test error"}
        result = transport.send(event)

        assert result is None
        transport.close()

    def test_sync_send_timeout(self, mock_session: MagicMock) -> None:
        import requests
        mock_session.Session.return_value.post.side_effect = requests.exceptions.Timeout()
        mock_session.exceptions = requests.exceptions

        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="test_token",
            background=False,
            debug=True,
        )

        event = {"event_id": "abc123", "message": "Test error"}
        result = transport.send(event)

        assert result is None
        transport.close()

    def test_sync_send_request_exception(self, mock_session: MagicMock) -> None:
        import requests
        mock_session.Session.return_value.post.side_effect = requests.exceptions.RequestException("Network error")
        mock_session.exceptions = requests.exceptions

        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="test_token",
            background=False,
            debug=True,
        )

        event = {"event_id": "abc123"}
        result = transport.send(event)

        assert result is None
        transport.close()

    def test_background_send(self, mock_session: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_session.Session.return_value.post.return_value = mock_response

        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="test_token",
            background=True,
        )

        event = {"event_id": "abc123", "message": "Test error"}
        result = transport.send(event)

        # In background mode, send returns immediately
        assert result == "abc123"

        # Wait for background worker to process
        transport.flush(timeout=2.0)
        time.sleep(0.5)

        transport.close()

    def test_flush_empty_queue(self, mock_session: MagicMock) -> None:
        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="test_token",
            background=True,
        )

        result = transport.flush(timeout=1.0)
        assert result is True
        transport.close()

    def test_flush_sync_transport(self, mock_session: MagicMock) -> None:
        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="test_token",
            background=False,
        )

        result = transport.flush()
        assert result is True
        transport.close()

    def test_close_transport(self, mock_session: MagicMock) -> None:
        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="test_token",
            background=True,
        )

        transport.close()
        mock_session.Session.return_value.close.assert_called_once()

    def test_headers_set_correctly(self, mock_session: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_session.Session.return_value.post.return_value = mock_response

        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="my_token",
            hmac_secret="my_secret",
            background=False,
        )

        event = {"event_id": "test"}
        transport.send(event)

        call_kwargs = mock_session.Session.return_value.post.call_args
        headers = call_kwargs.kwargs.get("headers", {})
        assert "X-Webhook-Token" in headers
        assert headers["X-Webhook-Token"] == "my_token"
        assert "X-Webhook-Signature" in headers
        # Signature should be 64 char hex string (SHA256)
        assert len(headers["X-Webhook-Signature"]) == 64
        assert all(c in '0123456789abcdef' for c in headers["X-Webhook-Signature"])
        assert "X-Webhook-Timestamp" in headers
        assert headers["X-Webhook-Timestamp"].isdigit()
        transport.close()

    def test_payload_serialization(self, mock_session: MagicMock) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_session.Session.return_value.post.return_value = mock_response

        transport = HttpTransport(
            endpoint="https://api.example.com/webhook",
            token="test",
            background=False,
        )

        event = {"event_id": "123", "message": "Test", "count": 42}
        transport.send(event)

        call_kwargs = mock_session.Session.return_value.post.call_args
        data = call_kwargs.kwargs.get("data")
        parsed = json.loads(data)
        assert parsed["event_id"] == "123"
        assert parsed["message"] == "Test"
        assert parsed["count"] == 42
        transport.close()


class TestTransportAbstract:
    """Tests for Transport abstract class."""

    def test_abstract_methods(self) -> None:
        # Cannot instantiate abstract class
        with pytest.raises(TypeError):
            Transport()  # type: ignore


class TestAsyncHttpTransport:
    """Tests for AsyncHttpTransport class."""

    @pytest.fixture
    def mock_aiohttp(self) -> MagicMock:
        """Mock aiohttp module."""
        with patch.dict("sys.modules", {"aiohttp": MagicMock()}):
            yield

    def test_async_transport_import_error(self) -> None:
        """Test that AsyncHttpTransport raises ImportError without aiohttp."""
        with patch.dict("sys.modules", {"aiohttp": None}):
            with patch("error_explorer.transport.HAS_AIOHTTP", False):
                from error_explorer.transport import AsyncHttpTransport
                with pytest.raises(ImportError) as exc_info:
                    AsyncHttpTransport(
                        endpoint="https://api.example.com",
                        token="test",
                    )
                assert "aiohttp" in str(exc_info.value)
