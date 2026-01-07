# Error Explorer Flask SDK

Official Flask integration for Error Explorer error tracking.

## Installation

```bash
pip install error-explorer-flask
```

## Quick Start

```python
from flask import Flask
from error_explorer import ErrorExplorer
from error_explorer_flask import ErrorExplorerFlask

# Initialize Error Explorer
ErrorExplorer.init({
    "token": "your-project-token",
    "environment": "production",
})

# Create Flask app and extension
app = Flask(__name__)
error_explorer = ErrorExplorerFlask(app)

@app.route("/")
def hello():
    return "Hello, World!"

if __name__ == "__main__":
    app.run()
```

## Factory Pattern

```python
from flask import Flask
from error_explorer_flask import ErrorExplorerFlask

error_explorer = ErrorExplorerFlask()

def create_app():
    app = Flask(__name__)
    error_explorer.init_app(app)
    return app
```

## Configuration

Configure the extension via Flask's config:

```python
app.config["ERROR_EXPLORER"] = {
    # Capture user info from Flask-Login
    "capture_user": True,

    # Send PII (email, IP address)
    "send_default_pii": False,

    # Capture 404 errors
    "capture_404": False,

    # Capture 403 errors
    "capture_403": False,
}
```

## Features

### Automatic Error Capture

All unhandled exceptions are automatically captured and sent to Error Explorer:

```python
@app.route("/error")
def trigger_error():
    raise ValueError("Something went wrong")
    # This is automatically captured
```

### Request Breadcrumbs

HTTP requests are automatically logged as breadcrumbs:

```
→ GET /api/users
← 200 OK
```

### Flask-Login Integration

If you use Flask-Login, user context is automatically captured:

```python
from flask_login import login_user

@app.route("/login")
def login():
    user = User.query.get(1)
    login_user(user)
    # User context is now attached to all errors
```

### Logging Handler

Use the logging handler to capture log messages:

```python
import logging
from error_explorer_flask import ErrorExplorerHandler

# Add handler to root logger
handler = ErrorExplorerHandler(level=logging.WARNING)
logging.getLogger().addHandler(handler)

# Now WARNING and above are captured
logging.warning("This will be a breadcrumb")
logging.error("This will be captured as an event")
```

## Event Filtering with before_send

Use the `before_send` callback to filter or modify events before they're sent:

```python
def before_send(event):
    # Drop events from health check endpoints
    if event.get("request", {}).get("url", "").startswith("/health"):
        return None  # Drop the event

    # Add custom tags
    event["tags"] = event.get("tags", {})
    event["tags"]["service"] = "flask-api"

    return event

ErrorExplorer.init({
    "token": "your-token",
    "before_send": before_send,
})
```

## Manual Error Capture

```python
from error_explorer import ErrorExplorer

@app.route("/process")
def process():
    try:
        risky_operation()
    except Exception as e:
        ErrorExplorer.get_client().capture_exception(e)
        return "Error occurred", 500
```

## Adding Context

```python
from error_explorer import ErrorExplorer, Breadcrumb

@app.route("/checkout")
def checkout():
    client = ErrorExplorer.get_client()

    # Add custom breadcrumb
    client.add_breadcrumb(Breadcrumb(
        message="User started checkout",
        category="checkout",
        data={"cart_items": 5}
    ))

    # Set additional context
    client.set_context("order", {
        "total": 99.99,
        "currency": "USD"
    })

    return process_checkout()
```

## License

MIT
