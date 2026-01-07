<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\EventSubscriber;

use ErrorExplorer\ErrorExplorer;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Captures exceptions and sends them to Error Explorer.
 *
 * Runs at priority -50 to run BEFORE Symfony's ErrorListener (-128)
 * but AFTER logging (0) and router (-64).
 */
final class ExceptionSubscriber implements EventSubscriberInterface
{
    private const DEFAULT_PRIORITY = -50;

    /**
     * @param array{exceptions?: string[], routes?: string[], status_codes?: int[], paths?: string[]} $ignore
     */
    public function __construct(
        private readonly array $ignore = [],
        private readonly int $listenerPriority = self::DEFAULT_PRIORITY,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::EXCEPTION => ['onKernelException', self::DEFAULT_PRIORITY],
        ];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $throwable = $event->getThrowable();
        $request = $event->getRequest();

        // Check if exception class should be ignored
        if ($this->shouldIgnoreException($throwable)) {
            return;
        }

        // Check if route should be ignored
        $route = $request->attributes->get('_route', '');
        if ($this->shouldIgnoreRoute($route)) {
            return;
        }

        // Check if path should be ignored
        $path = $request->getPathInfo();
        if ($this->shouldIgnorePath($path)) {
            return;
        }

        // Check if status code should be ignored (for HTTP exceptions)
        if ($throwable instanceof HttpExceptionInterface) {
            if ($this->shouldIgnoreStatusCode($throwable->getStatusCode())) {
                return;
            }
        }

        ErrorExplorer::captureException($throwable);
    }

    private function shouldIgnoreException(\Throwable $throwable): bool
    {
        $ignoredExceptions = $this->ignore['exceptions'] ?? [];
        if (empty($ignoredExceptions)) {
            return false;
        }

        $exceptionClass = get_class($throwable);

        foreach ($ignoredExceptions as $ignoredClass) {
            // Exact match or instanceof check
            if ($exceptionClass === $ignoredClass || is_a($throwable, $ignoredClass)) {
                return true;
            }
        }

        return false;
    }

    private function shouldIgnoreRoute(string $route): bool
    {
        $ignoredRoutes = $this->ignore['routes'] ?? [];
        return in_array($route, $ignoredRoutes, true);
    }

    private function shouldIgnorePath(string $path): bool
    {
        $ignoredPaths = $this->ignore['paths'] ?? [];
        if (empty($ignoredPaths)) {
            return false;
        }

        foreach ($ignoredPaths as $pattern) {
            // Support regex patterns
            if (@preg_match('#' . $pattern . '#', $path)) {
                return true;
            }
        }

        return false;
    }

    private function shouldIgnoreStatusCode(int $statusCode): bool
    {
        $ignoredStatusCodes = $this->ignore['status_codes'] ?? [];
        return in_array($statusCode, $ignoredStatusCodes, true);
    }
}
