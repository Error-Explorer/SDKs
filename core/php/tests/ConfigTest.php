<?php

declare(strict_types=1);

namespace ErrorExplorer\Tests;

use ErrorExplorer\Config\Config;
use PHPUnit\Framework\TestCase;

final class ConfigTest extends TestCase
{
    public function test_creates_config_with_token(): void
    {
        $config = Config::fromArray([
            'token' => 'test_token_123',
        ]);

        $this->assertSame('test_token_123', $config->getToken());
        $this->assertStringContainsString('test_token_123', $config->getEndpoint());
    }

    public function test_throws_exception_without_token(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('token is required');

        Config::fromArray([]);
    }

    public function test_parses_dsn_format(): void
    {
        $config = Config::fromArray([
            'dsn' => 'https://my_token@error-explorer.com/api/v1/webhook',
        ]);

        $this->assertSame('my_token', $config->getToken());
        $this->assertStringContainsString('error-explorer.com', $config->getEndpoint());
    }

    public function test_default_capture_options(): void
    {
        $config = Config::fromArray(['token' => 'test']);

        $this->assertTrue($config->shouldCaptureExceptions());
        $this->assertTrue($config->shouldCaptureErrors());
        $this->assertTrue($config->shouldCaptureFatalErrors());
    }

    public function test_custom_capture_options(): void
    {
        $config = Config::fromArray([
            'token' => 'test',
            'capture' => [
                'exceptions' => true,
                'errors' => false,
                'fatal_errors' => false,
            ],
        ]);

        $this->assertTrue($config->shouldCaptureExceptions());
        $this->assertFalse($config->shouldCaptureErrors());
        $this->assertFalse($config->shouldCaptureFatalErrors());
    }

    public function test_default_transport_options(): void
    {
        $config = Config::fromArray(['token' => 'test']);

        $this->assertTrue($config->isAsyncTransport());
        $this->assertSame(3, $config->getTimeout());
        $this->assertSame(2, $config->getRetry());
    }

    public function test_custom_transport_options(): void
    {
        $config = Config::fromArray([
            'token' => 'test',
            'transport' => [
                'async' => false,
                'timeout' => 10,
                'retry' => 5,
            ],
        ]);

        $this->assertFalse($config->isAsyncTransport());
        $this->assertSame(10, $config->getTimeout());
        $this->assertSame(5, $config->getRetry());
    }

    public function test_default_breadcrumbs_options(): void
    {
        $config = Config::fromArray(['token' => 'test']);

        $this->assertSame(50, $config->getMaxBreadcrumbs());
    }

    public function test_custom_breadcrumbs_options(): void
    {
        $config = Config::fromArray([
            'token' => 'test',
            'breadcrumbs' => [
                'max_breadcrumbs' => 100,
            ],
        ]);

        $this->assertSame(100, $config->getMaxBreadcrumbs());
    }

    public function test_environment_detection(): void
    {
        $config = Config::fromArray(['token' => 'test']);

        // Default should be 'production' when no env var is set
        $this->assertIsString($config->getEnvironment());
    }

    public function test_custom_environment(): void
    {
        $config = Config::fromArray([
            'token' => 'test',
            'environment' => 'staging',
        ]);

        $this->assertSame('staging', $config->getEnvironment());
    }

    public function test_release_version(): void
    {
        $config = Config::fromArray([
            'token' => 'test',
            'release' => 'v1.2.3',
        ]);

        $this->assertSame('v1.2.3', $config->getRelease());
    }

    public function test_default_scrub_fields(): void
    {
        $config = Config::fromArray(['token' => 'test']);

        $scrubFields = $config->getScrubFields();

        $this->assertContains('password', $scrubFields);
        $this->assertContains('secret', $scrubFields);
        $this->assertContains('token', $scrubFields);
        $this->assertContains('api_key', $scrubFields);
        $this->assertContains('credit_card', $scrubFields);
    }

    public function test_custom_scrub_fields(): void
    {
        $config = Config::fromArray([
            'token' => 'test',
            'scrub_fields' => ['custom_secret', 'my_api_key'],
        ]);

        $scrubFields = $config->getScrubFields();

        $this->assertContains('password', $scrubFields); // Default
        $this->assertContains('custom_secret', $scrubFields); // Custom
        $this->assertContains('my_api_key', $scrubFields); // Custom
    }

    public function test_hmac_disabled_by_default(): void
    {
        $config = Config::fromArray(['token' => 'test']);

        $this->assertFalse($config->isHmacEnabled());
        $this->assertNull($config->getHmacSecret());
        $this->assertSame('sha256', $config->getHmacAlgorithm());
    }

    public function test_hmac_enabled_with_secret(): void
    {
        $config = Config::fromArray([
            'token' => 'test',
            'security' => [
                'hmac_enabled' => true,
                'hmac_secret' => 'my_secret_key',
                'hmac_algorithm' => 'sha512',
            ],
        ]);

        $this->assertTrue($config->isHmacEnabled());
        $this->assertSame('my_secret_key', $config->getHmacSecret());
        $this->assertSame('sha512', $config->getHmacAlgorithm());
    }

    public function test_hmac_enabled_without_secret_throws(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('HMAC secret is required');

        Config::fromArray([
            'token' => 'test',
            'security' => [
                'hmac_enabled' => true,
            ],
        ]);
    }
}
