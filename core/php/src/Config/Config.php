<?php

declare(strict_types=1);

namespace ErrorExplorer\Config;

/**
 * Configuration for Error Explorer SDK.
 */
final class Config
{
    private const DEFAULT_ENDPOINT = 'https://error-explorer.com/api/v1/webhook';
    private const DEFAULT_TIMEOUT = 3;
    private const DEFAULT_RETRY = 2;
    private const DEFAULT_MAX_BREADCRUMBS = 50;

    private const DEFAULT_SCRUB_FIELDS = [
        'password',
        'passwd',
        'secret',
        'token',
        'api_key',
        'apikey',
        'access_token',
        'auth_token',
        'authorization',
        'credit_card',
        'card_number',
        'cvv',
        'ssn',
    ];

    private string $token;
    private string $endpoint;
    private string $environment;
    private ?string $release;
    private bool $captureExceptions;
    private bool $captureErrors;
    private bool $captureFatalErrors;
    private int $maxBreadcrumbs;
    private bool $asyncTransport;
    private int $timeout;
    private int $retry;
    /** @var string[] */
    private array $scrubFields;
    private bool $hmacEnabled;
    private ?string $hmacSecret;
    private string $hmacAlgorithm;

    /**
     * @param string[] $scrubFields
     */
    private function __construct(
        string $token,
        string $endpoint,
        string $environment,
        ?string $release,
        bool $captureExceptions,
        bool $captureErrors,
        bool $captureFatalErrors,
        int $maxBreadcrumbs,
        bool $asyncTransport,
        int $timeout,
        int $retry,
        array $scrubFields,
        bool $hmacEnabled,
        ?string $hmacSecret,
        string $hmacAlgorithm,
    ) {
        $this->token = $token;
        $this->endpoint = $endpoint;
        $this->environment = $environment;
        $this->release = $release;
        $this->captureExceptions = $captureExceptions;
        $this->captureErrors = $captureErrors;
        $this->captureFatalErrors = $captureFatalErrors;
        $this->maxBreadcrumbs = $maxBreadcrumbs;
        $this->asyncTransport = $asyncTransport;
        $this->timeout = $timeout;
        $this->retry = $retry;
        $this->scrubFields = $scrubFields;
        $this->hmacEnabled = $hmacEnabled;
        $this->hmacSecret = $hmacSecret;
        $this->hmacAlgorithm = $hmacAlgorithm;
    }

    /**
     * Create config from array options.
     *
     * @param array{
     *     token?: string,
     *     dsn?: string,
     *     endpoint?: string,
     *     environment?: string,
     *     release?: string,
     *     capture?: array{exceptions?: bool, errors?: bool, fatal_errors?: bool},
     *     breadcrumbs?: array{max_breadcrumbs?: int},
     *     transport?: array{async?: bool, timeout?: int, retry?: int},
     *     scrub_fields?: string[],
     *     security?: array{hmac_enabled?: bool, hmac_secret?: string, hmac_algorithm?: string}
     * } $options
     */
    public static function fromArray(array $options): self
    {
        // Parse DSN if provided
        $token = $options['token'] ?? '';
        $endpoint = $options['endpoint'] ?? self::DEFAULT_ENDPOINT;

        if (isset($options['dsn'])) {
            [$token, $endpoint] = self::parseDsn($options['dsn']);
        }

        // Allow "disabled" as a special token value to skip initialization
        if (empty($token) || $token === 'disabled') {
            throw new \InvalidArgumentException('Error Explorer token is required. Provide "token" or "dsn" option. Use enabled: false to disable the SDK.');
        }

        // Build full endpoint URL with token
        $fullEndpoint = rtrim($endpoint, '/') . '/' . $token;

        // Capture options
        $capture = $options['capture'] ?? [];
        $captureExceptions = $capture['exceptions'] ?? true;
        $captureErrors = $capture['errors'] ?? true;
        $captureFatalErrors = $capture['fatal_errors'] ?? true;

        // Breadcrumbs options
        $breadcrumbs = $options['breadcrumbs'] ?? [];
        $maxBreadcrumbs = $breadcrumbs['max_breadcrumbs'] ?? self::DEFAULT_MAX_BREADCRUMBS;

        // Transport options
        $transport = $options['transport'] ?? [];
        $asyncTransport = $transport['async'] ?? true;
        $timeout = $transport['timeout'] ?? self::DEFAULT_TIMEOUT;
        $retry = $transport['retry'] ?? self::DEFAULT_RETRY;

        // Scrub fields
        $scrubFields = array_merge(
            self::DEFAULT_SCRUB_FIELDS,
            $options['scrub_fields'] ?? []
        );

        // Security options (HMAC)
        $security = $options['security'] ?? [];
        $hmacEnabled = $security['hmac_enabled'] ?? false;
        $hmacSecret = $security['hmac_secret'] ?? null;
        $hmacAlgorithm = $security['hmac_algorithm'] ?? 'sha256';

        // Validate HMAC config
        if ($hmacEnabled && empty($hmacSecret)) {
            throw new \InvalidArgumentException('HMAC secret is required when HMAC is enabled.');
        }

        // Environment detection
        $environment = $options['environment'] ?? self::detectEnvironment();
        $release = $options['release'] ?? null;

        return new self(
            $token,
            $fullEndpoint,
            $environment,
            $release,
            $captureExceptions,
            $captureErrors,
            $captureFatalErrors,
            $maxBreadcrumbs,
            $asyncTransport,
            $timeout,
            $retry,
            $scrubFields,
            $hmacEnabled,
            $hmacSecret,
            $hmacAlgorithm,
        );
    }

