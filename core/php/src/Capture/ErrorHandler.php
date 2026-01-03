<?php

declare(strict_types=1);

namespace ErrorExplorer\Capture;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\ErrorExplorer;

/**
 * Handles PHP errors (warnings, notices, etc.).
 */
final class ErrorHandler
{
    /** @var callable|null */
    private static $previousHandler = null;

    private static bool $registered = false;

    /**
     * Error levels that should be captured as exceptions.
     */
    private const FATAL_LEVELS = [
        E_ERROR,
        E_PARSE,
        E_CORE_ERROR,
        E_COMPILE_ERROR,
        E_USER_ERROR,
        E_RECOVERABLE_ERROR,
    ];

    /**
     * Register the error handler.
     */
    public static function register(): void
    {
        if (self::$registered) {
            return;
        }

        self::$previousHandler = set_error_handler([self::class, 'handle']);
        self::$registered = true;
    }

    /**
     * Restore the previous error handler.
     */
    public static function unregister(): void
    {
        if (!self::$registered) {
            return;
        }

        restore_error_handler();
        self::$registered = false;
    }

    /**
     * Handle a PHP error.
     *
     * @return bool True if error was handled, false to use PHP's internal handler
     */
    public static function handle(int $errno, string $errstr, string $errfile, int $errline): bool
    {
        // Respect error_reporting setting
        if (!(error_reporting() & $errno)) {
            return false;
        }

        $levelName = self::getLevelName($errno);

        // Fatal errors should be captured as exceptions
        if (in_array($errno, self::FATAL_LEVELS, true)) {
            $exception = new \ErrorException($errstr, 0, $errno, $errfile, $errline);
            ErrorExplorer::captureException($exception);
        } else {
            // Non-fatal errors become breadcrumbs
            BreadcrumbManager::addLog($levelName, $errstr, [
                'file' => $errfile,
                'line' => $errline,
                'errno' => $errno,
            ]);
        }

        // Call previous handler if exists
        if (self::$previousHandler !== null) {
            return (self::$previousHandler)($errno, $errstr, $errfile, $errline);
        }

        // Return false to allow PHP's internal error handler to continue
        return false;
    }

    /**
     * Get human-readable error level name.
     */
    private static function getLevelName(int $errno): string
    {
        return match ($errno) {
            E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR => 'error',
            E_WARNING, E_CORE_WARNING, E_COMPILE_WARNING, E_USER_WARNING => 'warning',
            E_PARSE => 'error',
            E_NOTICE, E_USER_NOTICE => 'notice',
            E_STRICT => 'info',
            E_RECOVERABLE_ERROR => 'error',
            E_DEPRECATED, E_USER_DEPRECATED => 'warning',
            default => 'error',
        };
    }
}
