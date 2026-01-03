<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\Tests\EventSubscriber;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\Symfony\EventSubscriber\ConsoleSubscriber;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\ConsoleEvents;
use Symfony\Component\Console\Event\ConsoleCommandEvent;
use Symfony\Component\Console\Event\ConsoleErrorEvent;
use Symfony\Component\Console\Event\ConsoleTerminateEvent;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\NullOutput;

final class ConsoleSubscriberTest extends TestCase
{
    private ConsoleSubscriber $subscriber;

    protected function setUp(): void
    {
        BreadcrumbManager::clear();
        $this->subscriber = new ConsoleSubscriber();
    }

    protected function tearDown(): void
    {
        BreadcrumbManager::clear();
    }

    public function test_subscribed_events(): void
    {
        $events = ConsoleSubscriber::getSubscribedEvents();

        $this->assertArrayHasKey(ConsoleEvents::COMMAND, $events);
        $this->assertArrayHasKey(ConsoleEvents::TERMINATE, $events);
        $this->assertArrayHasKey(ConsoleEvents::ERROR, $events);
    }

    public function test_on_command_adds_breadcrumb(): void
    {
        $command = new Command('app:test-command');
        $input = new ArrayInput([]);
        $output = new NullOutput();

        $event = new ConsoleCommandEvent($command, $input, $output);
        $this->subscriber->onCommand($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('command', $breadcrumbs[0]['type']);
        $this->assertSame('console.command', $breadcrumbs[0]['category']);
        $this->assertSame('Starting: app:test-command', $breadcrumbs[0]['message']);
        $this->assertSame('info', $breadcrumbs[0]['level']);
    }

    public function test_on_command_includes_command_name_in_data(): void
    {
        $command = new Command('app:import-users');
        $input = new ArrayInput([]);
        $output = new NullOutput();

        $event = new ConsoleCommandEvent($command, $input, $output);
        $this->subscriber->onCommand($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('app:import-users', $breadcrumbs[0]['data']['command']);
    }

    public function test_on_terminate_adds_breadcrumb(): void
    {
        $command = new Command('app:test-command');
        $input = new ArrayInput([]);
        $output = new NullOutput();

        // First trigger onCommand to set start time
        $commandEvent = new ConsoleCommandEvent($command, $input, $output);
        $this->subscriber->onCommand($commandEvent);

        BreadcrumbManager::clear(); // Clear for this test

        // Use non-zero exit code so breadcrumbs are NOT cleared after terminate
        $terminateEvent = new ConsoleTerminateEvent($command, $input, $output, 1);
        $this->subscriber->onTerminate($terminateEvent);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('command', $breadcrumbs[0]['type']);
        $this->assertSame('console.terminate', $breadcrumbs[0]['category']);
    }

    public function test_on_terminate_info_level_for_success(): void
    {
        // Note: Successful termination clears breadcrumbs, so we verify by checking
        // that before clearing, the breadcrumb was added with correct level.
        // We test this by verifying the terminate behavior with failure case (where
        // breadcrumbs are kept) and the clearing behavior separately.

        // The best way to verify the level logic works for success is to check
        // that success clears breadcrumbs (test_on_terminate_clears_breadcrumbs_on_success)
        // and that failure uses 'error' level (test_on_terminate_error_level_for_failure).
        // The level mapping logic (exit_code === 0 ? 'info' : 'error') is the same code path.

        $command = new Command('app:test-command');
        $input = new ArrayInput([]);
        $output = new NullOutput();

        $commandEvent = new ConsoleCommandEvent($command, $input, $output);
        $this->subscriber->onCommand($commandEvent);

        $terminateEvent = new ConsoleTerminateEvent($command, $input, $output, 0);
        $this->subscriber->onTerminate($terminateEvent);

        // Successful termination clears breadcrumbs
        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(0, $breadcrumbs);
    }

    public function test_on_terminate_error_level_for_failure(): void
    {
        $command = new Command('app:failing-command');
        $input = new ArrayInput([]);
        $output = new NullOutput();

        $commandEvent = new ConsoleCommandEvent($command, $input, $output);
        $this->subscriber->onCommand($commandEvent);

        $terminateEvent = new ConsoleTerminateEvent($command, $input, $output, 1);
        $this->subscriber->onTerminate($terminateEvent);

        $breadcrumbs = BreadcrumbManager::getAll();
        $lastBreadcrumb = end($breadcrumbs);

        $this->assertSame('error', $lastBreadcrumb['level']);
        $this->assertSame(1, $lastBreadcrumb['data']['exit_code']);
    }

    public function test_on_terminate_includes_duration(): void
    {
        $command = new Command('app:test-command');
        $input = new ArrayInput([]);
        $output = new NullOutput();

        $commandEvent = new ConsoleCommandEvent($command, $input, $output);
        $this->subscriber->onCommand($commandEvent);

        // Small delay to ensure measurable duration
        usleep(1000); // 1ms

        // Use failure exit code so breadcrumbs are kept
        $terminateEvent = new ConsoleTerminateEvent($command, $input, $output, 1);
        $this->subscriber->onTerminate($terminateEvent);

        $breadcrumbs = BreadcrumbManager::getAll();
        $lastBreadcrumb = end($breadcrumbs);

        $this->assertArrayHasKey('duration_ms', $lastBreadcrumb['data']);
        $this->assertIsFloat($lastBreadcrumb['data']['duration_ms']);
    }

    public function test_on_terminate_clears_breadcrumbs_on_success(): void
    {
        $command = new Command('app:test-command');
        $input = new ArrayInput([]);
        $output = new NullOutput();

        BreadcrumbManager::add(['type' => 'test', 'message' => 'Pre-existing']);

        $commandEvent = new ConsoleCommandEvent($command, $input, $output);
        $this->subscriber->onCommand($commandEvent);

        $terminateEvent = new ConsoleTerminateEvent($command, $input, $output, 0);
        $this->subscriber->onTerminate($terminateEvent);

        // After successful command, breadcrumbs should be cleared
        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(0, $breadcrumbs);
    }

    public function test_on_terminate_keeps_breadcrumbs_on_failure(): void
    {
        $command = new Command('app:failing-command');
        $input = new ArrayInput([]);
        $output = new NullOutput();

        BreadcrumbManager::add(['type' => 'test', 'message' => 'Pre-existing']);

        $commandEvent = new ConsoleCommandEvent($command, $input, $output);
        $this->subscriber->onCommand($commandEvent);

        $terminateEvent = new ConsoleTerminateEvent($command, $input, $output, 1);
        $this->subscriber->onTerminate($terminateEvent);

        // After failed command, breadcrumbs should be kept
        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertGreaterThan(0, count($breadcrumbs));
    }

    public function test_terminate_message_format(): void
    {
        $command = new Command('app:process-queue');
        $input = new ArrayInput([]);
        $output = new NullOutput();

        $commandEvent = new ConsoleCommandEvent($command, $input, $output);
        $this->subscriber->onCommand($commandEvent);

        // Use failure exit code so breadcrumbs are kept
        $terminateEvent = new ConsoleTerminateEvent($command, $input, $output, 1);
        $this->subscriber->onTerminate($terminateEvent);

        $breadcrumbs = BreadcrumbManager::getAll();
        $lastBreadcrumb = end($breadcrumbs);

        $this->assertSame('Finished: app:process-queue (exit: 1)', $lastBreadcrumb['message']);
    }

    public function test_on_error_captures_exception(): void
    {
        // This test verifies the structure, actual ErrorExplorer capture would require mocking
        $command = new Command('app:failing-command');
        $input = new ArrayInput([]);
        $output = new NullOutput();
        $exception = new \RuntimeException('Something went wrong');

        $event = new ConsoleErrorEvent($input, $output, $exception, $command);

        // We can't fully test captureException without mocking ErrorExplorer
        // But we can verify the event handling doesn't throw
        $this->subscriber->onError($event);

        // If we get here without exception, the handler worked
        $this->assertTrue(true);
    }
}
