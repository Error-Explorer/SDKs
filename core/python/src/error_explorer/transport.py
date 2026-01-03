"""
Transport layer for sending events to Error Explorer.
"""

import hashlib
import hmac
import json
import logging
import time
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Tuple
from queue import Queue, Empty
from threading import Thread, Event as ThreadEvent

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False

logger = logging.getLogger("error_explorer.transport")


class Transport(ABC):
    """Abstract base class for transports."""

    @abstractmethod
    def send(self, event: Dict[str, Any]) -> Optional[str]:
        """
        Send an event to Error Explorer.

        Args:
            event: The event dictionary to send.

        Returns:
            The event ID if successful, None otherwise.
        """
        pass

    @abstractmethod
    def flush(self, timeout: float = 2.0) -> bool:
        """
        Flush any pending events.

        Args:
            timeout: Maximum time to wait for flush.

        Returns:
            True if all events were flushed successfully.
        """
        pass

    @abstractmethod
    def close(self) -> None:
        """Close the transport and release resources."""
        pass


class HttpTransport(Transport):
    """
    HTTP transport for sending events synchronously or via background thread.
    """

    def __init__(
        self,
        endpoint: str,
        token: str,
        hmac_secret: Optional[str] = None,
        timeout: float = 10.0,
        background: bool = True,
        debug: bool = False,
    ):
        if not HAS_REQUESTS:
            raise ImportError(
                "requests package is required for HttpTransport. "
                "Install it with: pip install requests"
            )

        self.endpoint = endpoint
        self.token = token
        self.hmac_secret = hmac_secret
        self.timeout = timeout
        self.debug = debug
        self.background = background

        self._session = requests.Session()
        self._session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "error-explorer-python/1.0.0",
        })

        self._queue: Queue[Optional[Dict[str, Any]]] = Queue()
        self._worker: Optional[Thread] = None
        self._shutdown = ThreadEvent()

        if background:
            self._start_worker()

    def _start_worker(self) -> None:
        """Start the background worker thread."""
        self._worker = Thread(target=self._worker_loop, daemon=True)
        self._worker.start()

    def _worker_loop(self) -> None:
        """Background worker loop for processing events."""
        while not self._shutdown.is_set():
            try:
                event = self._queue.get(timeout=0.5)
                if event is None:  # Shutdown signal
                    break
                self._send_sync(event)
            except Empty:
                continue
            except Exception as e:
                if self.debug:
                    logger.exception("Error in transport worker: %s", e)

    def _generate_hmac(self, payload: str, timestamp: int) -> str:
        """
        Generate HMAC signature for the payload.

        The signature format matches the Node.js SDK:
        - Sign: timestamp.payload
        - Return: hex-encoded signature (no prefix)
        """
        if not self.hmac_secret:
            return ""

        signed_payload = f"{timestamp}.{payload}"
        signature = hmac.new(
            self.hmac_secret.encode("utf-8"),
            signed_payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        return signature

    def _build_hmac_headers(self, payload: str) -> Dict[str, str]:
        """Build HMAC headers for the request."""
        if not self.hmac_secret:
            return {}

        timestamp = int(time.time())
        signature = self._generate_hmac(payload, timestamp)

        return {
            "X-Webhook-Signature": signature,
            "X-Webhook-Timestamp": str(timestamp),
        }

    def _send_sync(self, event: Dict[str, Any]) -> Optional[str]:
        """Send event synchronously."""
        try:
            payload = json.dumps(event)
            headers = {
                "X-Webhook-Token": self.token,
            }

            # Add HMAC headers if secret is configured
            headers.update(self._build_hmac_headers(payload))

            response = self._session.post(
                self.endpoint,
                data=payload,
                headers=headers,
                timeout=self.timeout,
            )

            if response.status_code >= 200 and response.status_code < 300:
                if self.debug:
                    logger.debug("Event sent successfully: %s", event.get("event_id"))
                return event.get("event_id")
            else:
                if self.debug:
                    logger.warning(
                        "Failed to send event: %s - %s",
                        response.status_code,
                        response.text[:200]
                    )
                return None

        except requests.exceptions.Timeout:
            if self.debug:
                logger.warning("Request timeout sending event")
            return None
        except requests.exceptions.RequestException as e:
            if self.debug:
                logger.warning("Request error sending event: %s", e)
            return None
        except Exception as e:
            if self.debug:
                logger.exception("Unexpected error sending event: %s", e)
            return None

    def send(self, event: Dict[str, Any]) -> Optional[str]:
        """
        Send an event to Error Explorer.

        If background mode is enabled, the event is queued for async sending.
        Otherwise, it's sent synchronously.
        """
        if self.background:
            self._queue.put(event)
            return event.get("event_id")
        else:
            return self._send_sync(event)

    def flush(self, timeout: float = 2.0) -> bool:
        """Wait for all queued events to be sent."""
        if not self.background:
            return True

        start = time.time()
        while not self._queue.empty():
            if time.time() - start > timeout:
                return False
            time.sleep(0.1)
        return True

    def close(self) -> None:
        """Close the transport and stop the worker."""
        self._shutdown.set()
        if self.background:
            self._queue.put(None)  # Signal worker to stop
            if self._worker and self._worker.is_alive():
                self._worker.join(timeout=2.0)
        self._session.close()


class AsyncHttpTransport(Transport):
    """
    Async HTTP transport for sending events using aiohttp.
    """

    def __init__(
        self,
        endpoint: str,
        token: str,
        hmac_secret: Optional[str] = None,
        timeout: float = 10.0,
        debug: bool = False,
    ):
        if not HAS_AIOHTTP:
            raise ImportError(
                "aiohttp package is required for AsyncHttpTransport. "
                "Install it with: pip install aiohttp"
            )

        self.endpoint = endpoint
        self.token = token
        self.hmac_secret = hmac_secret
        self.timeout = timeout
        self.debug = debug
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> "aiohttp.ClientSession":
        """Get or create the aiohttp session."""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "error-explorer-python/1.0.0",
                }
            )
        return self._session

    def _generate_hmac(self, payload: str, timestamp: int) -> str:
        """
        Generate HMAC signature for the payload.

        The signature format matches the Node.js SDK:
        - Sign: timestamp.payload
        - Return: hex-encoded signature (no prefix)
        """
        if not self.hmac_secret:
            return ""

        signed_payload = f"{timestamp}.{payload}"
        signature = hmac.new(
            self.hmac_secret.encode("utf-8"),
            signed_payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        return signature

    def _build_hmac_headers(self, payload: str) -> Dict[str, str]:
        """Build HMAC headers for the request."""
        if not self.hmac_secret:
            return {}

        timestamp = int(time.time())
        signature = self._generate_hmac(payload, timestamp)

        return {
            "X-Webhook-Signature": signature,
            "X-Webhook-Timestamp": str(timestamp),
        }

    async def send_async(self, event: Dict[str, Any]) -> Optional[str]:
        """Send event asynchronously."""
        try:
            session = await self._get_session()
            payload = json.dumps(event)
            headers = {
                "X-Webhook-Token": self.token,
            }

            # Add HMAC headers if secret is configured
            headers.update(self._build_hmac_headers(payload))

            async with session.post(
                self.endpoint,
                data=payload,
                headers=headers,
            ) as response:
                if response.status >= 200 and response.status < 300:
                    if self.debug:
                        logger.debug("Event sent successfully: %s", event.get("event_id"))
                    return event.get("event_id")
                else:
                    if self.debug:
                        text = await response.text()
                        logger.warning(
                            "Failed to send event: %s - %s",
                            response.status,
                            text[:200]
                        )
                    return None

        except Exception as e:
            if self.debug:
                logger.exception("Error sending event: %s", e)
            return None

    def send(self, event: Dict[str, Any]) -> Optional[str]:
        """
        Sync wrapper for send_async.

        Note: For proper async usage, use send_async() directly.
        """
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We're in an async context, return immediately
                # The caller should use send_async instead
                return event.get("event_id")
            else:
                return loop.run_until_complete(self.send_async(event))
        except RuntimeError:
            # No event loop, create one
            return asyncio.run(self.send_async(event))

    def flush(self, timeout: float = 2.0) -> bool:
        """No-op for async transport - events are sent immediately."""
        return True

    async def close_async(self) -> None:
        """Close the aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()

    def close(self) -> None:
        """Close the transport."""
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if not loop.is_running():
                loop.run_until_complete(self.close_async())
        except RuntimeError:
            asyncio.run(self.close_async())
