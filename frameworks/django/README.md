# Error Explorer Django SDK

Automatic error tracking and monitoring for Django applications.

## Installation

```bash
pip install error-explorer-django
```

## Quick Start

### 1. Add to INSTALLED_APPS

```python
# settings.py
INSTALLED_APPS = [
    ...
    'error_explorer_django',
]
```

### 2. Add Middleware

```python
# settings.py
MIDDLEWARE = [
    'error_explorer_django.middleware.ErrorExplorerMiddleware',
    ...  # Should be early in the list to catch all errors
]
```

### 3. Configure

```python
# settings.py
ERROR_EXPLORER = {
    'token': 'your_project_token',
    'environment': 'production',  # or 'staging', 'development'
    'release': '1.0.0',
}
```

That's it! Errors will be automatically captured and sent to Error Explorer.

## Configuration Options

```python
ERROR_EXPLORER = {
    # Required
    'token': 'your_project_token',

    # Optional - Environment & Release
    'environment': 'production',
    'release': '1.0.0',
    'project': 'my-django-app',

    # Optional - HMAC Authentication
    'endpoint': 'https://your-server.com/api/v1/webhook',
    'hmac_secret': 'your_hmac_secret',

    # Optional - Behavior
    'debug': False,                  # Enable debug mode
    'sample_rate': 1.0,             # 0.0 to 1.0 (100%)
    'max_breadcrumbs': 50,          # Max breadcrumbs to keep
    'attach_stacktrace': True,      # Include stack traces
    'send_default_pii': False,      # Include PII (email, etc.)

    # Optional - Capture Settings
    'capture_user': True,           # Capture authenticated user
    'capture_signals': True,        # Capture Django signals
    'capture_logging': True,        # Capture log messages
    'capture_404': False,           # Capture 404 errors
    'capture_403': False,           # Capture 403 errors
    'capture_cli': False,           # Capture in management commands

    # Optional - Data Scrubbing
    'scrub_fields': [
        'password',
        'secret',
        'token',
        'api_key',
        'credit_card',
    ],
}
```

## Logging Integration

Capture log messages as breadcrumbs and errors:

```python
# settings.py
LOGGING = {
    'version': 1,
    'handlers': {
        'error_explorer': {
            'class': 'error_explorer_django.logging.ErrorExplorerHandler',
            'level': 'WARNING',
        },
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'error_explorer'],
            'level': 'INFO',
        },
        'myapp': {
            'handlers': ['console', 'error_explorer'],
            'level': 'DEBUG',
        },
    },
}
```

## Event Filtering with before_send

Use the `before_send` callback to filter or modify events before they're sent:

```python
# settings.py
def before_send(event):
    # Drop events from specific paths
    if event.get("request", {}).get("url", "").startswith("/health"):
        return None  # Drop the event

    # Remove sensitive data
    if "extra" in event and "api_response" in event["extra"]:
        event["extra"]["api_response"] = "[REDACTED]"

    # Add custom data
    event["tags"] = event.get("tags", {})
    event["tags"]["deployment_id"] = os.environ.get("DEPLOYMENT_ID", "unknown")

    return event

ERROR_EXPLORER = {
    'token': 'your_project_token',
    'before_send': before_send,
}
```

## Manual Usage

You can also use Error Explorer manually:

```python
from error_explorer import ErrorExplorer, Breadcrumb, User

# Add custom breadcrumb
ErrorExplorer.add_breadcrumb(Breadcrumb(
    message="User clicked checkout",
    category="user.action",
    data={"cart_total": 99.99},
))

# Set user context (overrides auto-detected user)
ErrorExplorer.set_user(User(
    id="user_123",
    email="user@example.com",
    plan="pro",
))

# Set tags for filtering
ErrorExplorer.set_tags({
    "feature": "checkout",
    "ab_test": "new_flow",
})

# Capture exception manually
try:
    process_payment()
except PaymentError as e:
    ErrorExplorer.capture_exception(e)

# Capture message
ErrorExplorer.capture_message("Payment processed", level="info")
```

## What's Captured Automatically

### Request/Response
- HTTP method, path, query string
- Response status code
- Safe headers (User-Agent, Referer, etc.)
- Client IP address

### User Context
- User ID
- Username
- Full name
- Email (if `send_default_pii=True`)

### Django Signals
- User login/logout
- Failed login attempts
- Database connections

### Breadcrumbs
- All incoming requests
- All responses
- Log messages (if logging handler is configured)
- Auth events

## Testing

Disable Error Explorer in tests:

```python
# settings.py or conftest.py
ERROR_EXPLORER = {
    'token': 'test_token',
    'capture_signals': False,
    'capture_logging': False,
}
```

Or in pytest:

```python
# conftest.py
@pytest.fixture(autouse=True)
def reset_error_explorer():
    from error_explorer import ErrorExplorer
    ErrorExplorer.reset()
    yield
    ErrorExplorer.reset()
```

## License

MIT
