<?php

declare(strict_types=1);

namespace ErrorExplorer\Capture;

use ErrorExplorer\ErrorExplorer;

/**
 * Handles fatal errors via shutdown function.
 */
final class ShutdownHandler
{
    private static bool $registered = false;

    /**
     * Fatal error types to capture.
     */
    private const FATAL_ERRORS = [
        E_ERROR,
        E_PARSE,
        E_CORE_ERROR,
        E_COMPILE_ERROR,
    ];

    /**
     * Register the shutdown handler.
     */
    public static function register(): void
    {
        if (self::$registered) {
            return;
        }

        register_shutdown_function([self::class, 'handle']);
        self::$registered = true;
    }

    /**
     * Handle shutdown - check for fatal errors.
     */
    public static function handle(): void
    {
        $error = error_get_last();

        if ($error === null) {
            return;
        }

        if (!in_array($error['type'], self::FATAL_ERRORS, true)) {
            return;
        }

        $exception = new \ErrorException(
            $error['message'],
            0,
            $error['type'],
            $error['file'],
            $error['line']
        );

        ErrorExplorer::captureException($exception, [
            'level' => 'critical',
            'tags' => ['fatal' => 'true'],
        ]);
    }
}