    /**
     * Parse DSN format: https://token@error-explorer.com/api/v1/webhook
     *
     * @return array{0: string, 1: string} [token, endpoint]
     */
    private static function parseDsn(string $dsn): array
    {
        $parsed = parse_url($dsn);

        if ($parsed === false || !isset($parsed['host'])) {
            throw new \InvalidArgumentException('Invalid DSN format.');
        }

        $token = $parsed['user'] ?? '';
        $scheme = $parsed['scheme'] ?? 'https';
        $host = $parsed['host'];
        $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';
        $path = $parsed['path'] ?? '/api/v1/webhook';

        // Remove token from path if present
        $path = preg_replace('#/[a-zA-Z0-9_-]+$#', '', $path);

        $endpoint = sprintf('%s://%s%s%s', $scheme, $host, $port, $path);

        return [$token, $endpoint];
    }

    /**
     * Auto-detect environment from common env variables.
     */
    private static function detectEnvironment(): string
    {
        // Symfony
        if (isset($_ENV['APP_ENV'])) {
            return $_ENV['APP_ENV'];
        }

        // Laravel
        if (isset($_ENV['APP_ENVIRONMENT'])) {
            return $_ENV['APP_ENVIRONMENT'];
        }

        // Generic
        if (isset($_ENV['ENVIRONMENT'])) {
            return $_ENV['ENVIRONMENT'];
        }

        if (isset($_ENV['ENV'])) {
            return $_ENV['ENV'];
        }

        // Default
        return 'production';
    }

    public function getToken(): string
    {
        return $this->token;
    }

    public function getEndpoint(): string
    {
        return $this->endpoint;
    }

    public function getEnvironment(): string
    {
        return $this->environment;
    }

    public function getRelease(): ?string
    {
        return $this->release;
    }

    public function shouldCaptureExceptions(): bool
    {
        return $this->captureExceptions;
    }

    public function shouldCaptureErrors(): bool
    {
        return $this->captureErrors;
    }

    public function shouldCaptureFatalErrors(): bool
    {
        return $this->captureFatalErrors;
    }

    public function getMaxBreadcrumbs(): int
    {
        return $this->maxBreadcrumbs;
    }

    public function isAsyncTransport(): bool
    {
        return $this->asyncTransport;
    }

    public function getTimeout(): int
    {
        return $this->timeout;
    }

    public function getRetry(): int
    {
        return $this->retry;
    }

    /**
     * @return string[]
     */
    public function getScrubFields(): array
    {
        return $this->scrubFields;
    }

    public function isHmacEnabled(): bool
    {
        return $this->hmacEnabled;
    }

    public function getHmacSecret(): ?string
    {
        return $this->hmacSecret;
    }

    public function getHmacAlgorithm(): string
    {
        return $this->hmacAlgorithm;
    }
}
