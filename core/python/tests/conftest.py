"""
Pytest configuration and fixtures for Error Explorer tests.
"""

import pytest
from typing import Generator
from unittest.mock import MagicMock, patch

from error_explorer import ErrorExplorer, ErrorExplorerOptions


@pytest.fixture(autouse=True)
def reset_client() -> Generator[None, None, None]:
    """Reset ErrorExplorer singleton before and after each test."""
    ErrorExplorer.reset()
    yield
    ErrorExplorer.reset()


@pytest.fixture
def mock_transport() -> Generator[MagicMock, None, None]:
    """Mock the transport to prevent actual HTTP requests."""
    with patch("error_explorer.client.HttpTransport") as mock:
        transport_instance = MagicMock()
        transport_instance.send.return_value = "mock-event-id"
        transport_instance.flush.return_value = True
        mock.return_value = transport_instance
        yield transport_instance


@pytest.fixture
def initialized_client(mock_transport: MagicMock) -> ErrorExplorer:
    """Create an initialized ErrorExplorer client with mocked transport."""
    client = ErrorExplorer.init({
        "token": "test_token_12345",
        "project": "test-project",
        "environment": "test",
        "debug": False,
        "send_default_pii": True,  # Allow PII in tests for easier assertions
        "auto_capture": {
            "uncaught_exceptions": False,
            "unhandled_threads": False,
            "logging": False,
        },
    })
    return client


@pytest.fixture
def sample_options() -> ErrorExplorerOptions:
    """Sample ErrorExplorerOptions for testing."""
    return ErrorExplorerOptions(
        token="test_token",
        project="test-project",
        environment="testing",
        release="1.0.0",
        debug=True,
    )
