<?php

declare(strict_types=1);

namespace ErrorExplorer\Tests;

use ErrorExplorer\Context\RequestContext;
use ErrorExplorer\Context\ServerContext;
use ErrorExplorer\Context\UserContext;
use PHPUnit\Framework\TestCase;

final class ContextTest extends TestCase
{
    protected function tearDown(): void
    {
        UserContext::clear();
    }

    // =========================================================================
    // UserContext Tests
    // =========================================================================

    public function test_user_context_set_and_get(): void
    {
        UserContext::set([
            'id' => 'user_123',
            'email' => 'john@example.com',
            'name' => 'John Doe',
        ]);

        $user = UserContext::get();

        $this->assertSame('user_123', $user['id']);
        $this->assertSame('john@example.com', $user['email']);
        $this->assertSame('John Doe', $user['name']);
    }

    public function test_user_context_is_set(): void
    {
        $this->assertFalse(UserContext::isSet());

        UserContext::set(['id' => '123']);

        $this->assertTrue(UserContext::isSet());
    }

    public function test_user_context_clear(): void
    {
        UserContext::set(['id' => '123']);
        $this->assertTrue(UserContext::isSet());

        UserContext::clear();

        $this->assertFalse(UserContext::isSet());
        $this->assertEmpty(UserContext::get());
    }

    public function test_user_context_set_individual_fields(): void
    {
        UserContext::setId('user_456');
        UserContext::setEmail('jane@example.com');
        UserContext::setName('Jane Doe');
        UserContext::setAttribute('role', 'admin');

        $user = UserContext::get();

        $this->assertSame('user_456', $user['id']);
        $this->assertSame('jane@example.com', $user['email']);
        $this->assertSame('Jane Doe', $user['name']);
        $this->assertSame('admin', $user['role']);
    }

    public function test_user_context_custom_attributes(): void
    {
        UserContext::set(['id' => '123']);
        UserContext::setAttribute('subscription', 'pro');
        UserContext::setAttribute('company', 'Acme Inc');

        $user = UserContext::get();

        $this->assertSame('pro', $user['subscription']);
        $this->assertSame('Acme Inc', $user['company']);
    }

    // =========================================================================
    // ServerContext Tests
    // =========================================================================

    public function test_server_context_collect(): void
    {
        $context = ServerContext::collect();

        $this->assertIsArray($context);
        $this->assertArrayHasKey('php_version', $context);
        $this->assertArrayHasKey('php_sapi', $context);
        $this->assertArrayHasKey('os', $context);
        $this->assertArrayHasKey('memory_peak', $context);
        $this->assertArrayHasKey('memory_current', $context);
        $this->assertArrayHasKey('memory_limit', $context);
        $this->assertArrayHasKey('extensions', $context);
    }

    public function test_server_context_php_version(): void
    {
        $context = ServerContext::collect();

        $this->assertSame(PHP_VERSION, $context['php_version']);
    }

    public function test_server_context_php_sapi(): void
    {
        $context = ServerContext::collect();

        $this->assertSame(PHP_SAPI, $context['php_sapi']);
    }

    public function test_server_context_os(): void
    {
        $context = ServerContext::collect();

        $this->assertSame(PHP_OS_FAMILY, $context['os']);
    }

    public function test_server_context_memory_format(): void
    {
        $context = ServerContext::collect();

        // Memory should be formatted like "X.XX MB" or "X.XX KB"
        $this->assertMatchesRegularExpression('/^\d+(\.\d+)?\s(B|KB|MB|GB|TB)$/', $context['memory_peak']);
        $this->assertMatchesRegularExpression('/^\d+(\.\d+)?\s(B|KB|MB|GB|TB)$/', $context['memory_current']);
    }

    public function test_server_context_extensions(): void
    {
        $context = ServerContext::collect();

        $this->assertIsArray($context['extensions']);
        // curl and json should be loaded (required by SDK)
        $this->assertContains('curl', $context['extensions']);
        $this->assertContains('json', $context['extensions']);
    }

    // =========================================================================
    // RequestContext Tests (CLI mode returns null)
    // =========================================================================

    public function test_request_context_returns_null_in_cli(): void
    {
        // In CLI mode, RequestContext::collect() returns null
        $context = RequestContext::collect();

        $this->assertNull($context);
    }
}
