"""
Tests for FastAPI middleware.
"""

import pytest
from unittest.mock import MagicMock, patch
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from error_explorer_fastapi import ErrorExplorerMiddleware
from error_explorer_fastapi.middleware import setup_error_explorer


class TestErrorExplorerMiddleware:
    """Tests for ErrorExplorerMiddleware."""

    def test_middleware_passes_through_when_not_initialized(self, app):
        """Test that middleware passes through when Error Explorer is not initialized."""
        app.add_middleware(ErrorExplorerMiddleware)

        @app.get("/test/")
        def test_view():
            return {"message": "OK"}

        client = TestClient(app)
        response = client.get("/test/")

        assert response.status_code == 200
        assert response.json() == {"message": "OK"}

    def test_middleware_adds_request_breadcrumb(
        self, app, initialized_client, mock_transport
    ):
        """Test that middleware adds request breadcrumb."""
        app.add_middleware(ErrorExplorerMiddleware)

        @app.get("/test/path/")
        def test_view():
            return {"message": "OK"}

        client = TestClient(app)
        client.get("/test/path/")

        breadcrumbs = initialized_client._breadcrumbs
        request_crumbs = [b for b in breadcrumbs if b.category == "http.request"]
        assert len(request_crumbs) == 1
        assert "GET" in request_crumbs[0].message
        assert "/test/path/" in request_crumbs[0].message

    def test_middleware_adds_response_breadcrumb(
        self, app, initialized_client
    ):
        """Test that middleware adds response breadcrumb."""
        app.add_middleware(ErrorExplorerMiddleware)

        @app.get("/test/")
        def test_view():
            return {"message": "OK"}

        client = TestClient(app)
        client.get("/test/")

        breadcrumbs = initialized_client._breadcrumbs
        response_crumbs = [b for b in breadcrumbs if b.category == "http.response"]
        assert len(response_crumbs) == 1
        assert response_crumbs[0].data["status_code"] == 200

    def test_middleware_captures_exception(
        self, app, initialized_client, mock_transport
    ):
        """Test that middleware captures exceptions."""
        app.add_middleware(ErrorExplorerMiddleware)

        @app.get("/error/")
        def error_view():
            raise ValueError("Test error")

        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/error/")

        assert response.status_code == 500
        mock_transport.send.assert_called_once()
        event = mock_transport.send.call_args[0][0]
        assert event["exception_class"] == "ValueError"
        assert "Test error" in event["message"]

    def test_middleware_does_not_capture_404_by_default(
        self, app, initialized_client, mock_transport
    ):
        """Test that 404 errors are not captured by default."""
        app.add_middleware(ErrorExplorerMiddleware)

        @app.get("/trigger404/")
        def trigger_404():
            raise HTTPException(status_code=404, detail="Not found")

        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/trigger404/")

        assert response.status_code == 404
        mock_transport.send.assert_not_called()

    def test_middleware_captures_404_when_configured(
        self, app, initialized_client, mock_transport
    ):
        """Test that 404 errors are captured when configured via direct handler call."""
        from starlette.requests import Request
        from starlette.testclient import TestClient

        middleware = ErrorExplorerMiddleware(app, capture_404=True)

        # Test exception handler directly
        with TestClient(app) as client:
            # Create a mock request
            scope = {
                "type": "http",
                "method": "GET",
                "path": "/test/",
                "query_string": b"",
                "headers": [],
            }
            from starlette.requests import Request
            request = Request(scope)

            # Call handler directly
            middleware._handle_exception(request, HTTPException(status_code=404, detail="Not found"))

        mock_transport.send.assert_called_once()

    def test_middleware_does_not_capture_403_by_default(
        self, app, initialized_client, mock_transport
    ):
        """Test that 403 errors are not captured by default."""
        app.add_middleware(ErrorExplorerMiddleware)

        @app.get("/forbidden/")
        def forbidden_view():
            raise HTTPException(status_code=403, detail="Forbidden")

        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/forbidden/")

        assert response.status_code == 403
        mock_transport.send.assert_not_called()

    def test_get_client_ip_direct(self, app, initialized_client):
        """Test getting client IP from client."""
        app.add_middleware(ErrorExplorerMiddleware)

        @app.get("/test/")
        def test_view():
            return {"message": "OK"}

        client = TestClient(app)
        client.get("/test/")

        # Check request context was set with IP
        contexts = initialized_client._contexts
        assert "request" in contexts
        assert "ip" in contexts["request"]

    def test_get_client_ip_forwarded(self, app, initialized_client):
        """Test getting client IP from X-Forwarded-For."""
        app.add_middleware(ErrorExplorerMiddleware)

        @app.get("/test/")
        def test_view():
            return {"message": "OK"}

        client = TestClient(app)
        client.get("/test/", headers={"X-Forwarded-For": "10.0.0.1, 192.168.1.1"})

        contexts = initialized_client._contexts
        assert contexts["request"]["ip"] == "10.0.0.1"

    def test_get_safe_headers(self, app, initialized_client):
        """Test that only safe headers are included."""
        app.add_middleware(ErrorExplorerMiddleware)

        @app.get("/test/")
        def test_view():
            return {"message": "OK"}

        client = TestClient(app)
        client.get(
            "/test/",
            headers={
                "User-Agent": "TestAgent",
                "Authorization": "Bearer secret",
                "Cookie": "session=abc",
            }
        )

        contexts = initialized_client._contexts
        headers = contexts["request"]["headers"]
        assert "User-Agent" in headers
        assert headers["User-Agent"] == "TestAgent"
        assert "Authorization" not in headers
        assert "Cookie" not in headers

    def test_response_level_based_on_status(
        self, app, initialized_client
    ):
        """Test that response breadcrumb level matches status code."""
        app.add_middleware(ErrorExplorerMiddleware)

        @app.get("/error/")
        def error_view():
            raise HTTPException(status_code=500, detail="Server Error")

        client = TestClient(app, raise_server_exceptions=False)
        client.get("/error/")

        breadcrumbs = initialized_client._breadcrumbs
        response_crumbs = [b for b in breadcrumbs if b.category == "http.response"]
        assert len(response_crumbs) == 1
        assert response_crumbs[0].level == "error"


