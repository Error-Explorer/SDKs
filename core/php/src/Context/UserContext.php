<?php

declare(strict_types=1);

namespace ErrorExplorer\Context;

/**
 * Manages user context for error reports.
 */
final class UserContext
{
    /** @var array<string, mixed> */
    private static array $user = [];

    /**
     * Set user context.
     *
     * @param array{id?: string, email?: string, username?: string, name?: string, role?: string} $user
     */
    public static function set(array $user): void
    {
        self::$user = $user;
    }

    /**
     * Get current user context.
     *
     * @return array<string, mixed>
     */
    public static function get(): array
    {
        return self::$user;
    }

    /**
     * Clear user context.
     */
    public static function clear(): void
    {
        self::$user = [];
    }

    /**
     * Check if user context is set.
     */
    public static function isSet(): bool
    {
        return !empty(self::$user);
    }

    /**
     * Set user ID.
     */
    public static function setId(string $id): void
    {
        self::$user['id'] = $id;
    }

    /**
     * Set user email.
     */
    public static function setEmail(string $email): void
    {
        self::$user['email'] = $email;
    }

    /**
     * Set user name.
     */
    public static function setName(string $name): void
    {
        self::$user['name'] = $name;
    }

    /**
     * Set custom user attribute.
     */
    public static function setAttribute(string $key, mixed $value): void
    {
        self::$user[$key] = $value;
    }
}
