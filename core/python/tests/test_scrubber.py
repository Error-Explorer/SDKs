"""
Tests for data scrubber.
"""

import pytest
from error_explorer.scrubber import DataScrubber


class TestDataScrubber:
    """Tests for DataScrubber class."""

    def test_scrub_password_field(self) -> None:
        scrubber = DataScrubber()
        data = {"username": "john", "password": "secret123"}
        result = scrubber.scrub(data)
        assert result["username"] == "john"
        assert result["password"] == "[Filtered]"

    def test_scrub_api_key_variations(self) -> None:
        scrubber = DataScrubber()
        data = {
            "api_key": "key123",
            "apikey": "key456",
            "API_KEY": "key789",
        }
        result = scrubber.scrub(data)
        assert all(v == "[Filtered]" for v in result.values())

    def test_scrub_credit_card_field(self) -> None:
        scrubber = DataScrubber()
        data = {
            "credit_card": "4111111111111111",
            "card_number": "1234567890123456",
            "cvv": "123",
        }
        result = scrubber.scrub(data)
        assert result["credit_card"] == "[Filtered]"
        assert result["card_number"] == "[Filtered]"
        assert result["cvv"] == "[Filtered]"

    def test_scrub_nested_data(self) -> None:
        scrubber = DataScrubber()
        data = {
            "user": {
                "name": "John",
                "login_info": {
                    "password": "secret",
                    "api_key": "key123",
                },
            },
        }
        result = scrubber.scrub(data)
        assert result["user"]["name"] == "John"
        assert result["user"]["login_info"]["password"] == "[Filtered]"
        assert result["user"]["login_info"]["api_key"] == "[Filtered]"

    def test_scrub_credentials_key(self) -> None:
        """Test that 'credentials' key itself is scrubbed."""
        scrubber = DataScrubber()
        data = {
            "credentials": {"password": "secret", "key": "value"},
        }
        result = scrubber.scrub(data)
        # The entire credentials value should be scrubbed since 'credentials' is sensitive
        assert result["credentials"] == "[Filtered]"

    def test_scrub_list_of_dicts(self) -> None:
        scrubber = DataScrubber()
        data = [
            {"name": "Alice", "password": "pass1"},
            {"name": "Bob", "password": "pass2"},
        ]
        result = scrubber.scrub(data)
        assert result[0]["name"] == "Alice"
        assert result[0]["password"] == "[Filtered]"
        assert result[1]["name"] == "Bob"
        assert result[1]["password"] == "[Filtered]"

    def test_scrub_tuple(self) -> None:
        scrubber = DataScrubber()
        data = ({"password": "secret"}, {"name": "test"})
        result = scrubber.scrub(data)
        assert isinstance(result, tuple)
        assert result[0]["password"] == "[Filtered]"
        assert result[1]["name"] == "test"

    def test_custom_fields(self) -> None:
        scrubber = DataScrubber(fields=["custom_secret", "my_private_key"])
        data = {
            "custom_secret": "value",
            "my_private_key": "key",
            "public_data": "visible",
        }
        result = scrubber.scrub(data)
        assert result["custom_secret"] == "[Filtered]"
        assert result["my_private_key"] == "[Filtered]"
        assert result["public_data"] == "visible"

    def test_custom_replacement(self) -> None:
        scrubber = DataScrubber(replacement="***REDACTED***")
        data = {"password": "secret"}
        result = scrubber.scrub(data)
        assert result["password"] == "***REDACTED***"

    def test_preserves_non_sensitive_data(self) -> None:
        scrubber = DataScrubber()
        data = {
            "name": "John Doe",
            "age": 30,
            "active": True,
            "score": 95.5,
            "tags": ["user", "admin"],
        }
        result = scrubber.scrub(data)
        assert result == data

    def test_handles_none_values(self) -> None:
        scrubber = DataScrubber()
        data = {"password": None, "name": None}
        result = scrubber.scrub(data)
        assert result["password"] == "[Filtered]"
        assert result["name"] is None

    def test_deep_nesting_limit(self) -> None:
        scrubber = DataScrubber()
        # Create deeply nested structure
        data: dict = {"level": 0}
        current = data
        for i in range(25):
            current["nested"] = {"level": i + 1}
            current = current["nested"]
        current["password"] = "secret"

        result = scrubber.scrub(data)
        # At depth > 20, should return replacement
        assert "[Filtered]" in str(result)

    def test_pii_scrubbing_credit_card_pattern(self) -> None:
        scrubber = DataScrubber(scrub_pii=True)
        data = {"message": "Card number is 4111-1111-1111-1111 for this user"}
        result = scrubber.scrub(data)
        assert "4111" not in result["message"]
        assert "[Filtered]" in result["message"]

    def test_pii_scrubbing_ssn_pattern(self) -> None:
        scrubber = DataScrubber(scrub_pii=True)
        data = {"note": "SSN: 123-45-6789"}
        result = scrubber.scrub(data)
        assert "123-45-6789" not in result["note"]

    def test_pii_scrubbing_email_pattern(self) -> None:
        scrubber = DataScrubber(scrub_pii=True)
        data = {"log": "User test@example.com logged in"}
        result = scrubber.scrub(data)
        assert "test@example.com" not in result["log"]

    def test_pii_scrubbing_jwt_token(self) -> None:
        scrubber = DataScrubber(scrub_pii=True)
        jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
        data = {"auth": f"Token: {jwt}"}
        result = scrubber.scrub(data)
        assert "eyJ" not in result["auth"]

    def test_scrub_headers(self) -> None:
        scrubber = DataScrubber()
        headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer secret_token",
            "X-Api-Key": "my_api_key",
            "User-Agent": "Mozilla/5.0",
            "Cookie": "session=abc123",
        }
        result = scrubber.scrub_headers(headers)
        assert result["Content-Type"] == "application/json"
        assert result["Authorization"] == "[Filtered]"
        assert result["X-Api-Key"] == "[Filtered]"
        assert result["User-Agent"] == "Mozilla/5.0"

    def test_scrub_url_basic(self) -> None:
        scrubber = DataScrubber()
        url = "https://api.example.com/users?id=123&api_key=secret"
        result = scrubber.scrub_url(url)
        assert "api_key=%5BFiltered%5D" in result or "api_key=[Filtered]" in result
        assert "id=123" in result

    def test_scrub_url_multiple_sensitive_params(self) -> None:
        scrubber = DataScrubber()
        url = "https://api.example.com/auth?password=secret&token=abc123&user=john"
        result = scrubber.scrub_url(url)
        assert "password" in result
        assert "secret" not in result
        assert "token" in result
        assert "abc123" not in result
        assert "john" in result

    def test_scrub_url_no_query_string(self) -> None:
        scrubber = DataScrubber()
        url = "https://api.example.com/users"
        result = scrubber.scrub_url(url)
        assert result == url

    def test_scrub_url_invalid_url(self) -> None:
        scrubber = DataScrubber()
        url = "not a valid url"
        result = scrubber.scrub_url(url)
        assert result == url

    def test_partial_key_matching(self) -> None:
        scrubber = DataScrubber()
        data = {
            "user_password": "secret1",
            "password_hash": "secret2",
            "my_api_key_value": "key123",
            "x_auth_token_id": "token456",
        }
        result = scrubber.scrub(data)
        assert all(v == "[Filtered]" for v in result.values())

    def test_case_insensitive_key_matching(self) -> None:
        scrubber = DataScrubber()
        data = {
            "PASSWORD": "secret1",
            "Password": "secret2",
            "pAsSwOrD": "secret3",
        }
        result = scrubber.scrub(data)
        assert all(v == "[Filtered]" for v in result.values())

    def test_empty_data(self) -> None:
        scrubber = DataScrubber()
        assert scrubber.scrub({}) == {}
        assert scrubber.scrub([]) == []
        assert scrubber.scrub("") == ""
        assert scrubber.scrub(None) is None

    def test_numeric_and_boolean_values(self) -> None:
        scrubber = DataScrubber()
        data = {
            "count": 42,
            "active": True,
            "ratio": 3.14,
        }
        result = scrubber.scrub(data)
        assert result == data
