"""
Django settings for testing Error Explorer Django integration.
"""

SECRET_KEY = "test-secret-key-for-testing-only"

DEBUG = True

ALLOWED_HOSTS = ["testserver", "localhost", "127.0.0.1"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "error_explorer_django",
]

MIDDLEWARE = [
    "error_explorer_django.middleware.ErrorExplorerMiddleware",
    "django.middleware.common.CommonMiddleware",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

ROOT_URLCONF = "tests.urls"

ERROR_EXPLORER = {
    "token": "test_token",
    "environment": "test",
    "release": "1.0.0",
    "debug": True,
    "send_default_pii": False,
    "capture_user": True,
    "capture_signals": False,  # Disable for testing
    "capture_logging": False,  # Disable for testing
}

USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
