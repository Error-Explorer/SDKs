"""
Tests for Flask extension.
"""

import pytest
from unittest.mock import MagicMock, patch
from flask import Flask

from error_explorer_flask import ErrorExplorerFlask


class TestErrorExplorerFlask:
    """Tests for ErrorExplorerFlask extension."""

    def test_extension_init_with_app(self, app):
        """Test extension initialization with app."""
        ext = ErrorExplorerFlask(app)

        assert "error_explorer" in app.extensions
        assert app.extensions["error_explorer"] is ext

    def test_extension_init_app_later(self, app):
        """Test extension initialization with factory pattern."""
        ext = ErrorExplorerFlask()
        ext.init_app(app)

        assert "error_explorer" in app.extensions

    def test_extension_passes_through_when_not_initialized(
        self, app
    ):
        """Test that extension passes through when Error Explorer is not initialized."""
        ErrorExplorerFlask(app)

        @app.route("/test/")
        def test_view():
            return "OK"

        with app.test_client() as client:
            response = client.get("/test/")
            assert response.status_code == 200
            assert response.data == b"OK"

    def test_extension_adds_request_breadcrumb(
        self, app, initialized_client, mock_transport
    ):
        """Test that extension adds request breadcrumb."""
        ErrorExplorerFlask(app)

        @app.route("/test/path/")
        def test_view():
            return "OK"

        with app.test_client() as client:
            client.get("/test/path/")

        breadcrumbs = initialized_client._breadcrumbs
        request_crumbs = [b for b in breadcrumbs if b.category == "http.request"]
        assert len(request_crumbs) == 1
        assert "GET" in request_crumbs[0].message
        assert "/test/path/" in request_crumbs[0].message

    def test_extension_adds_response_breadcrumb(
        self, app, initialized_client
    ):
        """Test that extension adds response breadcrumb."""
        ErrorExplorerFlask(app)

        @app.route("/test/")
        def test_view():
            return "OK"

        with app.test_client() as client:
            client.get("/test/")

        breadcrumbs = initialized_client._breadcrumbs
        response_crumbs = [b for b in breadcrumbs if b.category == "http.response"]
        assert len(response_crumbs) == 1
        assert response_crumbs[0].data["status_code"] == 200

    def test_extension_captures_exception(
        self, app, initialized_client, mock_transport
    ):
        """Test that extension captures exceptions."""
        ErrorExplorerFlask(app)

        @app.route("/error/")
        def error_view():
            raise ValueError("Test error")

        with app.test_client() as client:
            with pytest.raises(ValueError):
                client.get("/error/")

        mock_transport.send.assert_called_once()
        event = mock_transport.send.call_args[0][0]
        assert event["exception_class"] == "ValueError"
        assert "Test error" in event["message"]

    def test_extension_does_not_capture_404_by_default(
        self, app, initialized_client, mock_transport
    ):
        """Test that 404 errors are not captured by default."""
        ErrorExplorerFlask(app)

        with app.test_client() as client:
            response = client.get("/nonexistent/")
            assert response.status_code == 404

        # Should not capture 404
        mock_transport.send.assert_not_called()

    def test_extension_captures_404_when_configured(
        self, initialized_client, mock_transport
    ):
        """Test that 404 errors are captured when configured via manual exception handling."""
        from werkzeug.exceptions import NotFound
        from flask import Flask

        # Create a new app with capture_404 enabled
        app = Flask(__name__)
        app.config["TESTING"] = True
        app.config["ERROR_EXPLORER"] = {
            "capture_404": True,
        }
        ext = ErrorExplorerFlask(app)

        # Manually test the exception handler
        with app.test_request_context("/test/"):
            ext._handle_exception(NotFound("Page not found"))

        mock_transport.send.assert_called_once()

    def test_extension_does_not_capture_403_by_default(
        self, app, initialized_client, mock_transport
    ):
        """Test that 403 errors are not captured by default."""
        from werkzeug.exceptions import Forbidden

        ErrorExplorerFlask(app)

        @app.route("/forbidden/")
        def forbidden_view():
            raise Forbidden("Access denied")

        with app.test_client() as client:
            response = client.get("/forbidden/")
            assert response.status_code == 403

        mock_transport.send.assert_not_called()

    def test_get_client_ip_direct(self, app):
        """Test getting client IP from remote_addr."""
        ext = ErrorExplorerFlask(app)

        @app.route("/test/")
        def test_view():
            return ext._get_client_ip()

        with app.test_client() as client:
            response = client.get("/test/")
            # Test client uses 127.0.0.1
            assert b"127.0.0.1" in response.data

    def test_get_client_ip_forwarded(self, app):
        """Test getting client IP from X-Forwarded-For."""
        ext = ErrorExplorerFlask(app)

        @app.route("/test/")
        def test_view():
            return ext._get_client_ip()

        with app.test_client() as client:
            response = client.get(
                "/test/",
                headers={"X-Forwarded-For": "10.0.0.1, 192.168.1.1"}
            )
            assert b"10.0.0.1" in response.data

    def test_get_safe_headers(self, app):
        """Test that only safe headers are included."""
        ext = ErrorExplorerFlask(app)

        @app.route("/test/")
        def test_view():
            headers = ext._get_safe_headers()
            return str(headers)

        with app.test_client() as client:
            response = client.get(
                "/test/",
                headers={
                    "User-Agent": "TestAgent",
                    "Authorization": "Bearer secret",
                    "Cookie": "session=abc",
                }
            )
            data = response.data.decode()
            assert "TestAgent" in data
            assert "secret" not in data
            assert "session" not in data

    def test_response_level_based_on_status(
        self, app, initialized_client
    ):
        """Test that response breadcrumb level matches status code."""
        ErrorExplorerFlask(app)

        @app.route("/error/")
        def error_view():
            return "Server Error", 500

        with app.test_client() as client:
            client.get("/error/")

        breadcrumbs = initialized_client._breadcrumbs
        response_crumbs = [b for b in breadcrumbs if b.category == "http.response"]
        assert len(response_crumbs) == 1
        assert response_crumbs[0].level == "error"


class TestFlaskLoginIntegration:
    """Tests for Flask-Login integration."""

    def test_set_user_context_without_flask_login(
        self, app, initialized_client
    ):
        """Test that extension works without Flask-Login."""
        ErrorExplorerFlask(app)

        @app.route("/test/")
        def test_view():
            return "OK"

        with app.test_client() as client:
            client.get("/test/")

        # Should not raise and user should be None
        assert initialized_client._user is None

    def test_set_user_context_with_mock_flask_login(
        self, app, initialized_client
    ):
        """Test user context with mocked Flask-Login."""
        ext = ErrorExplorerFlask(app)

        mock_user = MagicMock()
        mock_user.is_authenticated = True
        mock_user.id = 123
        mock_user.username = "testuser"
        mock_user.email = "test@example.com"

        @app.route("/test/")
        def test_view():
            return "OK"

        # Mock the entire flask_login module for the import
        import sys
        mock_flask_login = MagicMock()
        mock_flask_login.current_user = mock_user
        sys.modules["flask_login"] = mock_flask_login

        try:
            with app.test_client() as client:
                client.get("/test/")

            assert initialized_client._user is not None
            assert initialized_client._user.id == "123"
            assert initialized_client._user.username == "testuser"
        finally:
            del sys.modules["flask_login"]
