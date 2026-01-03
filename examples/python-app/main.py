#!/usr/bin/env python3
"""
Example Python application demonstrating Error Explorer SDK integration.

This example shows how to:
1. Initialize the SDK
2. Capture exceptions automatically
3. Add breadcrumbs for debugging
4. Set user context
5. Use tags and extra data
6. Use scope for isolated context
"""

import time
import random
from error_explorer import (
    ErrorExplorer,
    Breadcrumb,
    BreadcrumbType,
    BreadcrumbLevel,
    User,
    CaptureContext,
)


def main():
    """Main application entry point."""

    # Initialize Error Explorer SDK
    print("[1] Initializing Error Explorer SDK...")

    client = ErrorExplorer.init({
        "token": "ee_e513876a065d185931592689e7b5bc59c4e412b53261b233e62ffd5e05c4",
        "hmac_secret": "dbaffa598398fa4d34bdbdfc3474bc0b424748b23310fe64cfc42d5fd73ae234",
        "project": "test-symfony-errors",
        "environment": "development",
        "release": "1.0.0",
        "endpoint": "http://error-explorer.localhost/api/v1/webhook",
        "debug": True,
        "auto_capture": {
            "uncaught_exceptions": True,
            "unhandled_threads": True,
            "logging": True,
        },
    })

    print("   SDK initialized successfully!")

    # Set user context
    print("\n[2] Setting user context...")
    client.set_user(User(
        id="12345",  # Must be a valid UUID or integer
        email="developer@example.com",
        username="dev_user",
    ))
    print("   User context set: 12345")

    # Set global tags
    print("\n[3] Setting global tags...")
    client.set_tags({
        "app_version": "1.0.0",
        "platform": "python",
        "feature_flags": "beta_features",
    })
    print("   Tags set: app_version, platform, feature_flags")

    # Add some breadcrumbs to simulate user actions
    print("\n[4] Adding breadcrumbs...")

    client.add_breadcrumb(Breadcrumb(
        message="Application started",
        category="lifecycle",
        type=BreadcrumbType.DEBUG,
        level=BreadcrumbLevel.INFO,
    ))

    client.add_breadcrumb(Breadcrumb(
        message="User authenticated",
        category="auth",
        type=BreadcrumbType.USER,
        level=BreadcrumbLevel.INFO,
        data={"method": "oauth", "provider": "google"},
    ))

    client.add_breadcrumb(Breadcrumb(
        message="Loaded user preferences",
        category="data",
        type=BreadcrumbType.QUERY,
        level=BreadcrumbLevel.DEBUG,
        data={"preferences_count": 15},
    ))

    print("   Added 3 breadcrumbs")

    # Simulate some application work
    print("\n[5] Simulating application work...")
    simulate_work(client)

    # Capture a manual message
    print("\n[6] Capturing info message...")
    client.capture_message(
        "Application checkpoint reached",
        level="info",
        context=CaptureContext(
            tags={"checkpoint": "main_flow"},
            extra={"elapsed_time": "5s"},
        ),
    )
    print("   Message captured")

    # Demonstrate scope usage
    print("\n[7] Demonstrating scope usage...")
    with client.push_scope() as scope:
        scope.set_tag("scope_tag", "scoped_value")
        scope.set_user(User(id="99999"))
        scope.add_breadcrumb(Breadcrumb(
            message="Action in scope",
            category="scope",
        ))

        # Capture error within scope
        try:
            process_with_scope()
        except ValueError as e:
            client.capture_exception(e)
            print("   Error captured in scope")

    print("   Scope restored to original context")

    # Demonstrate error capture
    print("\n[8] Demonstrating error capture...")
    try:
        process_data({"invalid": "data"})
    except Exception as e:
        event_id = client.capture_exception(e, CaptureContext(
            tags={"error_source": "data_processing"},
            extra={"input_data": {"invalid": "data"}},
        ))
        print(f"   Exception captured with event_id: {event_id}")

    # Demonstrate async error wrapper
    print("\n[9] Demonstrating safe function execution...")
    safe_result = safe_execute(client, risky_operation)
    print(f"   Safe execution result: {safe_result}")

    # Flush and close
    print("\n[10] Flushing and closing SDK...")
    client.flush(timeout=5.0)
    client.close()
    print("   SDK closed successfully!")

    print("\n" + "=" * 50)
    print("Example completed! Check your Error Explorer dashboard.")
    print("=" * 50)


def simulate_work(client: ErrorExplorer):
    """Simulate some application work with breadcrumbs."""
    steps = [
        ("Fetching data from API", "http"),
        ("Processing response", "data"),
        ("Updating cache", "cache"),
        ("Rendering results", "ui"),
    ]

    for message, category in steps:
        client.add_breadcrumb(Breadcrumb(
            message=message,
            category=category,
            type=BreadcrumbType.DEFAULT,
            level=BreadcrumbLevel.INFO,
        ))
        time.sleep(0.1)  # Simulate work
        print(f"   - {message}")


def process_with_scope():
    """Function that raises an error within scope."""
    raise ValueError("Error in scoped operation")


def process_data(data: dict):
    """Process data and potentially raise errors."""
    if "valid_key" not in data:
        raise KeyError("Missing required key: valid_key")

    return data["valid_key"]


def risky_operation():
    """Operation that might fail."""
    if random.random() < 0.5:
        raise RuntimeError("Random failure in risky operation")
    return "success"


def safe_execute(client: ErrorExplorer, func):
    """Execute a function and capture any errors."""
    try:
        return func()
    except Exception as e:
        client.capture_exception(e, CaptureContext(
            tags={"execution": "safe_execute"},
        ))
        return None


if __name__ == "__main__":
    main()
