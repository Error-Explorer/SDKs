<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel\Tests\Unit;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\Laravel\Middleware\ErrorExplorerMiddleware;
use ErrorExplorer\Laravel\Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

final class MiddlewareTest extends TestCase
{
    private ErrorExplorerMiddleware $middleware;

    protected function setUp(): void
    {
        parent::setUp();
        $this->middleware = new ErrorExplorerMiddleware();
    }

    public function test_adds_request_breadcrumb(): void
    {
        $request = Request::create('/test-path', 'GET');
        $response = new Response('OK', 200);

        $this->middleware->handle($request, fn () => $response);

        $breadcrumbs = BreadcrumbManager::getAll();

        // Should have request and response breadcrumbs
        $this->assertGreaterThanOrEqual(2, count($breadcrumbs));

        // Find request breadcrumb
        $requestBreadcrumb = $this->findBreadcrumb($breadcrumbs, 'http.request');
        $this->assertNotNull($requestBreadcrumb);
        $this->assertSame('GET', $requestBreadcrumb['data']['method']);
        $this->assertStringContainsString('test-path', $requestBreadcrumb['data']['url']);
    }

    public function test_adds_response_breadcrumb(): void
    {
        $request = Request::create('/test-path', 'POST');
        $response = new Response('Created', 201);

        $this->middleware->handle($request, fn () => $response);

        $breadcrumbs = BreadcrumbManager::getAll();

        // Find response breadcrumb
        $responseBreadcrumb = $this->findBreadcrumb($breadcrumbs, 'http.response');
        $this->assertNotNull($responseBreadcrumb);
        $this->assertSame(201, $responseBreadcrumb['data']['status_code']);
        $this->assertArrayHasKey('duration_ms', $responseBreadcrumb['data']);
    }

    public function test_response_breadcrumb_has_error_level_for_4xx(): void
    {
        $request = Request::create('/not-found', 'GET');
        $response = new Response('Not Found', 404);

        $this->middleware->handle($request, fn () => $response);

        $breadcrumbs = BreadcrumbManager::getAll();
        $responseBreadcrumb = $this->findBreadcrumb($breadcrumbs, 'http.response');

        $this->assertNotNull($responseBreadcrumb);
        $this->assertSame('error', $responseBreadcrumb['level']);
    }

    public function test_response_breadcrumb_has_error_level_for_5xx(): void
    {
        $request = Request::create('/error', 'GET');
        $response = new Response('Server Error', 500);

        $this->middleware->handle($request, fn () => $response);

        $breadcrumbs = BreadcrumbManager::getAll();
        $responseBreadcrumb = $this->findBreadcrumb($breadcrumbs, 'http.response');

        $this->assertNotNull($responseBreadcrumb);
        $this->assertSame('error', $responseBreadcrumb['level']);
    }

    public function test_response_breadcrumb_has_info_level_for_2xx(): void
    {
        $request = Request::create('/success', 'GET');
        $response = new Response('OK', 200);

        $this->middleware->handle($request, fn () => $response);

        $breadcrumbs = BreadcrumbManager::getAll();
        $responseBreadcrumb = $this->findBreadcrumb($breadcrumbs, 'http.response');

        $this->assertNotNull($responseBreadcrumb);
        $this->assertSame('info', $responseBreadcrumb['level']);
    }

    public function test_ignores_debugbar_routes(): void
    {
        BreadcrumbManager::clear();

        $request = Request::create('/_debugbar/assets/stylesheets', 'GET');
        $response = new Response('OK', 200);

        $this->middleware->handle($request, fn () => $response);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertEmpty($breadcrumbs);
    }

    public function test_ignores_telescope_routes(): void
    {
        BreadcrumbManager::clear();

        $request = Request::create('/telescope/requests', 'GET');
        $response = new Response('OK', 200);

        $this->middleware->handle($request, fn () => $response);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertEmpty($breadcrumbs);
    }

    public function test_ignores_horizon_routes(): void
    {
        BreadcrumbManager::clear();

        $request = Request::create('/horizon/dashboard', 'GET');
        $response = new Response('OK', 200);

        $this->middleware->handle($request, fn () => $response);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertEmpty($breadcrumbs);
    }

    public function test_captures_ajax_flag(): void
    {
        $request = Request::create('/api/data', 'GET');
        $request->headers->set('X-Requested-With', 'XMLHttpRequest');
        $response = new Response('{"data": []}', 200);

        $this->middleware->handle($request, fn () => $response);

        $breadcrumbs = BreadcrumbManager::getAll();
        $requestBreadcrumb = $this->findBreadcrumb($breadcrumbs, 'http.request');

        $this->assertNotNull($requestBreadcrumb);
        $this->assertTrue($requestBreadcrumb['data']['ajax']);
    }

    /**
     * Find a breadcrumb by category.
     *
     * @param array<int, array<string, mixed>> $breadcrumbs
     * @return array<string, mixed>|null
     */
    private function findBreadcrumb(array $breadcrumbs, string $category): ?array
    {
        foreach ($breadcrumbs as $breadcrumb) {
            if (($breadcrumb['category'] ?? '') === $category) {
                return $breadcrumb;
            }
        }
        return null;
    }
}
