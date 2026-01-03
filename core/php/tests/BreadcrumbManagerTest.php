<?php

declare(strict_types=1);

namespace ErrorExplorer\Tests;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use PHPUnit\Framework\TestCase;

final class BreadcrumbManagerTest extends TestCase
{
    protected function setUp(): void
    {
        BreadcrumbManager::clear();
    }

    protected function tearDown(): void
    {
        BreadcrumbManager::clear();
    }

    public function test_adds_breadcrumb(): void
    {
        BreadcrumbManager::add([
            'type' => 'test',
            'message' => 'Test message',
        ]);

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('test', $breadcrumbs[0]['type']);
        $this->assertSame('Test message', $breadcrumbs[0]['message']);
    }

    public function test_adds_default_values(): void
    {
        BreadcrumbManager::add([
            'message' => 'Test',
        ]);

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertSame('custom', $breadcrumbs[0]['type']);
        $this->assertSame('default', $breadcrumbs[0]['category']);
        $this->assertSame('info', $breadcrumbs[0]['level']);
        $this->assertArrayHasKey('timestamp', $breadcrumbs[0]);
    }

    public function test_respects_max_breadcrumbs(): void
    {
        BreadcrumbManager::setMaxBreadcrumbs(5);

        for ($i = 1; $i <= 10; $i++) {
            BreadcrumbManager::add(['message' => "Message $i"]);
        }

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertCount(5, $breadcrumbs);
        // Should keep the last 5 (FIFO)
        $this->assertSame('Message 6', $breadcrumbs[0]['message']);
        $this->assertSame('Message 10', $breadcrumbs[4]['message']);
    }

    public function test_clears_breadcrumbs(): void
    {
        BreadcrumbManager::add(['message' => 'Test']);
        $this->assertCount(1, BreadcrumbManager::getAll());

        BreadcrumbManager::clear();
        $this->assertCount(0, BreadcrumbManager::getAll());
    }

    public function test_counts_breadcrumbs(): void
    {
        $this->assertSame(0, BreadcrumbManager::count());

        BreadcrumbManager::add(['message' => 'Test 1']);
        BreadcrumbManager::add(['message' => 'Test 2']);

        $this->assertSame(2, BreadcrumbManager::count());
    }

    public function test_adds_http_request_breadcrumb(): void
    {
        BreadcrumbManager::addHttpRequest('POST', '/api/users', 201, 0.150);

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('http', $breadcrumbs[0]['type']);
        $this->assertSame('http.request', $breadcrumbs[0]['category']);
        $this->assertSame('POST /api/users', $breadcrumbs[0]['message']);
        $this->assertSame('info', $breadcrumbs[0]['level']);
        $this->assertSame('POST', $breadcrumbs[0]['data']['method']);
        $this->assertSame('/api/users', $breadcrumbs[0]['data']['url']);
        $this->assertSame(201, $breadcrumbs[0]['data']['status_code']);
        $this->assertSame(150.0, $breadcrumbs[0]['data']['duration_ms']);
    }

    public function test_http_request_error_level_for_4xx(): void
    {
        BreadcrumbManager::addHttpRequest('GET', '/api/users/999', 404, 0.050);

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertSame('error', $breadcrumbs[0]['level']);
    }

    public function test_adds_query_breadcrumb(): void
    {
        BreadcrumbManager::addQuery('SELECT * FROM users WHERE id = 1', 0.025, 'default');

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('query', $breadcrumbs[0]['type']);
        $this->assertSame('db.query', $breadcrumbs[0]['category']);
        $this->assertSame('SELECT * FROM users WHERE id = 1', $breadcrumbs[0]['data']['sql']);
        $this->assertSame(25.0, $breadcrumbs[0]['data']['duration_ms']);
    }

    public function test_truncates_long_queries(): void
    {
        $longQuery = 'SELECT ' . str_repeat('column, ', 50) . 'id FROM very_long_table_name';
        BreadcrumbManager::addQuery($longQuery, 0.1);

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertStringEndsWith('...', $breadcrumbs[0]['message']);
        $this->assertLessThanOrEqual(103, strlen($breadcrumbs[0]['message'])); // 100 + '...'
    }

    public function test_adds_log_breadcrumb(): void
    {
        BreadcrumbManager::addLog('warning', 'User login failed', ['user_id' => 123]);

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('log', $breadcrumbs[0]['type']);
        $this->assertSame('log', $breadcrumbs[0]['category']);
        $this->assertSame('User login failed', $breadcrumbs[0]['message']);
        $this->assertSame('warning', $breadcrumbs[0]['level']);
        $this->assertSame(123, $breadcrumbs[0]['data']['user_id']);
    }

    public function test_normalizes_log_levels(): void
    {
        // Backend only accepts: debug, info, warning, error
        $testCases = [
            'emergency' => 'error',
            'alert' => 'error',
            'critical' => 'error',
            'error' => 'error',
            'warning' => 'warning',
            'warn' => 'warning',
            'notice' => 'info',
            'info' => 'info',
            'debug' => 'debug',
            'unknown' => 'info',
        ];

        foreach ($testCases as $input => $expected) {
            BreadcrumbManager::clear();
            BreadcrumbManager::addLog($input, 'Test');
            $breadcrumbs = BreadcrumbManager::getAll();
            $this->assertSame($expected, $breadcrumbs[0]['level'], "Failed for level: $input");
        }
    }

    public function test_adds_command_breadcrumb(): void
    {
        BreadcrumbManager::addCommand('app:import-users', 0);

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('command', $breadcrumbs[0]['type']);
        $this->assertSame('console', $breadcrumbs[0]['category']);
        $this->assertSame('app:import-users', $breadcrumbs[0]['message']);
        $this->assertSame('info', $breadcrumbs[0]['level']);
        $this->assertSame(0, $breadcrumbs[0]['data']['exit_code']);
    }

    public function test_command_error_level_for_non_zero_exit(): void
    {
        BreadcrumbManager::addCommand('app:failing-command', 1);

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertSame('error', $breadcrumbs[0]['level']);
    }

    public function test_adds_cache_breadcrumb(): void
    {
        BreadcrumbManager::addCache('get', 'user.123', true);

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('cache', $breadcrumbs[0]['type']);
        $this->assertSame('GET user.123', $breadcrumbs[0]['message']);
        $this->assertTrue($breadcrumbs[0]['data']['hit']);
    }

    public function test_adds_user_action_breadcrumb(): void
    {
        BreadcrumbManager::addUserAction('Added item to cart', ['product_id' => 'SKU123']);

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('user-action', $breadcrumbs[0]['type']);
        $this->assertSame('user', $breadcrumbs[0]['category']);
        $this->assertSame('Added item to cart', $breadcrumbs[0]['message']);
        $this->assertSame('SKU123', $breadcrumbs[0]['data']['product_id']);
    }

    public function test_adds_navigation_breadcrumb(): void
    {
        BreadcrumbManager::addNavigation('/home', '/checkout');

        $breadcrumbs = BreadcrumbManager::getAll();

        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('navigation', $breadcrumbs[0]['type']);
        $this->assertSame('/home → /checkout', $breadcrumbs[0]['message']);
        $this->assertSame('/home', $breadcrumbs[0]['data']['from']);
        $this->assertSame('/checkout', $breadcrumbs[0]['data']['to']);
    }
}
