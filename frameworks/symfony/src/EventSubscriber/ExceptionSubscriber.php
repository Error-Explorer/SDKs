<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\EventSubscriber;

use ErrorExplorer\ErrorExplorer;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Captures exceptions and sends them to Error Explorer.
 *
 * Runs at priority -50 to run BEFORE Symfony's ErrorListener (-128)
 * but AFTER logging (0) and router (-64).
 */
final class ExceptionSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::EXCEPTION => ['onKernelException', -50],
        ];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        ErrorExplorer::captureException($event->getThrowable());
    }
}
