"""
Tests for Django middleware.
"""

import pytest
from unittest.mock import MagicMock, patch
from django.test import RequestFactory, override_settings
from django.http import HttpResponse, Http404
from django.core.exceptions import PermissionDenied
from django.contrib.auth.models import AnonymousUser

from error_explorer_django.middleware import ErrorExplorerMiddleware


class TestErrorExplorerMiddleware:
    """Tests for ErrorExplorerMiddleware."""

    @pytest.fixture
    def request_factory(self):
        """Create request factory."""
        return RequestFactory()

    @pytest.fixture
    def middleware(self):
        """Create middleware instance."""
        get_response = MagicMock(return_value=HttpResponse("OK"))
        return ErrorExplorerMiddleware(get_response)

    def test_middleware_passes_through_when_not_initialized(
        self, request_factory, middleware
    ):
        """Test that middleware passes through when Error Explorer is not initialized."""
        request = request_factory.get("/test/")
        response = middleware(request)

        assert response.status_code == 200
        middleware.get_response.assert_called_once_with(request)

    def test_middleware_adds_request_breadcrumb(
        self, request_factory, middleware, initialized_client, mock_transport
    ):
        """Test that middleware adds request breadcrumb."""
        request = request_factory.get("/test/path/")
        request.user = AnonymousUser()

        middleware(request)

        # Check that addBreadcrumb was called
        breadcrumbs = initialized_client._breadcrumbs
        assert len(breadcrumbs) >= 1

        # Find the request breadcrumb
        request_crumbs = [b for b in breadcrumbs if b.category == "http.request"]
        assert len(request_crumbs) == 1
        assert "GET" in request_crumbs[0].message
        assert "/test/path/" in request_crumbs[0].message

    def test_middleware_adds_response_breadcrumb(
        self, request_factory, middleware, initialized_client
    ):
        """Test that middleware adds response breadcrumb."""
        request = request_factory.get("/test/")
        request.user = AnonymousUser()

        middleware(request)

        breadcrumbs = initialized_client._breadcrumbs
        response_crumbs = [b for b in breadcrumbs if b.category == "http.response"]
        assert len(response_crumbs) == 1
        assert response_crumbs[0].data["status_code"] == 200

    def test_middleware_sets_user_context_for_authenticated_user(
        self, request_factory, middleware, initialized_client
    ):
        """Test that middleware sets user context for authenticated users."""
        request = request_factory.get("/test/")

        # Create a mock authenticated user
        mock_user = MagicMock()
        mock_user.is_authenticated = True
        mock_user.pk = 123
        mock_user.get_username.return_value = "testuser"
        mock_user.get_full_name.return_value = "Test User"
        request.user = mock_user

        middleware(request)

        # Check user was set
        assert initialized_client._user is not None
        assert initialized_client._user.id == "123"
        assert initialized_client._user.username == "testuser"

    def test_middleware_does_not_set_user_for_anonymous(
        self, request_factory, middleware, initialized_client
    ):
        """Test that middleware doesn't set user for anonymous users."""
        request = request_factory.get("/test/")
        request.user = AnonymousUser()

        middleware(request)

        assert initialized_client._user is None

    def test_middleware_captures_exception(
        self, request_factory, initialized_client, mock_transport
    ):
        """Test that middleware captures exceptions."""
        def raise_error(request):
            raise ValueError("Test error")

        middleware = ErrorExplorerMiddleware(raise_error)
        request = request_factory.get("/test/")
        request.user = AnonymousUser()

        with pytest.raises(ValueError):
            middleware(request)

        mock_transport.send.assert_called_once()
        event = mock_transport.send.call_args[0][0]
        assert event["exception_class"] == "ValueError"
        assert "Test error" in event["message"]

    def test_middleware_does_not_capture_404_by_default(
        self, request_factory, initialized_client, mock_transport
    ):
        """Test that 404 errors are not captured by default."""
        def raise_404(request):
            raise Http404("Not found")

        middleware = ErrorExplorerMiddleware(raise_404)
        request = request_factory.get("/test/")
        request.user = AnonymousUser()

        with pytest.raises(Http404):
            middleware(request)

        mock_transport.send.assert_not_called()

    @override_settings(ERROR_EXPLORER={"token": "test", "capture_404": True})
    def test_middleware_captures_404_when_configured(
        self, request_factory, initialized_client, mock_transport
    ):
        """Test that 404 errors are captured when configured."""
        def raise_404(request):
            raise Http404("Not found")

        middleware = ErrorExplorerMiddleware(raise_404)
        request = request_factory.get("/test/")
        request.user = AnonymousUser()

        with pytest.raises(Http404):
            middleware(request)

        mock_transport.send.assert_called_once()

    def test_middleware_does_not_capture_403_by_default(
        self, request_factory, initialized_client, mock_transport
    ):
        """Test that 403 errors are not captured by default."""
        def raise_403(request):
            raise PermissionDenied("Forbidden")

        middleware = ErrorExplorerMiddleware(raise_403)
        request = request_factory.get("/test/")
        request.user = AnonymousUser()

        with pytest.raises(PermissionDenied):
            middleware(request)

        mock_transport.send.assert_not_called()

    def test_process_exception_hook(
        self, request_factory, middleware, initialized_client, mock_transport
    ):
        """Test process_exception hook."""
        request = request_factory.get("/test/")
        request.user = AnonymousUser()
        exception = ValueError("Test exception")

        result = middleware.process_exception(request, exception)

        assert result is None  # Should return None to let Django handle it
        mock_transport.send.assert_called_once()

    def test_get_client_ip_direct(self, request_factory, middleware):
        """Test getting client IP from REMOTE_ADDR."""
        request = request_factory.get("/test/")
        request.META["REMOTE_ADDR"] = "192.168.1.1"

        ip = middleware._get_client_ip(request)
        assert ip == "192.168.1.1"

    def test_get_client_ip_forwarded(self, request_factory, middleware):
        """Test getting client IP from X-Forwarded-For."""
        request = request_factory.get("/test/")
        request.META["HTTP_X_FORWARDED_FOR"] = "10.0.0.1, 192.168.1.1"
        request.META["REMOTE_ADDR"] = "127.0.0.1"

        ip = middleware._get_client_ip(request)
        assert ip == "10.0.0.1"

    def test_get_safe_headers(self, request_factory, middleware):
        """Test that only safe headers are included."""
        request = request_factory.get("/test/")
        request.META["HTTP_USER_AGENT"] = "TestAgent"
        request.META["HTTP_AUTHORIZATION"] = "Bearer secret"
        request.META["HTTP_COOKIE"] = "session=abc"

        headers = middleware._get_safe_headers(request)

        assert "User-Agent" in headers
        assert headers["User-Agent"] == "TestAgent"
        assert "Authorization" not in headers
        assert "Cookie" not in headers
