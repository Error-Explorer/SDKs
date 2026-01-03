"""
Tests for Django signals integration.
"""

import pytest
from unittest.mock import MagicMock, patch

from error_explorer_django.signals import (
    setup_signals,
    _on_user_logged_in,
    _on_user_logged_out,
    _on_user_login_failed,
    _on_connection_created,
)


class TestSignalHandlers:
    """Tests for signal handlers."""

    def test_on_user_logged_in(self, initialized_client):
        """Test user login signal handler."""
        mock_user = MagicMock()
        mock_user.pk = 123
        mock_user.username = "testuser"

        _on_user_logged_in(
            sender=None,
            request=MagicMock(),
            user=mock_user,
        )

        breadcrumbs = initialized_client._breadcrumbs
        login_crumbs = [b for b in breadcrumbs if b.category == "auth"]
        assert len(login_crumbs) == 1
        assert "logged in" in login_crumbs[0].message
        assert login_crumbs[0].data["action"] == "login"
        assert login_crumbs[0].data["user_id"] == "123"

    def test_on_user_logged_out(self, initialized_client):
        """Test user logout signal handler."""
        mock_user = MagicMock()
        mock_user.pk = 123
        mock_user.username = "testuser"

        _on_user_logged_out(
            sender=None,
            request=MagicMock(),
            user=mock_user,
        )

        breadcrumbs = initialized_client._breadcrumbs
        logout_crumbs = [b for b in breadcrumbs if b.category == "auth"]
        assert len(logout_crumbs) == 1
        assert "logged out" in logout_crumbs[0].message
        assert logout_crumbs[0].data["action"] == "logout"

    def test_on_user_logged_out_with_none_user(self, initialized_client):
        """Test logout handler with None user."""
        _on_user_logged_out(
            sender=None,
            request=MagicMock(),
            user=None,
        )

        breadcrumbs = initialized_client._breadcrumbs
        logout_crumbs = [b for b in breadcrumbs if b.category == "auth"]
        assert len(logout_crumbs) == 0

    def test_on_user_login_failed(self, initialized_client):
        """Test failed login signal handler."""
        _on_user_login_failed(
            sender=None,
            credentials={"username": "attacker"},
            request=MagicMock(),
        )

        breadcrumbs = initialized_client._breadcrumbs
        failed_crumbs = [b for b in breadcrumbs if b.category == "auth"]
        assert len(failed_crumbs) == 1
        assert "failed" in failed_crumbs[0].message
        assert failed_crumbs[0].data["action"] == "login_failed"
        assert failed_crumbs[0].level == "warning"

    def test_on_user_login_failed_no_credentials(self, initialized_client):
        """Test failed login handler without credentials."""
        _on_user_login_failed(
            sender=None,
            credentials=None,
            request=MagicMock(),
        )

        breadcrumbs = initialized_client._breadcrumbs
        failed_crumbs = [b for b in breadcrumbs if b.category == "auth"]
        assert len(failed_crumbs) == 1
        assert "unknown" in failed_crumbs[0].message

    def test_on_connection_created(self, initialized_client):
        """Test database connection signal handler."""
        mock_connection = MagicMock()
        mock_connection.alias = "default"
        mock_connection.vendor = "postgresql"

        _on_connection_created(
            sender=None,
            connection=mock_connection,
        )

        breadcrumbs = initialized_client._breadcrumbs
        db_crumbs = [b for b in breadcrumbs if b.category == "db"]
        assert len(db_crumbs) == 1
        assert "default" in db_crumbs[0].message
        assert db_crumbs[0].data["vendor"] == "postgresql"

    def test_handlers_do_nothing_when_not_initialized(self):
        """Test that handlers do nothing when Error Explorer is not initialized."""
        from error_explorer import ErrorExplorer
        ErrorExplorer.reset()

        mock_user = MagicMock()
        mock_user.pk = 123
        mock_user.username = "testuser"

        # Should not raise any errors
        _on_user_logged_in(sender=None, request=MagicMock(), user=mock_user)
        _on_user_logged_out(sender=None, request=MagicMock(), user=mock_user)
        _on_user_login_failed(sender=None, credentials={}, request=MagicMock())
        _on_connection_created(sender=None, connection=MagicMock())


class TestSetupSignals:
    """Tests for setup_signals function."""

    def test_setup_signals_only_runs_once(self):
        """Test that setup_signals only connects signals once."""
        import error_explorer_django.signals as signals_module

        # Reset the flag
        signals_module._signals_connected = False

        with patch.object(signals_module, "_connect_auth_signals") as mock_auth:
            with patch.object(signals_module, "_connect_db_signals") as mock_db:
                setup_signals()
                setup_signals()  # Call again

                # Should only be called once
                mock_auth.assert_called_once()
                mock_db.assert_called_once()

        # Reset for other tests
        signals_module._signals_connected = False