class TestSetupErrorExplorer:
    """Tests for setup_error_explorer function."""

    def test_setup_adds_middleware(self, app, initialized_client):
        """Test that setup_error_explorer adds middleware."""
        setup_error_explorer(app)

        @app.get("/test/")
        def test_view():
            return {"message": "OK"}

        client = TestClient(app)
        response = client.get("/test/")

        assert response.status_code == 200
        # Verify breadcrumbs were added
        breadcrumbs = initialized_client._breadcrumbs
        assert len(breadcrumbs) >= 1


class TestUserContext:
    """Tests for user context handling."""

    def test_set_user_context_from_request_state(
        self, app, initialized_client
    ):
        """Test that user context is set from request state."""
        app.add_middleware(ErrorExplorerMiddleware, send_default_pii=True)

        @app.middleware("http")
        async def add_user(request, call_next):
            # Simulate auth middleware setting user
            mock_user = MagicMock()
            mock_user.id = 123
            mock_user.username = "testuser"
            mock_user.email = "test@example.com"
            request.state.user = mock_user
            return await call_next(request)

        @app.get("/test/")
        def test_view():
            return {"message": "OK"}

        client = TestClient(app)
        client.get("/test/")

        assert initialized_client._user is not None
        assert initialized_client._user.id == "123"
        assert initialized_client._user.username == "testuser"
        assert initialized_client._user.email == "test@example.com"

    def test_no_user_context_when_disabled(
        self, app, initialized_client
    ):
        """Test that user context is not set when disabled."""
        app.add_middleware(ErrorExplorerMiddleware, capture_user=False)

        @app.middleware("http")
        async def add_user(request, call_next):
            mock_user = MagicMock()
            mock_user.id = 123
            request.state.user = mock_user
            return await call_next(request)

        @app.get("/test/")
        def test_view():
            return {"message": "OK"}

        client = TestClient(app)
        client.get("/test/")

        assert initialized_client._user is None
