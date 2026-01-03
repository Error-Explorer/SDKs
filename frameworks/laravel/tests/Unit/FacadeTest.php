<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel\Tests\Unit;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\Laravel\Facades\ErrorExplorer;
use ErrorExplorer\Laravel\Tests\TestCase;

final class FacadeTest extends TestCase
{

    public function test_facade_is_initialized_returns_true(): void
    {
        $this->assertTrue(ErrorExplorer::isInitialized());
    }

    public function test_facade_add_breadcrumb(): void
    {
        ErrorExplorer::addBreadcrumb([
            'type' => 'test',
            'message' => 'Test breadcrumb',
        ]);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertNotEmpty($breadcrumbs);

        $lastBreadcrumb = end($breadcrumbs);
        $this->assertSame('test', $lastBreadcrumb['type']);
        $this->assertSame('Test breadcrumb', $lastBreadcrumb['message']);
    }

    public function test_facade_set_user(): void
    {
        ErrorExplorer::setUser([
            'id' => 'user_123',
            'email' => 'test@example.com',
        ]);

        $instance = ErrorExplorer::getInstance();
        $this->assertNotNull($instance);

        $user = $instance->getUser();
        $this->assertSame('user_123', $user['id']);
        $this->assertSame('test@example.com', $user['email']);
    }

    public function test_facade_clear_user(): void
    {
        ErrorExplorer::setUser(['id' => 'user_123']);
        ErrorExplorer::clearUser();

        $instance = ErrorExplorer::getInstance();
        $this->assertNotNull($instance);
        $this->assertEmpty($instance->getUser());
    }

    public function test_facade_set_tags(): void
    {
        ErrorExplorer::setTags([
            'environment' => 'testing',
            'version' => '1.0.0',
        ]);

        $instance = ErrorExplorer::getInstance();
        $this->assertNotNull($instance);

        $tags = $instance->getTags();
        $this->assertSame('testing', $tags['environment']);
        $this->assertSame('1.0.0', $tags['version']);
    }

    public function test_facade_set_single_tag(): void
    {
        ErrorExplorer::setTag('feature', 'checkout');

        $instance = ErrorExplorer::getInstance();
        $this->assertNotNull($instance);

        $tags = $instance->getTags();
        $this->assertSame('checkout', $tags['feature']);
    }

    public function test_facade_set_extra(): void
    {
        ErrorExplorer::setExtra([
            'order_id' => 'order_123',
            'total' => 99.99,
        ]);

        $instance = ErrorExplorer::getInstance();
        $this->assertNotNull($instance);

        $extra = $instance->getExtra();
        $this->assertSame('order_123', $extra['order_id']);
        $this->assertSame(99.99, $extra['total']);
    }
}
