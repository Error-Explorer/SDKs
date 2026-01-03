<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel\Middleware;

use Closure;
use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\ErrorExplorer;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware that captures HTTP request/response as breadcrumbs.
 */
class ErrorExplorerMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!ErrorExplorer::isInitialized()) {
            return $next($request);
        }

        // Check if this route should be ignored
        if ($this->shouldIgnore($request)) {
            return $next($request);
        }

        $startTime = microtime(true);

        // Add request breadcrumb
        $this->addRequestBreadcrumb($request);

        // Set user context if authenticated
        $this->setUserContext($request);

        /** @var Response $response */
        $response = $next($request);

        // Add response breadcrumb
        $this->addResponseBreadcrumb($request, $response, $startTime);

        return $response;
    }

    /**
     * Check if this request should be ignored.
     */
    private function shouldIgnore(Request $request): bool
    {
        /** @var string[] */
        $ignoredRoutes = config('error-explorer.ignore.routes', []);
        $routeName = $request->route()?->getName();

        if ($routeName !== null && in_array($routeName, $ignoredRoutes, true)) {
            return true;
        }

        // Ignore common debug/profiler routes
        $path = $request->path();
        $defaultIgnored = ['_debugbar', '_ignition', 'telescope', 'horizon'];

        foreach ($defaultIgnored as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Add a breadcrumb for the incoming request.
     */
    private function addRequestBreadcrumb(Request $request): void
    {
        BreadcrumbManager::add([
            'type' => 'http',
            'category' => 'http.request',
            'message' => sprintf('%s %s', $request->method(), $request->path()),
            'level' => 'info',
            'data' => [
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'route' => $request->route()?->getName() ?? $request->path(),
                'ajax' => $request->ajax(),
            ],
        ]);
    }

    /**
     * Add a breadcrumb for the response.
     */
    private function addResponseBreadcrumb(Request $request, Response $response, float $startTime): void
    {
        $duration = microtime(true) - $startTime;
        $statusCode = $response->getStatusCode();

        BreadcrumbManager::add([
            'type' => 'http',
            'category' => 'http.response',
            'message' => sprintf('%s %s → %d', $request->method(), $request->path(), $statusCode),
            'level' => $statusCode >= 400 ? 'error' : 'info',
            'data' => [
                'status_code' => $statusCode,
                'duration_ms' => round($duration * 1000, 2),
            ],
        ]);
    }

    /**
     * Set user context from authenticated user.
     */
    private function setUserContext(Request $request): void
    {
        /** @var bool */
        $captureUser = config('error-explorer.context.user', true);
        if (!$captureUser) {
            return;
        }

        $user = $request->user();
        if ($user === null) {
            return;
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

        ErrorExplorer::setUser($userData);
    }
}
