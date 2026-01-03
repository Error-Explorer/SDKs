<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\EventSubscriber;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\Event\TerminateEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Records HTTP request/response breadcrumbs.
 */
final class RequestSubscriber implements EventSubscriberInterface
{
    private float $requestStartTime = 0;

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onRequest', 1000],
            KernelEvents::RESPONSE => ['onResponse', -1000],
        ];
    }

    public function onRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $this->requestStartTime = microtime(true);

        $request = $event->getRequest();

        BreadcrumbManager::add([
            'type' => 'navigation',
            'category' => 'http.request',
            'message' => sprintf('%s %s', $request->getMethod(), $request->getPathInfo()),
            'level' => 'info',
            'data' => [
                'method' => $request->getMethod(),
                'url' => $request->getUri(),
                'route' => $request->attributes->get('_route'),
                'controller' => $request->attributes->get('_controller'),
            ],
        ]);
    }

    public function onResponse(ResponseEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $response = $event->getResponse();
        $request = $event->getRequest();
        $duration = microtime(true) - $this->requestStartTime;

        $statusCode = $response->getStatusCode();
        $level = $statusCode >= 500 ? 'error' : ($statusCode >= 400 ? 'warning' : 'info');

        BreadcrumbManager::add([
            'type' => 'http',
            'category' => 'http.response',
            'message' => sprintf('%s %s → %d', $request->getMethod(), $request->getPathInfo(), $statusCode),
            'level' => $level,
            'data' => [
                'status_code' => $statusCode,
                'duration_ms' => round($duration * 1000, 2),
            ],
        ]);
    }
}
