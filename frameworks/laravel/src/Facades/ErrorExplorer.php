<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel\Facades;

use ErrorExplorer\ErrorExplorer as BaseErrorExplorer;

/**
 * Facade for Error Explorer SDK.
 *
 * Since ErrorExplorer uses static methods, this is a simple wrapper
 * that forwards all calls to the base ErrorExplorer class.
 *
 * @see \ErrorExplorer\ErrorExplorer
 */
class ErrorExplorer
{
    /**
     * @param array<string, mixed> $options
     */
    public static function init(array $options): void
    {
        BaseErrorExplorer::init($options);
    }

    public static function isInitialized(): bool
    {
        return BaseErrorExplorer::isInitialized();
    }

    /**
     * @param array<string, mixed> $breadcrumb
     */
    public static function addBreadcrumb(array $breadcrumb): void
    {
        BaseErrorExplorer::addBreadcrumb($breadcrumb);
    }

    /**
     * @param array<string, mixed> $user
     */
    public static function setUser(array $user): void
    {
        BaseErrorExplorer::setUser($user);
    }

    public static function clearUser(): void
    {
        BaseErrorExplorer::clearUser();
    }

    /**
     * @param array<string, string> $tags
     */
    public static function setTags(array $tags): void
    {
        BaseErrorExplorer::setTags($tags);
    }

    public static function setTag(string $key, string $value): void
    {
        BaseErrorExplorer::setTag($key, $value);
    }

    /**
     * @param array<string, mixed> $extra
     */
    public static function setExtra(array $extra): void
    {
        BaseErrorExplorer::setExtra($extra);
    }

    /**
     * @param array<string, mixed> $context
     */
    public static function captureException(\Throwable $exception, array $context = []): ?string
    {
        return BaseErrorExplorer::captureException($exception, $context);
    }

    public static function captureMessage(string $message, string $level = 'info'): ?string
    {
        return BaseErrorExplorer::captureMessage($message, $level);
    }

    public static function flush(int $timeout = 2): bool
    {
        return BaseErrorExplorer::flush($timeout);
    }

    public static function close(int $timeout = 2): bool
    {
        return BaseErrorExplorer::close($timeout);
    }

    public static function getInstance(): ?BaseErrorExplorer
    {
        return BaseErrorExplorer::getInstance();
    }
}
