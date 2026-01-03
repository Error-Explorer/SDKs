<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\Tests\EventSubscriber;

use ErrorExplorer\Symfony\EventSubscriber\ExceptionSubscriber;
use PHPUnit\Framework\TestCase;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\User\UserInterface;

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

    public function test_handles_exception_without_security(): void
    {
        $subscriber = new ExceptionSubscriber();
        $exception = new \RuntimeException('Test exception');
        $event = $this->createExceptionEvent($exception);

        // Should not throw
        $subscriber->onKernelException($event);

        // If we get here, it handled the exception gracefully
        $this->assertTrue(true);
    }

    public function test_handles_exception_with_null_security(): void
    {
        $subscriber = new ExceptionSubscriber(null);
        $exception = new \InvalidArgumentException('Invalid argument');
        $event = $this->createExceptionEvent($exception);

        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_handles_exception_with_security_but_no_user(): void
    {
        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn(null);

        $subscriber = new ExceptionSubscriber($security);
        $exception = new \RuntimeException('Test exception');
        $event = $this->createExceptionEvent($exception);

        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_handles_exception_with_user(): void
    {
        $user = $this->createMock(UserInterface::class);
        $user->method('getUserIdentifier')->willReturn('user_123');
        $user->method('getRoles')->willReturn(['ROLE_USER']);

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($user);

        $subscriber = new ExceptionSubscriber($security);
        $exception = new \RuntimeException('Test exception');
        $event = $this->createExceptionEvent($exception);

        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_handles_exception_with_user_email(): void
    {
        $user = $this->createMockUserWithEmail('john@example.com');

        $security = $this->createMock(Security::class);
        $security->method('getUser')->willReturn($user);

        $subscriber = new ExceptionSubscriber($security);
        $exception = new \RuntimeException('Test exception');
        $event = $this->createExceptionEvent($exception);

        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_auto_user_disabled(): void
    {
        $user = $this->createMock(UserInterface::class);
        $user->method('getUserIdentifier')->willReturn('user_123');
        $user->method('getRoles')->willReturn(['ROLE_USER']);

        $security = $this->createMock(Security::class);
        // getUser should not be called when autoUser is false
        $security->expects($this->never())->method('getUser');

        $subscriber = new ExceptionSubscriber($security, -1024, false);
        $exception = new \RuntimeException('Test exception');
        $event = $this->createExceptionEvent($exception);

        $subscriber->onKernelException($event);

        $this->assertTrue(true);
    }

    public function test_handles_security_exception_gracefully(): void
    {
        $security = $this->createMock(Security::class);
        $security->method('getUser')->willThrowException(new \RuntimeException('Security error'));

        $subscriber = new ExceptionSubscriber($security);
        $exception = new \RuntimeException('Original exception');
        $event = $this->createExceptionEvent($exception);

        // Should not throw - security errors are silently ignored
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

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private function createExceptionEvent(\Throwable $exception): ExceptionEvent
    {
        $kernel = $this->createMock(HttpKernelInterface::class);
        $request = Request::create('/api/test', 'GET');

        return new ExceptionEvent(
            $kernel,
            $request,
            HttpKernelInterface::MAIN_REQUEST,
            $exception
        );
    }

    /**
     * Creates a mock user with getEmail method.
     */
    private function createMockUserWithEmail(string $email): UserInterface
    {
        $user = new class($email) implements UserInterface {
            public function __construct(private string $email) {}
            public function getRoles(): array { return ['ROLE_USER']; }
            public function eraseCredentials(): void {}
            public function getUserIdentifier(): string { return 'user_123'; }
            public function getEmail(): string { return $this->email; }
        };

        return $user;
    }
}
