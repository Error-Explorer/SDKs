"""
Pytest configuration and fixtures for Flask tests.
"""

import pytest
from typing import Generator
from unittest.mock import MagicMock, patch

from flask import Flask

from error_explorer import ErrorExplorer


@pytest.fixture(autouse=True)
def reset_error_explorer() -> Generator[None, None, None]:
    """Reset Error Explorer state before and after each test."""
    ErrorExplorer.reset()
    yield
    ErrorExplorer.reset()


@pytest.fixture
def mock_transport() -> Generator[MagicMock, None, None]:
    """Mock transport for testing."""
    with patch("error_explorer.client.HttpTransport") as mock:
        transport = MagicMock()
        transport.send.return_value = "test_event_id"
        transport.flush.return_value = True
        mock.return_value = transport
        yield transport


@pytest.fixture
def initialized_client(mock_transport: MagicMock) -> ErrorExplorer:
    """Initialize Error Explorer for testing."""
    client = ErrorExplorer.init({
        "token": "test_token",
        "environment": "test",
        "debug": True,
        "send_default_pii": True,
        "auto_capture": {
            "uncaught_exceptions": False,
            "unhandled_threads": False,
            "logging": False,
        },
    })

    return client


@pytest.fixture
def app() -> Flask:
    """Create Flask test app."""
    app = Flask(__name__)
    app.config["TESTING"] = True
    app.config["ERROR_EXPLORER"] = {
        "capture_user": True,
        "send_default_pii": True,
    }
    return app


@pytest.fixture
def client(app: Flask):
    """Create Flask test client."""
    return app.test_client()
