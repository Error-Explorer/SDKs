"""
Data scrubbing utilities for sensitive information.
"""

import re
from typing import Any, Dict, List, Optional, Pattern, Set, Union


class DataScrubber:
    """
    Scrubs sensitive data from error payloads.
    """

    DEFAULT_FIELDS = frozenset([
        "password",
        "passwd",
        "secret",
        "api_key",
        "apikey",
        "access_token",
        "auth_token",
        "credentials",
        "credit_card",
        "creditcard",
        "card_number",
        "cardnumber",
        "cvv",
        "cvc",
        "ssn",
        "social_security",
        "private_key",
        "privatekey",
        "authorization",
        "auth",
        "token",
    ])

    DEFAULT_PATTERNS = [
        # Credit card numbers (basic pattern)
        re.compile(r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b"),
        # SSN pattern
        re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
        # Email addresses (for PII scrubbing)
        re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
        # API keys (common formats)
        re.compile(r"\b(sk_|pk_|api_|key_)[a-zA-Z0-9]{20,}\b"),
        # Bearer tokens
        re.compile(r"\bBearer\s+[a-zA-Z0-9._-]+\b", re.IGNORECASE),
        # JWT tokens
        re.compile(r"\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\b"),
    ]

    REPLACEMENT = "[Filtered]"

    def __init__(
        self,
        fields: Optional[List[str]] = None,
        patterns: Optional[List[Pattern[str]]] = None,
        scrub_pii: bool = False,
        replacement: str = "[Filtered]",
    ):
        """
        Initialize the data scrubber.

        Args:
            fields: Additional field names to scrub (case-insensitive).
            patterns: Additional regex patterns to scrub.
            scrub_pii: Whether to scrub personally identifiable information.
            replacement: String to replace sensitive data with.
        """
        self.fields: Set[str] = set(self.DEFAULT_FIELDS)
        if fields:
            self.fields.update(f.lower() for f in fields)

        self.patterns: List[Pattern[str]] = list(self.DEFAULT_PATTERNS) if scrub_pii else []
        if patterns:
            self.patterns.extend(patterns)

        self.replacement = replacement
        self.scrub_pii = scrub_pii

    def _is_sensitive_key(self, key: str) -> bool:
        """Check if a key name indicates sensitive data."""
        # Normalize the key: lowercase and replace hyphens with underscores
        key_normalized = key.lower().replace("-", "_")
        return any(
            field in key_normalized
            for field in self.fields
        )

    def _scrub_string(self, value: str) -> str:
        """Apply pattern-based scrubbing to a string value."""
        result = value
        for pattern in self.patterns:
            result = pattern.sub(self.replacement, result)
        return result

    def scrub(self, data: Any, depth: int = 0) -> Any:
        """
        Recursively scrub sensitive data from a value.

        Args:
            data: The data to scrub (dict, list, or scalar).
            depth: Current recursion depth (to prevent infinite loops).

        Returns:
            The scrubbed data.
        """
        if depth > 20:  # Prevent infinite recursion
            return self.replacement

        if isinstance(data, dict):
            return self._scrub_dict(data, depth)
        elif isinstance(data, list):
            return self._scrub_list(data, depth)
        elif isinstance(data, tuple):
            return tuple(self._scrub_list(list(data), depth))
        elif isinstance(data, str):
            if self.patterns:
                return self._scrub_string(data)
            return data
        else:
            return data

    def _scrub_dict(self, data: Dict[str, Any], depth: int) -> Dict[str, Any]:
        """Scrub a dictionary."""
        result: Dict[str, Any] = {}

        for key, value in data.items():
            if self._is_sensitive_key(str(key)):
                result[key] = self.replacement
            elif isinstance(value, dict):
                result[key] = self._scrub_dict(value, depth + 1)
            elif isinstance(value, (list, tuple)):
                result[key] = self.scrub(value, depth + 1)
            elif isinstance(value, str) and self.patterns:
                result[key] = self._scrub_string(value)
            else:
                result[key] = value

        return result

    def _scrub_list(self, data: List[Any], depth: int) -> List[Any]:
        """Scrub a list."""
        return [self.scrub(item, depth + 1) for item in data]

    def scrub_headers(self, headers: Dict[str, str]) -> Dict[str, str]:
        """
        Scrub HTTP headers, preserving safe headers.

        Args:
            headers: Dictionary of HTTP headers.

        Returns:
            Scrubbed headers dictionary.
        """
        safe_headers = {
            "accept",
            "accept-encoding",
            "accept-language",
            "cache-control",
            "content-length",
            "content-type",
            "host",
            "origin",
            "referer",
            "user-agent",
            "x-forwarded-for",
            "x-forwarded-proto",
            "x-real-ip",
            "x-request-id",
        }

        result: Dict[str, str] = {}
        for key, value in headers.items():
            key_lower = key.lower()
            if key_lower in safe_headers:
                result[key] = value
            elif self._is_sensitive_key(key):
                result[key] = self.replacement
            else:
                result[key] = value

        return result

    def scrub_url(self, url: str) -> str:
        """
        Scrub sensitive parameters from a URL.

        Args:
            url: The URL to scrub.

        Returns:
            URL with sensitive query parameters scrubbed.
        """
        from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

        try:
            parsed = urlparse(url)
            if not parsed.query:
                return url

            params = parse_qs(parsed.query, keep_blank_values=True)
            scrubbed_params: Dict[str, List[str]] = {}

            for key, values in params.items():
                if self._is_sensitive_key(key):
                    scrubbed_params[key] = [self.replacement]
                else:
                    scrubbed_params[key] = values

            # Reconstruct URL with scrubbed params
            new_query = urlencode(scrubbed_params, doseq=True)
            new_url = urlunparse((
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                new_query,
                parsed.fragment,
            ))
            return new_url

        except Exception:
            return url
