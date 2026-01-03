<?php

declare(strict_types=1);

namespace ErrorExplorer\Context;

/**
 * Collects HTTP request context automatically.
 */
final class RequestContext
{
    /**
     * Collect request context from PHP globals.
     *
     * @return array<string, mixed>|null
     */
    public static function collect(): ?array
    {
        // Skip if not in HTTP context
        if (php_sapi_name() === 'cli') {
            return null;
        }

        return [
            'url' => self::getFullUrl(),
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'GET',
            'ip' => self::getClientIp(),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            'referer' => $_SERVER['HTTP_REFERER'] ?? null,
            'headers' => self::getHeaders(),
            'query_string' => $_SERVER['QUERY_STRING'] ?? null,
        ];
    }

    /**
     * Get the full URL of the current request.
     */
    private static function getFullUrl(): string
    {
        $scheme = self::isSecure() ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';

        return sprintf('%s://%s%s', $scheme, $host, $uri);
    }

    /**
     * Check if connection is secure (HTTPS).
     */
    private static function isSecure(): bool
    {
        if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
            return true;
        }

        if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
            return true;
        }

        if (isset($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on') {
            return true;
        }

        return ($_SERVER['SERVER_PORT'] ?? 80) == 443;
    }

    /**
     * Get the client IP address.
     */
    private static function getClientIp(): ?string
    {
        $headers = [
            'HTTP_CF_CONNECTING_IP',     // Cloudflare
            'HTTP_X_FORWARDED_FOR',      // Load balancer/proxy
            'HTTP_X_REAL_IP',            // Nginx proxy
            'HTTP_CLIENT_IP',
            'REMOTE_ADDR',
        ];

        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ip = $_SERVER[$header];

                // X-Forwarded-For may contain multiple IPs
                if (str_contains($ip, ',')) {
                    $ips = array_map('trim', explode(',', $ip));
                    $ip = $ips[0];
                }

                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        return null;
    }

    /**
     * Get relevant HTTP headers (excluding sensitive ones).
     *
     * @return array<string, string>
     */
    private static function getHeaders(): array
    {
        $headers = [];
        $sensitiveHeaders = [
            'authorization',
            'cookie',
            'x-api-key',
            'x-auth-token',
            'x-csrf-token',
        ];

        foreach ($_SERVER as $key => $value) {
            if (strpos($key, 'HTTP_') !== 0) {
                continue;
            }

            // Convert HTTP_HEADER_NAME to Header-Name
            $header = str_replace('_', '-', substr($key, 5));
            $header = ucwords(strtolower($header), '-');

            // Skip sensitive headers
            if (in_array(strtolower($header), $sensitiveHeaders, true)) {
                $headers[$header] = '[Filtered]';
            } else {
                $headers[$header] = $value;
            }
        }

        return $headers;
    }
}
