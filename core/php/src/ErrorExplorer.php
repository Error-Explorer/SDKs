<?php

declare(strict_types=1);

namespace ErrorExplorer;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\Capture\ErrorHandler;
use ErrorExplorer\Capture\ExceptionHandler;
use ErrorExplorer\Capture\ShutdownHandler;
use ErrorExplorer\Config\Config;
use ErrorExplorer\Context\RequestContext;
use ErrorExplorer\Context\ServerContext;
use ErrorExplorer\Context\UserContext;
use ErrorExplorer\Security\DataScrubber;
use ErrorExplorer\Transport\HttpTransport;

/**
 * Error Explorer SDK - Main entry point.
 *
 * Captures errors automatically with zero configuration.
 * Just call ErrorExplorer::init(['token' => 'your_token']) and you're done.
 */
final class ErrorExplorer
{
    private static ?self $instance = null;
    private static bool $initialized = false;

    private Config $config;
    private HttpTransport $transport;
    private DataScrubber $scrubber;

    /** @var array<string, mixed> */
    private array $user = [];

    /** @var array<string, string> */
    private array $tags = [];

    /** @var array<string, mixed> */
    private array $extra = [];

    private function __construct(Config $config)
    {
        $this->config = $config;
        $this->transport = new HttpTransport($config);
        $this->scrubber = new DataScrubber($config->getScrubFields());
    }

    /**
     * Initialize the SDK with configuration.
     *
     * @param array{
     *     token?: string,
     *     dsn?: string,
     *     environment?: string,
     *     release?: string,
     *     capture?: array{exceptions?: bool, errors?: bool, fatal_errors?: bool},
     *     breadcrumbs?: array{max_breadcrumbs?: int},
     *     transport?: array{async?: bool, timeout?: int, retry?: int},
     *     scrub_fields?: string[]
     * } $options
     */
    public static function init(array $options): void
    {
        if (self::$initialized) {
            return;
        }

        $config = Config::fromArray($options);
        self::$instance = new self($config);

        // Register error handlers
        if ($config->shouldCaptureExceptions()) {
            ExceptionHandler::register();
        }

        if ($config->shouldCaptureErrors()) {
            ErrorHandler::register();
        }

        if ($config->shouldCaptureFatalErrors()) {
            ShutdownHandler::register();
        }

        self::$initialized = true;
    }

    /**
     * Check if SDK is initialized.
     */
    public static function isInitialized(): bool
    {
        return self::$initialized;
    }

    /**
     * Get the singleton instance.
     */
    public static function getInstance(): ?self
    {
        return self::$instance;
    }

    /**
     * Add a breadcrumb to track user journey.
     *
     * @param array{
     *     type?: string,
     *     category?: string,
     *     message?: string,
     *     level?: string,
     *     data?: array<string, mixed>
     * } $breadcrumb
     */
    public static function addBreadcrumb(array $breadcrumb): void
    {
        BreadcrumbManager::add($breadcrumb);
    }

    /**
     * Set user context for error reports.
     *
     * @param array{id?: string, email?: string, username?: string, name?: string, role?: string} $user
     */
    public static function setUser(array $user): void
    {
        if (self::$instance !== null) {
            self::$instance->user = $user;
        }
    }

    /**
     * Clear user context.
     */
    public static function clearUser(): void
    {
        if (self::$instance !== null) {
            self::$instance->user = [];
        }
    }

    /**
     * Set tags for filtering in dashboard.
     *
     * @param array<string, string> $tags
     */
    public static function setTags(array $tags): void
    {
        if (self::$instance !== null) {
            self::$instance->tags = array_merge(self::$instance->tags, $tags);
        }
    }

    /**
     * Set a single tag.
     */
    public static function setTag(string $key, string $value): void
    {
        if (self::$instance !== null) {
            self::$instance->tags[$key] = $value;
        }
    }

    /**
     * Set extra context data.
     *
     * @param array<string, mixed> $extra
     */
    public static function setExtra(array $extra): void
    {
        if (self::$instance !== null) {
            self::$instance->extra = array_merge(self::$instance->extra, $extra);
        }
    }

    /**
     * Capture an exception manually.
     *
     * @param array<string, mixed> $context
     */
    public static function captureException(\Throwable $exception, array $context = []): ?string
    {
        if (self::$instance === null) {
            return null;
        }

        return self::$instance->doCapture($exception, $context);
    }

    /**
     * Capture a message without an exception.
     */
    public static function captureMessage(string $message, string $level = 'info'): ?string
    {
        if (self::$instance === null) {
            return null;
        }

        $exception = new \Exception($message);

        return self::$instance->doCapture($exception, ['level' => $level]);
    }

    /**
     * Flush pending events (for long-running processes).
     */
    public static function flush(int $timeout = 2): bool
    {
        if (self::$instance === null) {
            return false;
        }

        return self::$instance->transport->flush($timeout);
    }

    /**
     * Close the SDK and flush remaining events.
     */
    public static function close(int $timeout = 2): bool
    {
        $result = self::flush($timeout);
        self::$instance = null;
        self::$initialized = false;
        BreadcrumbManager::clear();

        return $result;
    }

    /**
     * Internal: Capture and send an exception.
     *
     * @param array<string, mixed> $context
     */
    public function doCapture(\Throwable $exception, array $context = []): ?string
    {
        $eventId = $this->generateEventId();

        $payload = $this->buildPayload($exception, $context, $eventId);
        $payload = $this->scrubber->scrub($payload);

        $this->transport->send($payload);

        // Clear breadcrumbs after sending
        BreadcrumbManager::clear();

        return $eventId;
    }

    /**
     * Get current configuration.
     */
    public function getConfig(): Config
    {
        return $this->config;
    }

    /**
     * Get current user context.
     *
     * @return array<string, mixed>
     */
    public function getUser(): array
    {
        return $this->user;
    }

    /**
     * Get current tags.
     *
     * @return array<string, string>
     */
    public function getTags(): array
    {
        return $this->tags;
    }

    /**
     * Get current extra data.
     *
     * @return array<string, mixed>
     */
    public function getExtra(): array
    {
        return $this->extra;
    }

    /**
     * Build the full payload to send.
     *
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function buildPayload(\Throwable $exception, array $context, string $eventId): array
    {
        $trace = $exception->getTraceAsString();
        $file = $exception->getFile();
        $line = $exception->getLine();

        return [
            // Error block
            'event_id' => $eventId,
            'message' => $exception->getMessage(),
            'exception_class' => get_class($exception),
            'file' => $file,
            'line' => $line,
            'stack_trace' => $trace,
            'severity' => $context['level'] ?? 'error',
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),

            // Project block
            'environment' => $this->config->getEnvironment(),
            'release' => $this->config->getRelease(),

            // User block
            'user' => !empty($this->user) ? $this->user : null,

            // Request block
            'request' => RequestContext::collect(),

            // Server block
            'server' => ServerContext::collect(),

            // Breadcrumbs
            'breadcrumbs' => BreadcrumbManager::getAll(),

            // Tags & Extra
            'tags' => array_merge($this->tags, $context['tags'] ?? []),
            'extra' => array_merge($this->extra, $context['extra'] ?? []),

            // SDK info
            'sdk' => [
                'name' => 'error-explorer/php-sdk',
                'version' => '1.0.0',
            ],
        ];
    }

    /**
     * Generate a unique event ID.
     */
    private function generateEventId(): string
    {
        return bin2hex(random_bytes(16));
    }
}
