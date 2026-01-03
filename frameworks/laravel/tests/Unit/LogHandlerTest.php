<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel\Tests\Unit;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\Laravel\Logging\ErrorExplorerLogHandler;
use Monolog\Level;
use Monolog\LogRecord;
use PHPUnit\Framework\TestCase;

final class LogHandlerTest extends TestCase
{
    private ErrorExplorerLogHandler $handler;

    protected function setUp(): void
    {
        BreadcrumbManager::clear();
        $this->handler = new ErrorExplorerLogHandler();
    }

    protected function tearDown(): void
    {
        BreadcrumbManager::clear();
    }

    public function test_handles_log_record(): void
    {
        $record = $this->createLogRecord('Test message', Level::Info);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('log', $breadcrumbs[0]['type']);
        $this->assertSame('Test message', $breadcrumbs[0]['message']);
    }

    public function test_sets_channel_as_category(): void
    {
        $record = $this->createLogRecord('Test message', Level::Info, 'app');
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('app', $breadcrumbs[0]['category']);
    }

    public function test_includes_channel_in_data(): void
    {
        $record = $this->createLogRecord('Test message', Level::Info, 'security');
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('security', $breadcrumbs[0]['data']['channel']);
    }

    // =========================================================================
    // Level Mapping Tests
    // =========================================================================

    public function test_maps_debug_level(): void
    {
        $record = $this->createLogRecord('Debug message', Level::Debug);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('debug', $breadcrumbs[0]['level']);
    }

    public function test_maps_info_level(): void
    {
        $record = $this->createLogRecord('Info message', Level::Info);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('info', $breadcrumbs[0]['level']);
    }

    public function test_maps_notice_level(): void
    {
        $record = $this->createLogRecord('Notice message', Level::Notice);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('info', $breadcrumbs[0]['level']);
    }

    public function test_maps_warning_level(): void
    {
        $record = $this->createLogRecord('Warning message', Level::Warning);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('warning', $breadcrumbs[0]['level']);
    }

    public function test_maps_error_level(): void
    {
        $record = $this->createLogRecord('Error message', Level::Error);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('error', $breadcrumbs[0]['level']);
    }

    public function test_maps_critical_level(): void
    {
        $record = $this->createLogRecord('Critical message', Level::Critical);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('error', $breadcrumbs[0]['level']);
    }

    public function test_maps_alert_level(): void
    {
        $record = $this->createLogRecord('Alert message', Level::Alert);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('error', $breadcrumbs[0]['level']);
    }

    public function test_maps_emergency_level(): void
    {
        $record = $this->createLogRecord('Emergency message', Level::Emergency);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('error', $breadcrumbs[0]['level']);
    }

    // =========================================================================
    // Context Handling Tests
    // =========================================================================

    public function test_includes_scalar_context_values(): void
    {
        $record = $this->createLogRecord('User logged in', Level::Info, 'app', [
            'user_id' => 123,
            'username' => 'john',
            'active' => true,
        ]);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame(123, $breadcrumbs[0]['data']['user_id']);
        $this->assertSame('john', $breadcrumbs[0]['data']['username']);
        $this->assertTrue($breadcrumbs[0]['data']['active']);
    }

    public function test_sanitizes_array_context_values(): void
    {
        $record = $this->createLogRecord('Test', Level::Info, 'app', [
            'items' => [1, 2, 3],
        ]);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('[array]', $breadcrumbs[0]['data']['items']);
    }

    public function test_sanitizes_object_context_values(): void
    {
        $record = $this->createLogRecord('Test', Level::Info, 'app', [
            'request' => new \stdClass(),
        ]);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('[stdClass]', $breadcrumbs[0]['data']['request']);
    }

    public function test_skips_exception_in_context(): void
    {
        $exception = new \RuntimeException('Test exception');
        $record = $this->createLogRecord('Error occurred', Level::Error, 'app', [
            'exception' => $exception,
            'error_code' => 500,
        ]);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertArrayNotHasKey('exception', $breadcrumbs[0]['data']);
        $this->assertSame(500, $breadcrumbs[0]['data']['error_code']);
    }

    // =========================================================================
    // Message Interpolation Tests
    // =========================================================================

    public function test_interpolates_placeholders_in_message(): void
    {
        $record = $this->createLogRecord('User {username} logged in from {ip}', Level::Info, 'app', [
            'username' => 'john',
            'ip' => '192.168.1.1',
        ]);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('User john logged in from 192.168.1.1', $breadcrumbs[0]['message']);
    }

    public function test_handles_missing_placeholders(): void
    {
        $record = $this->createLogRecord('User {username} performed {action}', Level::Info, 'app', [
            'username' => 'john',
        ]);
        $this->handler->handle($record);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('User john performed {action}', $breadcrumbs[0]['message']);
    }

    // =========================================================================
    // Handler Configuration Tests
    // =========================================================================

    public function test_default_level_is_debug(): void
    {
        $handler = new ErrorExplorerLogHandler();

        $record = $this->createLogRecord('Debug', Level::Debug);
        $this->assertTrue($handler->isHandling($record));
    }

    public function test_custom_level_threshold(): void
    {
        $handler = new ErrorExplorerLogHandler(Level::Warning);

        $debugRecord = $this->createLogRecord('Debug', Level::Debug);
        $this->assertFalse($handler->isHandling($debugRecord));

        $warningRecord = $this->createLogRecord('Warning', Level::Warning);
        $this->assertTrue($handler->isHandling($warningRecord));
    }

    public function test_bubble_default_is_true(): void
    {
        $handler = new ErrorExplorerLogHandler();

        $record = $this->createLogRecord('Test', Level::Info);
        $result = $handler->handle($record);

        // When bubble is true, handle returns false
        $this->assertFalse($result);
    }

    public function test_bubble_false(): void
    {
        $handler = new ErrorExplorerLogHandler(Level::Debug, false);

        $record = $this->createLogRecord('Test', Level::Info);
        $result = $handler->handle($record);

        // When bubble is false, handle returns true (stops propagation)
        $this->assertTrue($result);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    /**
     * @param array<string, mixed> $context
     */
    private function createLogRecord(
        string $message,
        Level $level,
        string $channel = 'test',
        array $context = []
    ): LogRecord {
        return new LogRecord(
            datetime: new \DateTimeImmutable(),
            channel: $channel,
            level: $level,
            message: $message,
            context: $context
        );
    }
}
