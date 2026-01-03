<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel\Tests\Unit;

use ErrorExplorer\Laravel\Tests\TestCase;

final class ConfigTest extends TestCase
{
    public function test_default_enabled_is_true(): void
    {
        $this->assertTrue(config('error-explorer.enabled'));
    }

    public function test_capture_defaults_from_config_file(): void
    {
        // Load fresh config without test overrides
        $defaultConfig = require __DIR__ . '/../../config/error-explorer.php';

        $this->assertTrue($defaultConfig['capture']['exceptions']);
        $this->assertTrue($defaultConfig['capture']['errors']);
        $this->assertTrue($defaultConfig['capture']['fatal_errors']);
    }

    public function test_breadcrumb_defaults(): void
    {
        $this->assertSame(50, config('error-explorer.breadcrumbs.max_breadcrumbs'));
        $this->assertTrue(config('error-explorer.breadcrumbs.http_requests'));
        $this->assertTrue(config('error-explorer.breadcrumbs.logs'));
        $this->assertTrue(config('error-explorer.breadcrumbs.queries'));
    }

    public function test_context_defaults(): void
    {
        $this->assertTrue(config('error-explorer.context.user'));
        $this->assertTrue(config('error-explorer.context.request'));
        $this->assertTrue(config('error-explorer.context.server'));
    }

    public function test_transport_defaults(): void
    {
        $this->assertTrue(config('error-explorer.transport.async'));
        $this->assertSame(3, config('error-explorer.transport.timeout'));
        $this->assertSame(2, config('error-explorer.transport.retry'));
    }

    public function test_security_defaults(): void
    {
        $this->assertFalse(config('error-explorer.security.hmac_enabled'));
        $this->assertSame('sha256', config('error-explorer.security.hmac_algorithm'));
    }

    public function test_scrub_fields_include_password(): void
    {
        $scrubFields = config('error-explorer.scrub_fields');

        $this->assertContains('password', $scrubFields);
        $this->assertContains('password_confirmation', $scrubFields);
        $this->assertContains('token', $scrubFields);
        $this->assertContains('api_key', $scrubFields);
    }

    public function test_ignored_exceptions_include_common_laravel_exceptions(): void
    {
        $ignoredExceptions = config('error-explorer.ignore.exceptions');

        $this->assertContains(\Illuminate\Auth\AuthenticationException::class, $ignoredExceptions);
        $this->assertContains(\Illuminate\Auth\Access\AuthorizationException::class, $ignoredExceptions);
        $this->assertContains(\Illuminate\Database\Eloquent\ModelNotFoundException::class, $ignoredExceptions);
        $this->assertContains(\Illuminate\Validation\ValidationException::class, $ignoredExceptions);
        $this->assertContains(\Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class, $ignoredExceptions);
    }

    public function test_respect_dont_report_defaults_to_true(): void
    {
        $this->assertTrue(config('error-explorer.respect_dont_report'));
    }

    public function test_environment_from_config(): void
    {
        $this->app['config']->set('error-explorer.environment', 'staging');

        $this->assertSame('staging', config('error-explorer.environment'));
    }

    public function test_custom_scrub_fields_can_be_added(): void
    {
        $this->app['config']->set('error-explorer.scrub_fields', [
            'password',
            'custom_secret',
            'my_api_key',
        ]);

        $scrubFields = config('error-explorer.scrub_fields');

        $this->assertContains('custom_secret', $scrubFields);
        $this->assertContains('my_api_key', $scrubFields);
    }
}
