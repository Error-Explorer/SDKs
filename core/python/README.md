# Error Explorer SDK for Python

Official Python SDK for [Error Explorer](https://error-explorer.com) - Automatic error tracking and monitoring for Python applications.

## Features

- **Automatic Error Capture** - Captures uncaught exceptions via `sys.excepthook`
- **Thread Error Capture** - Captures errors in threads via `threading.excepthook`
- **Breadcrumbs** - Track user actions and events leading to errors
- **User Context** - Associate errors with user information
- **Tags & Extra Data** - Add custom metadata to errors
- **Data Scrubbing** - Automatic removal of sensitive data
- **Scope Management** - Isolated context for specific operations
- **Async Support** - Optional async transport via aiohttp

## Installation

```bash
pip install error-explorer
```

For async support:
```bash
pip install error-explorer[async]
```

## Quick Start

```python
from error_explorer import ErrorExplorer

# Initialize the SDK
ErrorExplorer.init({
    "token": "your_error_explorer_token",
    "project": "my-python-app",
    "environment": "production",
    "release": "1.0.0",
})

# Errors are now automatically captured!
```

## Configuration Options

```python
from error_explorer import ErrorExplorer, ErrorExplorerOptions

options = ErrorExplorerOptions(
    # Required
    token="your_token",

    # Optional
    project="my-project",
    environment="production",          # Default: "production"
    release="1.0.0",                   # Your app version
    endpoint="https://error-explorer.com/api/v1/webhook",  # Default endpoint
    hmac_secret="optional_hmac_secret", # For request signing

    debug=False,                        # Enable debug logging
    enabled=True,                       # Enable/disable SDK
    sample_rate=1.0,                    # 0.0 to 1.0
    max_breadcrumbs=100,               # Maximum breadcrumbs to keep
    attach_stacktrace=True,            # Include local variables
    send_default_pii=False,            # Scrub PII by default
    server_name="web-1",               # Server identifier
    timeout=10.0,                      # HTTP timeout in seconds

    # Auto capture options
    auto_capture={
        "uncaught_exceptions": True,   # Capture via sys.excepthook
        "unhandled_threads": True,     # Capture thread errors
        "logging": False,              # Add log entries as breadcrumbs
    },

    # Breadcrumb options
    breadcrumbs={
        "enabled": True,
        "max_breadcrumbs": 100,
        "logging": True,
        "http": True,
    },

    # Custom fields to scrub
    scrub_fields=["custom_secret", "my_api_key"],

    # Event processing hook
    before_send=lambda event: event,   # Modify or drop events
)

ErrorExplorer.init(options)
```

## Manual Error Capture

```python
from error_explorer import ErrorExplorer, CaptureContext, User

client = ErrorExplorer.get_client()

# Capture an exception
try:
    risky_operation()
except Exception as e:
    client.capture_exception(e)

# Capture with additional context
try:
    process_order(order_id)
except Exception as e:
    client.capture_exception(e, CaptureContext(
        user=User(id="user_123", email="user@example.com"),
        tags={"order_id": order_id},
        extra={"order_details": order_data},
    ))

# Capture the current exception
try:
    something()
except:
    client.capture_exception()  # Captures current exception

# Capture a message
client.capture_message("Payment processed successfully", level="info")
client.capture_message("Rate limit approaching", level="warning")
```

## User Context

```python
from error_explorer import ErrorExplorer, User

client = ErrorExplorer.get_client()

# Set user context
client.set_user(User(
    id="user_12345",
    email="user@example.com",
    username="johndoe",
    ip_address="192.168.1.1",
    extra={"subscription": "pro"},
))

# Or use a dict
client.set_user({
    "id": "user_12345",
    "email": "user@example.com",
})

# Clear user on logout
client.clear_user()
```

## Breadcrumbs

```python
from error_explorer import ErrorExplorer, Breadcrumb, BreadcrumbType, BreadcrumbLevel

client = ErrorExplorer.get_client()

# Add a breadcrumb
client.add_breadcrumb(Breadcrumb(
    message="User clicked checkout button",
    category="ui.click",
    type=BreadcrumbType.UI,
    level=BreadcrumbLevel.INFO,
    data={"button_id": "checkout-btn"},
))

# Using a dict
client.add_breadcrumb({
    "message": "API request completed",
    "category": "http",
    "type": "http",
    "data": {"url": "/api/orders", "status_code": 200},
})

# Clear all breadcrumbs
client.clear_breadcrumbs()
```

## Tags and Extra Data

```python
client = ErrorExplorer.get_client()

# Set a single tag
client.set_tag("version", "2.0.0")

# Set multiple tags
client.set_tags({
    "environment": "production",
    "region": "us-east-1",
    "feature_flag": "new_checkout",
})

# Remove a tag
client.remove_tag("feature_flag")

# Set extra data
client.set_extra("request_id", "req_abc123")

# Set named context
client.set_context("order", {
    "id": "order_123",
    "total": 99.99,
    "items": 3,
})
```

## Scope Management

```python
client = ErrorExplorer.get_client()

# Use scope for temporary context
with client.push_scope() as scope:
    scope.set_tag("transaction", "checkout")
    scope.set_user(User(id="temp_user"))
    scope.add_breadcrumb(Breadcrumb(message="In checkout flow"))

    try:
        process_checkout()
    except Exception as e:
        # Error will include scoped context
        client.capture_exception(e)

# Context is automatically restored after the scope
```

## Before Send Hook

```python
def before_send(event):
    # Modify the event
    event["tags"]["processed"] = "true"

    # Drop events based on conditions
    if event.get("level") == "debug":
        return None  # Don't send debug events

    # Remove sensitive data
    if "extra" in event and "password" in event["extra"]:
        del event["extra"]["password"]

    return event

ErrorExplorer.init({
    "token": "your_token",
    "before_send": before_send,
})
```

## Flushing and Closing

```python
client = ErrorExplorer.get_client()

# Flush pending events (useful before shutdown)
success = client.flush(timeout=5.0)

# Close the SDK (also flushes)
client.close()
```

## Framework Integration

### Flask

```python
from flask import Flask
from error_explorer import ErrorExplorer, Breadcrumb

app = Flask(__name__)

# Initialize on app startup
ErrorExplorer.init({
    "token": "your_token",
    "environment": "production",
})

@app.before_request
def before_request():
    client = ErrorExplorer.get_client()
    client.add_breadcrumb(Breadcrumb(
        message=f"{request.method} {request.path}",
        category="http",
        type="http",
    ))

@app.errorhandler(Exception)
def handle_exception(e):
    client = ErrorExplorer.get_client()
    client.capture_exception(e)
    return "Internal Server Error", 500
```

### Django

```python
# settings.py
MIDDLEWARE = [
    'myapp.middleware.ErrorExplorerMiddleware',
    # ... other middleware
]

# middleware.py
from error_explorer import ErrorExplorer, Breadcrumb

class ErrorExplorerMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        ErrorExplorer.init({
            "token": "your_token",
            "environment": "production",
        })

    def __call__(self, request):
        client = ErrorExplorer.get_client()

        # Add request breadcrumb
        client.add_breadcrumb(Breadcrumb(
            message=f"{request.method} {request.path}",
            category="http",
        ))

        # Set user if authenticated
        if request.user.is_authenticated:
            client.set_user({
                "id": str(request.user.id),
                "email": request.user.email,
            })

        response = self.get_response(request)
        return response

    def process_exception(self, request, exception):
        client = ErrorExplorer.get_client()
        client.capture_exception(exception)
        return None
```

## Testing

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Run with coverage
pytest --cov=error_explorer --cov-report=html
```

## Requirements

- Python 3.9+
- requests (for HTTP transport)
- aiohttp (optional, for async transport)

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: https://docs.error-explorer.com/sdks/python
- Issues: https://github.com/error-explorer/error-explorer-sdks/issues
- Email: support@error-explorer.com
