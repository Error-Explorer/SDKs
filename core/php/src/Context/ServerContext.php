<?php

declare(strict_types=1);

namespace ErrorExplorer\Context;

/**
 * Collects server/runtime context automatically.
 */
final class ServerContext
{
    /**
     * Collect server context.
     *
     * @return array<string, mixed>
     */
    public static function collect(): array
    {
        return [
            'php_version' => PHP_VERSION,
            'php_sapi' => PHP_SAPI,
            'os' => PHP_OS_FAMILY,
            'hostname' => gethostname() ?: null,
            'memory_peak' => self::formatBytes(memory_get_peak_usage(true)),
            'memory_current' => self::formatBytes(memory_get_usage(true)),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'extensions' => self::getLoadedExtensions(),
        ];
    }

    /**
     * Format bytes to human readable string.
     */
    private static function formatBytes(int $bytes): string
    {
        if ($bytes === 0) {
            return '0 B';
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = floor(log($bytes, 1024));

        return round($bytes / pow(1024, $i), 2) . ' ' . $units[(int) $i];
    }

    /**
     * Get relevant loaded extensions.
     *
     * @return string[]
     */
    private static function getLoadedExtensions(): array
    {
        $relevant = [
            'curl',
            'json',
            'mbstring',
            'pdo',
            'pdo_mysql',
            'pdo_pgsql',
            'redis',
            'memcached',
            'apcu',
            'opcache',
        ];

        return array_values(array_intersect(get_loaded_extensions(), $relevant));
    }
}
