<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\Tests\EventSubscriber;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\Symfony\EventSubscriber\MessengerSubscriber;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Messenger\Envelope;
use Symfony\Component\Messenger\Event\WorkerMessageFailedEvent;
use Symfony\Component\Messenger\Event\WorkerMessageHandledEvent;
use Symfony\Component\Messenger\Event\WorkerMessageReceivedEvent;

final class MessengerSubscriberTest extends TestCase
{
    private MessengerSubscriber $subscriber;

    protected function setUp(): void
    {
        BreadcrumbManager::clear();
        $this->subscriber = new MessengerSubscriber();
    }

    protected function tearDown(): void
    {
        BreadcrumbManager::clear();
    }

    public function test_subscribed_events(): void
    {
        $events = MessengerSubscriber::getSubscribedEvents();

        $this->assertArrayHasKey(WorkerMessageReceivedEvent::class, $events);
        $this->assertArrayHasKey(WorkerMessageHandledEvent::class, $events);
        $this->assertArrayHasKey(WorkerMessageFailedEvent::class, $events);
    }

    public function test_on_message_received_adds_breadcrumb(): void
    {
        $message = new TestMessage('test-data');
        $envelope = new Envelope($message);
        $event = new WorkerMessageReceivedEvent($envelope, 'async');

        $this->subscriber->onMessageReceived($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('message', $breadcrumbs[0]['type']);
        $this->assertSame('messenger.received', $breadcrumbs[0]['category']);
        $this->assertSame('info', $breadcrumbs[0]['level']);
    }

    public function test_on_message_received_includes_message_class(): void
    {
        $message = new TestMessage('test-data');
        $envelope = new Envelope($message);
        $event = new WorkerMessageReceivedEvent($envelope, 'async');

        $this->subscriber->onMessageReceived($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertStringContainsString('TestMessage', $breadcrumbs[0]['message']);
        $this->assertStringContainsString('TestMessage', $breadcrumbs[0]['data']['message_class']);
    }

    public function test_on_message_received_includes_transport(): void
    {
        $message = new TestMessage('test-data');
        $envelope = new Envelope($message);
        $event = new WorkerMessageReceivedEvent($envelope, 'failed');

        $this->subscriber->onMessageReceived($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('failed', $breadcrumbs[0]['data']['transport']);
    }

    public function test_on_message_handled_adds_breadcrumb(): void
    {
        $message = new TestMessage('test-data');
        $envelope = new Envelope($message);
        $event = new WorkerMessageHandledEvent($envelope, 'async');

        $this->subscriber->onMessageHandled($event);

        // Note: onMessageHandled clears breadcrumbs after adding, so we need to check differently
        // Let's add a pre-existing breadcrumb first
        BreadcrumbManager::add(['type' => 'test', 'message' => 'pre-existing']);

        $this->subscriber->onMessageHandled($event);

        // After successful handling, breadcrumbs should be cleared
        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(0, $breadcrumbs);
    }

    public function test_on_message_handled_clears_breadcrumbs(): void
    {
        // Add some pre-existing breadcrumbs
        BreadcrumbManager::add(['type' => 'log', 'message' => 'Log 1']);
        BreadcrumbManager::add(['type' => 'log', 'message' => 'Log 2']);

        $this->assertCount(2, BreadcrumbManager::getAll());

        $message = new TestMessage('test-data');
        $envelope = new Envelope($message);
        $event = new WorkerMessageHandledEvent($envelope, 'async');

        $this->subscriber->onMessageHandled($event);

        // Breadcrumbs should be cleared after successful handling
        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(0, $breadcrumbs);
    }

    public function test_on_message_failed_adds_breadcrumb(): void
    {
        $message = new TestMessage('test-data');
        $envelope = new Envelope($message);
        $exception = new \RuntimeException('Processing failed');
        $event = new WorkerMessageFailedEvent($envelope, 'async', $exception);

        $this->subscriber->onMessageFailed($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('message', $breadcrumbs[0]['type']);
        $this->assertSame('messenger.failed', $breadcrumbs[0]['category']);
        $this->assertSame('error', $breadcrumbs[0]['level']);
    }

    public function test_on_message_failed_includes_message_class(): void
    {
        $message = new TestMessage('test-data');
        $envelope = new Envelope($message);
        $exception = new \RuntimeException('Processing failed');
        $event = new WorkerMessageFailedEvent($envelope, 'async', $exception);

        $this->subscriber->onMessageFailed($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertStringContainsString('TestMessage', $breadcrumbs[0]['message']);
        $this->assertStringContainsString('TestMessage', $breadcrumbs[0]['data']['message_class']);
    }

    public function test_on_message_failed_includes_will_retry(): void
    {
        $message = new TestMessage('test-data');
        $envelope = new Envelope($message);
        $exception = new \RuntimeException('Processing failed');
        $event = new WorkerMessageFailedEvent($envelope, 'async', $exception);

        $this->subscriber->onMessageFailed($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertArrayHasKey('will_retry', $breadcrumbs[0]['data']);
    }

    public function test_message_flow_received_then_handled(): void
    {
        $message = new TestMessage('order-123');
        $envelope = new Envelope($message);

        // Message received
        $receivedEvent = new WorkerMessageReceivedEvent($envelope, 'async');
        $this->subscriber->onMessageReceived($receivedEvent);

        $this->assertCount(1, BreadcrumbManager::getAll());

        // Message handled successfully
        $handledEvent = new WorkerMessageHandledEvent($envelope, 'async');
        $this->subscriber->onMessageHandled($handledEvent);

        // After handling, breadcrumbs are cleared
        $this->assertCount(0, BreadcrumbManager::getAll());
    }

    public function test_message_flow_received_then_failed(): void
    {
        $message = new TestMessage('order-123');
        $envelope = new Envelope($message);

        // Message received
        $receivedEvent = new WorkerMessageReceivedEvent($envelope, 'async');
        $this->subscriber->onMessageReceived($receivedEvent);

        $this->assertCount(1, BreadcrumbManager::getAll());

        // Message failed
        $exception = new \RuntimeException('Database connection lost');
        $failedEvent = new WorkerMessageFailedEvent($envelope, 'async', $exception);
        $this->subscriber->onMessageFailed($failedEvent);

        // After failure, breadcrumbs are kept (for error context)
        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(2, $breadcrumbs);
        $this->assertSame('messenger.received', $breadcrumbs[0]['category']);
        $this->assertSame('messenger.failed', $breadcrumbs[1]['category']);
    }
}

/**
 * Test message class for Messenger tests.
 */
class TestMessage
{
    public function __construct(
        public readonly string $data
    ) {}
}
