<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel\Handlers;

use ErrorExplorer\ErrorExplorer;
use Illuminate\Contracts\Container\Container;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Http\Request;
use Symfony\Component\Console\Output\OutputInterface;
use Throwable;

/**
 * Decorator for Laravel's Exception Handler.
 *
 * Captures exceptions and sends them to Error Explorer while
 * delegating all other functionality to the original handler.
 */
class ErrorExplorerExceptionHandler implements ExceptionHandler
{
    public function __construct(
        private readonly ExceptionHandler $originalHandler,
        private readonly Container $container,
    ) {
    }

    /**
     * Report an exception.
     */
    public function report(Throwable $e): void
    {
        // Capture to Error Explorer if not ignored
        if ($this->shouldCapture($e)) {
            $this->captureException($e);
        }

        // Always delegate to original handler
        $this->originalHandler->report($e);
    }

    /**
     * Render an exception into an HTTP response.
     */
    public function render($request, Throwable $e): mixed
    {
        return $this->originalHandler->render($request, $e);
    }

    /**
     * Render an exception to the console.
     */
    public function renderForConsole($output, Throwable $e): void
    {
        $this->originalHandler->renderForConsole($output, $e);
    }

    /**
     * Determine if the exception should be reported.
     */
    public function shouldReport(Throwable $e): bool
    {
        return $this->originalHandler->shouldReport($e);
    }

    /**
     * Determine if the exception should be captured by Error Explorer.
     */
    private function shouldCapture(Throwable $e): bool
    {
        if (!ErrorExplorer::isInitialized()) {
            return false;
        }

        // Check if this exception type should be ignored
        /** @var class-string[] */
        $ignoredExceptions = config('error-explorer.ignore.exceptions', []);

        foreach ($ignoredExceptions as $ignoredException) {
            if ($e instanceof $ignoredException) {
                return false;
            }
        }

        // Respect Laravel's shouldReport
        if (!$this->originalHandler->shouldReport($e)) {
            /** @var bool */
            $respectDontReport = config('error-explorer.respect_dont_report', true);
            if ($respectDontReport) {
                return false;
            }
        }

        return true;
    }

    /**
     * Capture the exception to Error Explorer.
     */
    private function captureException(Throwable $e): void
    {
        $context = $this->buildContext();

        ErrorExplorer::captureException($e, $context);
    }

    /**
     * Build context for the exception.
     *
     * @return array<string, mixed>
     */
    private function buildContext(): array
    {
        $context = [];

        // Add user context if available
        $user = $this->getCurrentUser();
        if ($user !== null) {
            ErrorExplorer::setUser($user);
        }

        // Add request context
        $request = $this->getCurrentRequest();
        if ($request !== null) {
            $context['tags'] = [
                'route' => $request->route()?->getName() ?? 'unknown',
            ];
        }

        return $context;
    }

    /**
     * Get the current authenticated user context.
     *
     * @return array<string, mixed>|null
     */
    private function getCurrentUser(): ?array
    {
        /** @var bool */
        $captureUser = config('error-explorer.context.user', true);
        if (!$captureUser) {
            return null;
        }

        try {
            /** @var \Illuminate\Contracts\Auth\Factory|null $auth */
            $auth = $this->container->make('auth');
            if ($auth === null) {
                return null;
            }

            $user = $auth->user();
            if ($user === null) {
                return null;
            }

            $userData = [
                'id' => (string) $user->getAuthIdentifier(),
            ];

            // Add email if available
            if (method_exists($user, 'getEmailForVerification')) {
                $userData['email'] = $user->getEmailForVerification();
            } elseif (isset($user->email)) {
                $userData['email'] = $user->email;
            }

            // Add name if available
            if (isset($user->name)) {
                $userData['name'] = $user->name;
            }

            return $userData;
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * Get the current request.
     */
    private function getCurrentRequest(): ?Request
    {
        try {
            return $this->container->make('request');
        } catch (Throwable) {
            return null;
        }
    }
}
