<?php

declare(strict_types=1);

namespace ErrorExplorer\Capture;

use ErrorExplorer\ErrorExplorer;

/**
 * Handles uncaught exceptions.
 */
final class ExceptionHandler
{
    /** @var callable|null */
    private static $previousHandler = null;

    private static bool $registered = false;

    /**
     * Register the exception handler.
     */
    public static function register(): void
    {
        if (self::$registered) {
            return;
        }

        self::$previousHandler = set_exception_handler([self::class, 'handle']);
        self::$registered = true;
    }

    /**
     * Restore the previous exception handler.
     */
    public static function unregister(): void
    {
        if (!self::$registered) {
            return;
        }

        restore_exception_handler();
        self::$registered = false;
    }

    /**
     * Handle an uncaught exception.
     */
    public static function handle(\Throwable $exception): void
    {
        // Capture the exception with Error Explorer
        ErrorExplorer::captureException($exception);

        // Call previous handler if exists
        if (self::$previousHandler !== null) {
            (self::$previousHandler)($exception);
        }
    }
}
