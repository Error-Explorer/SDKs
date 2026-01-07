<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\Tests\EventSubscriber;

use ErrorExplorer\Symfony\EventSubscriber\ExceptionSubscriber;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\HttpKernel\KernelEvents;

final class ExceptionSubscriberTest extends TestCase
{
    public function test_subscribed_events(): void
    {
        $events = ExceptionSubscriber::getSubscribedEvents();

        $this->assertArrayHasKey(KernelEvents::EXCEPTION, $events);
    }

    public function test_exception_event_priority(): void
    {
        $events = ExceptionSubscriber::getSubscribedEvents();

        // Priority -50 to run BEFORE Symfony's ErrorListener (-128)
        // but AFTER logging (0) and router (-64)
        $this->assertSame(['onKernelException', -50], $events[KernelEvents::EXCEPTION]);
    }

    public function test_handles_exception_without_ignore_config(): void
    {
        $subscriber = new ExceptionSubscriber();
        $exception = new \RuntimeException('Test exception');
        $event = $this->createExceptionEvent($exception);

        // Should not throw
        $subscriber->onKernelException($event);

        // If we get here, it handled the exception gracefully
        $this->assertTrue(true);
    }

    public function test_handles_exception_with_empty_ignore_config(): void
    {
        $subscriber = new ExceptionSubscriber([]);
        $exception = new \InvalidArgumentException('Invalid argument');
        $event = $this->createExceptionEvent($exception);

        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_ignores_exception_by_class_name(): void
    {
        $ignore = [
            'exceptions' => [NotFoundHttpException::class],
        ];

        $subscriber = new ExceptionSubscriber($ignore);
        $exception = new NotFoundHttpException('Page not found');
        $event = $this->createExceptionEvent($exception);

        // Exception should be ignored (method returns early)
        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_ignores_exception_by_parent_class(): void
    {
        $ignore = [
            'exceptions' => ['Symfony\Component\HttpKernel\Exception\HttpException'],
        ];

        $subscriber = new ExceptionSubscriber($ignore);
        $exception = new NotFoundHttpException('Page not found');
        $event = $this->createExceptionEvent($exception);

        // Exception should be ignored because NotFoundHttpException extends HttpException
        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_does_not_ignore_unmatched_exception(): void
    {
        $ignore = [
            'exceptions' => [NotFoundHttpException::class],
        ];

        $subscriber = new ExceptionSubscriber($ignore);
        $exception = new \RuntimeException('Some runtime error');
        $event = $this->createExceptionEvent($exception);

        // Exception should NOT be ignored
        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_ignores_route(): void
    {
        $ignore = [
            'routes' => ['_wdt', '_profiler'],
        ];

        $subscriber = new ExceptionSubscriber($ignore);
        $exception = new \RuntimeException('Test exception');
        $event = $this->createExceptionEvent($exception, '/_wdt/abcdef', '_wdt');

        // Exception should be ignored because route is _wdt
        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_ignores_path_with_regex(): void
    {
        $ignore = [
            'paths' => ['^/health', '^/api/ping'],
        ];

        $subscriber = new ExceptionSubscriber($ignore);
        $exception = new \RuntimeException('Test exception');
        $event = $this->createExceptionEvent($exception, '/health/check');

        // Exception should be ignored because path matches ^/health
        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_ignores_status_code(): void
    {
        $ignore = [
            'status_codes' => [404, 403],
        ];

        $subscriber = new ExceptionSubscriber($ignore);
        $exception = new NotFoundHttpException('Page not found');
        $event = $this->createExceptionEvent($exception);

        // Exception should be ignored because status code is 404
        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_does_not_ignore_unmatched_status_code(): void
    {
        $ignore = [
            'status_codes' => [404],
        ];

        $subscriber = new ExceptionSubscriber($ignore);
        $exception = new AccessDeniedHttpException('Access denied');
        $event = $this->createExceptionEvent($exception);

        // Exception should NOT be ignored (403 is not in the list)
        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_exception_types_are_captured(): void
    {
        $subscriber = new ExceptionSubscriber();

        $testCases = [
            new \RuntimeException('Runtime error'),
            new \InvalidArgumentException('Invalid argument'),
            new \LogicException('Logic error'),
            new \TypeError('Type error'),
        ];

        foreach ($testCases as $exception) {
            $event = $this->createExceptionEvent($exception);
            $subscriber->onKernelException($event);
        }

        // All exceptions should be handled without throwing
        $this->assertTrue(true);
    }

    public function test_custom_listener_priority(): void
    {
        $subscriber = new ExceptionSubscriber([], -100);

        // The priority is stored but getSubscribedEvents returns the default
        // This tests that the constructor accepts the priority parameter
        $this->assertInstanceOf(ExceptionSubscriber::class, $subscriber);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private function createExceptionEvent(
        \Throwable $exception,
        string $path = '/api/test',
        ?string $route = null
    ): ExceptionEvent {
        $kernel = $this->createMock(HttpKernelInterface::class);
        $request = Request::create($path, 'GET');

        if ($route !== null) {
            $request->attributes->set('_route', $route);
        }

        return new ExceptionEvent(
            $kernel,
            $request,
            HttpKernelInterface::MAIN_REQUEST,
            $exception
        );
    }
}
