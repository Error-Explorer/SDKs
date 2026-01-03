"""
URL configuration for testing.
"""

from django.urls import path
from django.http import HttpResponse, Http404
from django.core.exceptions import PermissionDenied


def success_view(request):
    """Simple success view."""
    return HttpResponse("OK")


def error_view(request):
    """View that raises an error."""
    raise ValueError("Test error")


def not_found_view(request):
    """View that raises 404."""
    raise Http404("Not found")


def forbidden_view(request):
    """View that raises 403."""
    raise PermissionDenied("Access denied")


urlpatterns = [
    path("success/", success_view, name="success"),
    path("error/", error_view, name="error"),
    path("not-found/", not_found_view, name="not_found"),
    path("forbidden/", forbidden_view, name="forbidden"),
]
