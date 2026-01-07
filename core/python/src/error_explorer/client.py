"""
Main Error Explorer client for Python.
"""

import atexit
import linecache
import logging
import platform
import socket
import sys
import threading
import traceback
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Generator, List, Optional, Type, Union

from .scrubber import DataScrubber
from .transport import HttpTransport, Transport
from .types import (
    Breadcrumb,
    BreadcrumbLevel,
    BreadcrumbType,
    CaptureContext,
    ErrorExplorerOptions,
    Event,
    ExceptionInfo,
    StackFrame,
    User,
)

logger = logging.getLogger("error_explorer")


class ErrorExplorer:
    """
    Main client for Error Explorer SDK.

    This is a singleton class that provides error tracking capabilities.
    """

    _instance: Optional["ErrorExplorer"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "ErrorExplorer":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        # Prevent re-initialization
        pass

    @classmethod
    def init(cls, options: Union[ErrorExplorerOptions, Dict[str, Any]]) -> "ErrorExplorer":
        """
        Initialize the Error Explorer SDK.

        Args:
            options: Configuration options for the SDK.

        Returns:
            The initialized ErrorExplorer instance.
        """
        instance = cls()

        if isinstance(options, dict):
            options = ErrorExplorerOptions(**options)

        with cls._lock:
            instance._options = options
            instance._breadcrumbs: List[Breadcrumb] = []
            instance._user: Optional[User] = None
            instance._tags: Dict[str, str] = {}
            instance._extra: Dict[str, Any] = {}
            instance._contexts: Dict[str, Dict[str, Any]] = {}
            instance._scrubber = DataScrubber(
                fields=options.scrub_fields,
                scrub_pii=not options.send_default_pii,
            )

            # Create transport
            instance._transport: Transport = HttpTransport(
                endpoint=options.endpoint,
                token=options.token,
                hmac_secret=options.hmac_secret,
                timeout=options.timeout,
                background=True,
                debug=options.debug,
            )

            # Store original exception hooks
            instance._original_excepthook = sys.excepthook
            instance._original_threading_excepthook = getattr(
                threading, "excepthook", None
            )
            instance._original_unraisablehook = getattr(sys, "unraisablehook", None)

            # Set up automatic capture
            if options.auto_capture:
                if options.auto_capture.uncaught_exceptions:
                    instance._setup_exception_hooks()
                if options.auto_capture.logging:
                    instance._setup_logging_integration()

            # Register cleanup on exit
            atexit.register(instance.close)

            instance._initialized = True

            if options.debug:
                logger.setLevel(logging.DEBUG)
                handler = logging.StreamHandler()
                handler.setFormatter(
                    logging.Formatter("[ErrorExplorer] %(levelname)s: %(message)s")
                )
                logger.addHandler(handler)
                logger.debug("SDK initialized with endpoint: %s", options.endpoint)

        return instance

    @classmethod
    def get_client(cls) -> Optional["ErrorExplorer"]:
        """Get the current ErrorExplorer instance."""
        return cls._instance

    @classmethod
    def is_initialized(cls) -> bool:
        """Check if the SDK has been initialized."""
        return cls._instance is not None and cls._instance._initialized

    def _setup_exception_hooks(self) -> None:
        """Set up exception hooks for automatic capture."""

        def excepthook(
            exc_type: Type[BaseException],
            exc_value: BaseException,
            exc_tb: Any,
        ) -> None:
            self.capture_exception(exc_value)
            if self._original_excepthook:
                self._original_excepthook(exc_type, exc_value, exc_tb)

        sys.excepthook = excepthook

        # Thread exception hook (Python 3.8+)
        if hasattr(threading, "excepthook"):
            def threading_excepthook(args: Any) -> None:
                self.capture_exception(args.exc_value)
                if self._original_threading_excepthook:
                    self._original_threading_excepthook(args)

            threading.excepthook = threading_excepthook

        # Unraisable exception hook (Python 3.8+)
        if hasattr(sys, "unraisablehook"):
            def unraisablehook(args: Any) -> None:
                if args.exc_value:
                    self.capture_exception(args.exc_value)
                if self._original_unraisablehook:
                    self._original_unraisablehook(args)

            sys.unraisablehook = unraisablehook

    def _setup_logging_integration(self) -> None:
        """Set up logging integration for breadcrumbs."""

        class ErrorExplorerHandler(logging.Handler):
            def __init__(self, client: "ErrorExplorer"):
                super().__init__()
                self.client = client

            def emit(self, record: logging.LogRecord) -> None:
                # Map logging levels to breadcrumb levels
                level_map = {
                    logging.DEBUG: BreadcrumbLevel.DEBUG,
                    logging.INFO: BreadcrumbLevel.INFO,
                    logging.WARNING: BreadcrumbLevel.WARNING,
                    logging.ERROR: BreadcrumbLevel.ERROR,
                    logging.CRITICAL: BreadcrumbLevel.FATAL,
                }
                level = level_map.get(record.levelno, BreadcrumbLevel.INFO)

                self.client.add_breadcrumb(Breadcrumb(
                    message=record.getMessage(),
                    category="logging",
                    type=BreadcrumbType.DEBUG,
                    level=level,
                    data={
                        "logger": record.name,
                        "filename": record.filename,
                        "lineno": record.lineno,
                    },
                ))

        # Add handler to root logger
        root_logger = logging.getLogger()
        handler = ErrorExplorerHandler(self)
        handler.setLevel(logging.DEBUG)
        root_logger.addHandler(handler)

    def _extract_stack_frames(
        self,
        tb: Any,
        limit: int = 50,
    ) -> List[StackFrame]:
        """Extract stack frames from a traceback."""
        frames: List[StackFrame] = []

        while tb is not None and len(frames) < limit:
            frame = tb.tb_frame
            lineno = tb.tb_lineno
            filename = frame.f_code.co_filename
            function = frame.f_code.co_name
            module = frame.f_globals.get("__name__")

            # Get source context
            context_line = None
            pre_context: List[str] = []
            post_context: List[str] = []

            try:
                context_line = linecache.getline(filename, lineno).rstrip()
                for i in range(max(1, lineno - 3), lineno):
                    line = linecache.getline(filename, i)
                    if line:
                        pre_context.append(line.rstrip())
                for i in range(lineno + 1, lineno + 4):
                    line = linecache.getline(filename, i)
                    if line:
                        post_context.append(line.rstrip())
            except Exception:
                pass

            # Determine if frame is in app code
            in_app = True
            if filename.startswith(("<", "frozen ")):
                in_app = False
            elif "site-packages" in filename or "dist-packages" in filename:
                in_app = False

            # Get local variables (scrubbed)
            local_vars = None
            if self._options.attach_stacktrace:
                try:
                    local_vars = self._scrubber.scrub(
                        {k: repr(v)[:200] for k, v in frame.f_locals.items()}
                    )
                except Exception:
                    pass

            frames.append(StackFrame(
                filename=filename,
                lineno=lineno,
                function=function,
                context_line=context_line,
                pre_context=pre_context if pre_context else None,
                post_context=post_context if post_context else None,
                module=module,
                in_app=in_app,
                vars=local_vars,
            ))

            tb = tb.tb_next

        # Reverse frames so most recent is last (as expected by Error Explorer)
        return list(reversed(frames))

    def _clean_filtered_values(self, event_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Clean up [Filtered] values from event dict that would cause validation errors.

        The scrubber replaces sensitive values like emails with '[Filtered]', but this
        can cause validation errors on the server (e.g., '[Filtered]' is not a valid
        email format). This method removes such filtered values from the user context.
        """
        if "user" in event_dict and isinstance(event_dict["user"], dict):
            event_dict["user"] = {
                k: v for k, v in event_dict["user"].items()
                if v != "[Filtered]"
            }
            # If no valid fields remain, remove the user object entirely
            if not event_dict["user"]:
                del event_dict["user"]
        return event_dict

    def _create_exception_info(self, exc: BaseException) -> ExceptionInfo:
        """Create exception info from an exception."""
        exc_type = type(exc)
        tb = exc.__traceback__

        frames = self._extract_stack_frames(tb) if tb else []

        return ExceptionInfo(
            type=exc_type.__name__,
            value=str(exc),
            module=exc_type.__module__,
            stacktrace=frames if frames else None,
        )

    def _get_system_context(self) -> Dict[str, Dict[str, Any]]:
        """Get system context information."""
        contexts: Dict[str, Dict[str, Any]] = {}

        # OS context
        contexts["os"] = {
            "name": platform.system(),
            "version": platform.release(),
            "build": platform.version(),
        }

        # Runtime context
        contexts["runtime"] = {
            "name": "Python",
            "version": platform.python_version(),
            "implementation": platform.python_implementation(),
        }

        # Device context
        try:
            contexts["device"] = {
                "hostname": socket.gethostname(),
                "arch": platform.machine(),
                "processor": platform.processor(),
            }
        except Exception:
            pass

        return contexts

    def _build_webhook_event(
        self,
        event_id: str,
        message: str,
        exception_info: Optional[ExceptionInfo] = None,
        level: str = "error",
        user: Optional[User] = None,
        tags: Optional[Dict[str, str]] = None,
        extra: Optional[Dict[str, Any]] = None,
        contexts: Optional[Dict[str, Dict[str, Any]]] = None,
        fingerprint: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Build event in Error Explorer webhook format.

        This format matches what the server expects (same as browser/node SDKs).
        """
        # Map severity level
        severity_map = {
            "debug": "debug",
            "info": "info",
            "warning": "warning",
            "error": "error",
            "fatal": "critical",
        }
        severity = severity_map.get(level, "error")

        # Build the event
        event: Dict[str, Any] = {
            "message": message,
            "project": self._options.project or "default",
            "severity": severity,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "environment": self._options.environment,
            "sdk": {
                "name": "error-explorer-python",
                "version": "1.0.0",
            },
        }

        # Add release if set
        if self._options.release:
            event["release"] = self._options.release

        # Add exception info
        if exception_info:
            event["exception_class"] = exception_info.type

            # Build full stack trace string
            if exception_info.stacktrace:
                stack_lines = []
                for frame in exception_info.stacktrace:
                    line = f'  File "{frame.filename}", line {frame.lineno}, in {frame.function}'
                    stack_lines.append(line)
                    if frame.context_line:
                        stack_lines.append(f"    {frame.context_line.strip()}")
                stack_lines.append(f"{exception_info.type}: {exception_info.value}")
                event["stack_trace"] = "\n".join(stack_lines)

                # Add parsed frames
                event["frames"] = [
                    {
                        "filename": f.filename,
                        "function": f.function,
                        "lineno": f.lineno,
                        "in_app": f.in_app,
                        "context_line": f.context_line,
                        "pre_context": f.pre_context,
                        "post_context": f.post_context,
                    }
                    for f in exception_info.stacktrace
                ]

                # Set file/line from the last in-app frame or last frame
                in_app_frames = [f for f in exception_info.stacktrace if f.in_app]
                source_frame = in_app_frames[-1] if in_app_frames else (
                    exception_info.stacktrace[-1] if exception_info.stacktrace else None
                )
                if source_frame:
                    event["file"] = source_frame.filename
                    event["line"] = source_frame.lineno
            else:
                # No stack trace available
                event["stack_trace"] = f"{exception_info.type}: {exception_info.value}"

        # Add user context
        if user:
            event["user"] = user.to_dict()

        # Add breadcrumbs
        if self._breadcrumbs:
            event["breadcrumbs"] = [
                {
                    "type": b.type.value if hasattr(b.type, 'value') else str(b.type),
                    "category": b.category,
                    "message": b.message,
                    "level": b.level.value if hasattr(b.level, 'value') else str(b.level),
                    "data": b.data,
                    "timestamp": int(b.timestamp.timestamp() * 1000) if b.timestamp else None,
                }
                for b in self._breadcrumbs
            ]

        # Add tags
        if tags:
            event["tags"] = tags

        # Add extra data
        if extra:
            event["extra"] = extra

        # Add contexts
        if contexts:
            event["contexts"] = contexts

        # Add fingerprint
        if fingerprint:
            event["fingerprint"] = fingerprint

        return event

    def capture_exception(
        self,
        exception: Optional[BaseException] = None,
        context: Optional[Union[CaptureContext, Dict[str, Any]]] = None,
    ) -> Optional[str]:
        """
        Capture an exception and send it to Error Explorer.

        Args:
            exception: The exception to capture. If None, captures current exception.
            context: Additional context for the error.

        Returns:
            The event ID if successful, None otherwise.
        """
        if not self._initialized or not self._options.enabled:
            return None

        # Get current exception if not provided
        if exception is None:
            exc_info = sys.exc_info()
            if exc_info[1] is not None:
                exception = exc_info[1]
            else:
                return None

        # Apply sample rate
        if self._options.sample_rate < 1.0:
            import random
            if random.random() > self._options.sample_rate:
                return None

        # Parse context
        if isinstance(context, dict):
            context = CaptureContext(**context)
        elif context is None:
            context = CaptureContext()

        # Create event
        event_id = uuid.uuid4().hex
        exception_info = self._create_exception_info(exception)

        # Merge contexts
        all_contexts = self._get_system_context()
        all_contexts.update(self._contexts)
        if context.contexts:
            all_contexts.update(context.contexts)

        # Merge tags
        all_tags = dict(self._tags)
        if context.tags:
            all_tags.update(context.tags)

        # Merge extra
        all_extra = dict(self._extra)
        if context.extra:
            all_extra.update(context.extra)

        # Get user
        user = context.user or self._user

        # Build event in webhook format
        event_dict = self._build_webhook_event(
            event_id=event_id,
            message=str(exception),
            exception_info=exception_info,
            level=context.level or "error",
            user=user,
            tags=all_tags,
            extra=all_extra,
            contexts=all_contexts,
            fingerprint=context.fingerprint,
        )

        # Apply before_send hook
        if self._options.before_send:
            event_dict = self._options.before_send(event_dict)
            if event_dict is None:
                return None

        # Scrub sensitive data
        event_dict = self._scrubber.scrub(event_dict)

        # Clean up filtered values that would cause validation errors
        event_dict = self._clean_filtered_values(event_dict)

        # Send event
        return self._transport.send(event_dict)

    def capture_message(
        self,
        message: str,
        level: str = "info",
        context: Optional[Union[CaptureContext, Dict[str, Any]]] = None,
    ) -> Optional[str]:
        """
        Capture a message and send it to Error Explorer.

        Args:
            message: The message to capture.
            level: Severity level (debug, info, warning, error, fatal).
            context: Additional context for the message.

        Returns:
            The event ID if successful, None otherwise.
        """
        if not self._initialized or not self._options.enabled:
            return None

        # Parse context
        if isinstance(context, dict):
            context = CaptureContext(**context)
        elif context is None:
            context = CaptureContext()

        # Create event
        event_id = uuid.uuid4().hex

        # Merge contexts
        all_contexts = self._get_system_context()
        all_contexts.update(self._contexts)
        if context.contexts:
            all_contexts.update(context.contexts)

        # Merge tags
        all_tags = dict(self._tags)
        if context.tags:
            all_tags.update(context.tags)

        # Merge extra
        all_extra = dict(self._extra)
        if context.extra:
            all_extra.update(context.extra)

        # Get user
        user = context.user or self._user

        # Build event in webhook format
        event_dict = self._build_webhook_event(
            event_id=event_id,
            message=message,
            exception_info=None,
            level=level,
            user=user,
            tags=all_tags,
            extra=all_extra,
            contexts=all_contexts,
            fingerprint=context.fingerprint,
        )

        # For messages without exceptions, ensure stack_trace is present (required by server)
        if "stack_trace" not in event_dict:
            event_dict["stack_trace"] = f"Message: {message}"
            event_dict["exception_class"] = "Message"

        # Apply before_send hook
        if self._options.before_send:
            event_dict = self._options.before_send(event_dict)
            if event_dict is None:
                return None

        # Scrub sensitive data
        event_dict = self._scrubber.scrub(event_dict)

        # Clean up filtered values that would cause validation errors
        event_dict = self._clean_filtered_values(event_dict)

        # Send event
        return self._transport.send(event_dict)

    def add_breadcrumb(self, breadcrumb: Union[Breadcrumb, Dict[str, Any]]) -> None:
        """
        Add a breadcrumb to the current context.

        Args:
            breadcrumb: The breadcrumb to add.
        """
        if not self._initialized:
            return

        if isinstance(breadcrumb, dict):
            breadcrumb = Breadcrumb(**breadcrumb)

        # Use breadcrumbs.max_breadcrumbs first, fallback to top-level max_breadcrumbs
        max_breadcrumbs = (
            self._options.breadcrumbs.max_breadcrumbs
            if self._options.breadcrumbs
            else self._options.max_breadcrumbs
        )
        if len(self._breadcrumbs) >= max_breadcrumbs:
            self._breadcrumbs = self._breadcrumbs[-(max_breadcrumbs - 1):]

        self._breadcrumbs.append(breadcrumb)

    def clear_breadcrumbs(self) -> None:
        """Clear all breadcrumbs."""
        self._breadcrumbs = []

    def set_user(self, user: Optional[Union[User, Dict[str, Any]]]) -> None:
        """
        Set the current user context.

        Args:
            user: User information, or None to clear.
        """
        if not self._initialized:
            return

        if user is None:
            self._user = None
        elif isinstance(user, dict):
            self._user = User(**user)
        else:
            self._user = user

    def clear_user(self) -> None:
        """Clear the current user context."""
        self._user = None

    def set_tag(self, key: str, value: str) -> None:
        """
        Set a tag that will be sent with all events.

        Args:
            key: Tag name.
            value: Tag value.
        """
        if not self._initialized:
            return
        self._tags[key] = value

    def set_tags(self, tags: Dict[str, str]) -> None:
        """
        Set multiple tags.

        Args:
            tags: Dictionary of tags.
        """
        if not self._initialized:
            return
        self._tags.update(tags)

    def remove_tag(self, key: str) -> None:
        """Remove a tag."""
        self._tags.pop(key, None)

    def set_extra(self, key: str, value: Any) -> None:
        """
        Set extra data that will be sent with all events.

        Args:
            key: Extra data key.
            value: Extra data value.
        """
        if not self._initialized:
            return
        self._extra[key] = value

    def set_context(self, name: str, context: Dict[str, Any]) -> None:
        """
        Set a named context.

        Args:
            name: Context name.
            context: Context data.
        """
        if not self._initialized:
            return
        self._contexts[name] = context

    @contextmanager
    def push_scope(self) -> Generator["Scope", None, None]:
        """
        Push a new scope that will be merged with the current context.

        Usage:
            with error_explorer.push_scope() as scope:
                scope.set_tag("key", "value")
                scope.set_user({"id": "123"})
                # Error captured here will include these settings
        """
        scope = Scope(self)
        try:
            yield scope
        finally:
            scope._restore()

    def flush(self, timeout: float = 2.0) -> bool:
        """
        Flush any pending events.

        Args:
            timeout: Maximum time to wait for flush.

        Returns:
            True if all events were flushed successfully.
        """
        if not self._initialized:
            return True
        return self._transport.flush(timeout)

    def close(self) -> None:
        """Close the SDK and release resources."""
        if not self._initialized:
            return

        # Restore original hooks
        if hasattr(self, "_original_excepthook") and self._original_excepthook:
            sys.excepthook = self._original_excepthook

        if hasattr(threading, "excepthook") and hasattr(self, "_original_threading_excepthook"):
            if self._original_threading_excepthook:
                threading.excepthook = self._original_threading_excepthook

        if hasattr(sys, "unraisablehook") and hasattr(self, "_original_unraisablehook"):
            if self._original_unraisablehook:
                sys.unraisablehook = self._original_unraisablehook

        # Flush and close transport
        self.flush()
        self._transport.close()

        self._initialized = False

    @classmethod
    def reset(cls) -> None:
        """Reset the singleton instance (mainly for testing)."""
        if cls._instance is not None:
            cls._instance.close()
            cls._instance = None


class Scope:
    """
    Temporary scope for adding context to errors.
    """

    def __init__(self, client: ErrorExplorer):
        self._client = client
        self._original_user = client._user
        self._original_tags = dict(client._tags)
        self._original_extra = dict(client._extra)
        self._original_contexts = dict(client._contexts)

    def set_user(self, user: Optional[Union[User, Dict[str, Any]]]) -> None:
        """Set user for this scope."""
        self._client.set_user(user)

    def set_tag(self, key: str, value: str) -> None:
        """Set a tag for this scope."""
        self._client.set_tag(key, value)

    def set_tags(self, tags: Dict[str, str]) -> None:
        """Set multiple tags for this scope."""
        self._client.set_tags(tags)

    def set_extra(self, key: str, value: Any) -> None:
        """Set extra data for this scope."""
        self._client.set_extra(key, value)

    def set_context(self, name: str, context: Dict[str, Any]) -> None:
        """Set a named context for this scope."""
        self._client.set_context(name, context)

    def add_breadcrumb(self, breadcrumb: Union[Breadcrumb, Dict[str, Any]]) -> None:
        """Add a breadcrumb in this scope."""
        self._client.add_breadcrumb(breadcrumb)

    def _restore(self) -> None:
        """Restore the original scope."""
        self._client._user = self._original_user
        self._client._tags = self._original_tags
        self._client._extra = self._original_extra
        self._client._contexts = self._original_contexts
