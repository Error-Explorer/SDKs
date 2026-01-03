"""
Pytest configuration and fixtures for Django tests.
"""

import os
import django
from django.conf import settings

# Configure Django settings before importing anything else
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "tests.settings")
if not settings.configured:
    settings.configure(
        SECRET_KEY="test-secret-key-for-testing-only",
        DEBUG=True,
        ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"],
        INSTALLED_APPS=[
            "django.contrib.contenttypes",
            "django.contrib.auth",
        ],
        MIDDLEWARE=[
            "django.middleware.common.CommonMiddleware",
        ],
        DATABASES={
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": ":memory:",
            }
        },
        ROOT_URLCONF="tests.urls",
        ERROR_EXPLORER={
            "token": "test_token",
            "environment": "test",
            "debug": True,
            "send_default_pii": True,
            "capture_user": True,
        },
        USE_TZ=True,
        DEFAULT_AUTO_FIELD="django.db.models.BigAutoField",
    )
django.setup()

import pytest
from typing import Generator
from unittest.mock import MagicMock, patch

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
