<?php

declare(strict_types=1);

namespace ErrorExplorer\Breadcrumbs;

/**
 * Manages breadcrumbs in memory during request lifecycle.
 *
 * Breadcrumbs are stored in a static array and cleared after each error is sent.
 * This is memory-efficient as PHP releases memory at the end of each request.
 */
final class BreadcrumbManager
{
    /** @var array<int, array{type: string, category: string, message: string, level: string, data: array<string, mixed>, timestamp: float}> */
    private static array $breadcrumbs = [];

    private static int $maxBreadcrumbs = 50;

    /**
     * Add a breadcrumb.
     *
     * @param array{
     *     type?: string,
     *     category?: string,
     *     message?: string,
     *     level?: string,
     *     data?: array<string, mixed>,
     *     timestamp?: float
     * } $breadcrumb
     */
    public static function add(array $breadcrumb): void
    {
        $entry = [
            'type' => $breadcrumb['type'] ?? 'custom',
            'category' => $breadcrumb['category'] ?? 'default',
            'message' => $breadcrumb['message'] ?? '',
            'level' => $breadcrumb['level'] ?? 'info',
            'data' => $breadcrumb['data'] ?? [],
            'timestamp' => $breadcrumb['timestamp'] ?? microtime(true),
        ];

        self::$breadcrumbs[] = $entry;

        // FIFO: keep only the last N breadcrumbs
        if (count(self::$breadcrumbs) > self::$maxBreadcrumbs) {
            array_shift(self::$breadcrumbs);
        }
    }

    /**
     * Add an HTTP request breadcrumb.
     */
    public static function addHttpRequest(string $method, string $url, int $statusCode, float $duration): void
    {
        self::add([
            'type' => 'http',
            'category' => 'http.request',
            'message' => sprintf('%s %s', $method, $url),
            'level' => $statusCode >= 400 ? 'error' : 'info',
            'data' => [
                'method' => $method,
                'url' => $url,
                'status_code' => $statusCode,
                'duration_ms' => round($duration * 1000, 2),
            ],
        ]);
    }

    /**
     * Add a database query breadcrumb.
     */
    public static function addQuery(string $sql, float $duration, ?string $connection = null): void
    {
        // Truncate long queries
        $message = strlen($sql) > 100 ? substr($sql, 0, 100) . '...' : $sql;

        self::add([
            'type' => 'query',
            'category' => 'db.query',
            'message' => $message,
            'level' => 'info',
            'data' => [
                'sql' => $sql,
                'duration_ms' => round($duration * 1000, 2),
                'connection' => $connection,
            ],
        ]);
    }

    /**
     * Add a log entry breadcrumb.
     *
     * @param array<string, mixed> $context
     */
    public static function addLog(string $level, string $message, array $context = []): void
    {
        self::add([
            'type' => 'log',
            'category' => 'log',
            'message' => $message,
            'level' => self::normalizeLogLevel($level),
            'data' => $context,
        ]);
    }

    /**
     * Add a console command breadcrumb.
     */
    public static function addCommand(string $command, int $exitCode): void
    {
        self::add([
            'type' => 'command',
            'category' => 'console',
            'message' => $command,
            'level' => $exitCode === 0 ? 'info' : 'error',
            'data' => [
                'exit_code' => $exitCode,
            ],
        ]);
    }

    /**
     * Add a cache operation breadcrumb.
     */
    public static function addCache(string $operation, string $key, bool $hit): void
    {
        self::add([
            'type' => 'cache',
            'category' => 'cache',
            'message' => sprintf('%s %s', strtoupper($operation), $key),
            'level' => 'debug',
            'data' => [
                'operation' => $operation,
                'key' => $key,
                'hit' => $hit,
            ],
        ]);
    }

    /**
     * Add a user action breadcrumb.
     *
     * @param array<string, mixed> $data
     */
    public static function addUserAction(string $action, array $data = []): void
    {
        self::add([
            'type' => 'user-action',
            'category' => 'user',
            'message' => $action,
            'level' => 'info',
            'data' => $data,
        ]);
    }

    /**
     * Add a navigation breadcrumb.
     */
    public static function addNavigation(string $from, string $to): void
    {
        self::add([
            'type' => 'navigation',
            'category' => 'navigation',
            'message' => sprintf('%s → %s', $from, $to),
            'level' => 'info',
            'data' => [
                'from' => $from,
                'to' => $to,
            ],
        ]);
    }

    /**
     * Get all breadcrumbs.
     *
     * @return array<int, array{type: string, category: string, message: string, level: string, data: array<string, mixed>, timestamp: float}>
     */
    public static function getAll(): array
    {
        return self::$breadcrumbs;
    }

    /**
     * Clear all breadcrumbs.
     */
    public static function clear(): void
    {
        self::$breadcrumbs = [];
    }

    /**
     * Set maximum number of breadcrumbs to keep.
     */
    public static function setMaxBreadcrumbs(int $max): void
    {
        self::$maxBreadcrumbs = $max;
    }

    /**
     * Get current count of breadcrumbs.
     */
    public static function count(): int
    {
        return count(self::$breadcrumbs);
    }

    /**
     * Normalize log level to our standard levels.
     * Backend only accepts: debug, info, warning, error
     */
    private static function normalizeLogLevel(string $level): string
    {
        $level = strtolower($level);

        return match ($level) {
            'emergency', 'alert', 'critical', 'error' => 'error',
            'warning', 'warn' => 'warning',
            'notice', 'info' => 'info',
            'debug' => 'debug',
            default => 'info',
        };
    }
}
