<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\EventSubscriber;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\ErrorExplorer;
use Symfony\Component\Console\ConsoleEvents;
use Symfony\Component\Console\Event\ConsoleCommandEvent;
use Symfony\Component\Console\Event\ConsoleErrorEvent;
use Symfony\Component\Console\Event\ConsoleTerminateEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Records console command breadcrumbs and captures errors.
 */
final class ConsoleSubscriber implements EventSubscriberInterface
{
    private float $commandStartTime = 0;

    public static function getSubscribedEvents(): array
    {
        return [
            ConsoleEvents::COMMAND => 'onCommand',
            ConsoleEvents::TERMINATE => 'onTerminate',
            ConsoleEvents::ERROR => 'onError',
        ];
    }

    public function onCommand(ConsoleCommandEvent $event): void
    {
        $this->commandStartTime = microtime(true);

        $command = $event->getCommand();
        $input = $event->getInput();

        BreadcrumbManager::add([
            'type' => 'command',
            'category' => 'console.command',
            'message' => sprintf('Starting: %s', $command?->getName() ?? 'unknown'),
            'level' => 'info',
            'data' => [
                'command' => $command?->getName(),
                'arguments' => $input->getArguments(),
            ],
        ]);
    }

    public function onTerminate(ConsoleTerminateEvent $event): void
    {
        $duration = microtime(true) - $this->commandStartTime;
        $exitCode = $event->getExitCode();

        BreadcrumbManager::add([
            'type' => 'command',
            'category' => 'console.terminate',
            'message' => sprintf('Finished: %s (exit: %d)', $event->getCommand()?->getName() ?? 'unknown', $exitCode),
            'level' => $exitCode === 0 ? 'info' : 'error',
            'data' => [
                'exit_code' => $exitCode,
                'duration_ms' => round($duration * 1000, 2),
            ],
        ]);

        // Clear breadcrumbs for next command in long-running processes
        if ($exitCode === 0) {
            BreadcrumbManager::clear();
        }
    }

    public function onError(ConsoleErrorEvent $event): void
    {
        $exception = $event->getError();

        // Tag as console error
        ErrorExplorer::setTags(['context' => 'console']);

        // Set command info as extra
        ErrorExplorer::setExtra([
            'command' => $event->getCommand()?->getName(),
            'exit_code' => $event->getExitCode(),
        ]);

        ErrorExplorer::captureException($exception);
    }
}
