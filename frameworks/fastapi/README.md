# Error Explorer FastAPI SDK

Official FastAPI integration for Error Explorer error tracking.

## Installation

```bash
pip install error-explorer-fastapi
```

## Quick Start

```python
from fastapi import FastAPI
from error_explorer import ErrorExplorer
from error_explorer_fastapi import ErrorExplorerMiddleware

# Initialize Error Explorer
ErrorExplorer.init({
    "token": "your-project-token",
    "environment": "production",
})

# Create FastAPI app with middleware
app = FastAPI()
app.add_middleware(ErrorExplorerMiddleware)

@app.get("/")
async def root():
    return {"message": "Hello, World!"}
```

## Using setup_error_explorer

For convenience, you can use the setup function:

```python
from fastapi import FastAPI
from error_explorer import ErrorExplorer
from error_explorer_fastapi.middleware import setup_error_explorer

app = FastAPI()
ErrorExplorer.init({"token": "your-token"})
setup_error_explorer(app)
```

## Configuration

The middleware accepts several configuration options:

```python
app.add_middleware(
    ErrorExplorerMiddleware,
    # Capture user info from request.state.user
    capture_user=True,
    # Send PII (email, IP address)
    send_default_pii=False,
    # Capture 404 errors
    capture_404=False,
    # Capture 403 errors
    capture_403=False,
)
```

## Features

### Automatic Error Capture

All unhandled exceptions are automatically captured:

```python
@app.get("/error")
async def trigger_error():
    raise ValueError("Something went wrong")
    # This is automatically captured
```

### Request Breadcrumbs

HTTP requests are logged as breadcrumbs:

```
→ GET /api/users
← 200 OK
```

### User Context

Set user context via request state (typically done by auth middleware):

```python
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    user = await get_current_user(request)
    request.state.user = user  # User context captured automatically
    return await call_next(request)
```

### Logging Handler

Use the logging handler to capture log messages:

```python
import logging
from error_explorer_fastapi import ErrorExplorerHandler

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
    event["tags"]["service"] = "api"

    return event

ErrorExplorer.init({
    "token": "your-token",
    "before_send": before_send,
})
```

## Manual Error Capture

```python
from error_explorer import ErrorExplorer

@app.get("/process")
async def process():
    try:
        await risky_operation()
    except Exception as e:
        ErrorExplorer.get_client().capture_exception(e)
        raise HTTPException(status_code=500, detail="Error occurred")
```

## Adding Context

```python
from error_explorer import ErrorExplorer, Breadcrumb

@app.get("/checkout")
async def checkout():
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

    return await process_checkout()
```

## Async Support

The middleware is fully async-compatible:

```python
@app.get("/async-operation")
async def async_operation():
    result = await some_async_function()
    return {"result": result}
```

## License

MIT
