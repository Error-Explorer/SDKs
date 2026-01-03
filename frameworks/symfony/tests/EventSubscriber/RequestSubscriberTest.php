<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\Tests\EventSubscriber;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\Symfony\EventSubscriber\RequestSubscriber;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\HttpKernel\KernelEvents;

final class RequestSubscriberTest extends TestCase
{
    private RequestSubscriber $subscriber;

    protected function setUp(): void
    {
        BreadcrumbManager::clear();
        $this->subscriber = new RequestSubscriber();
    }

    protected function tearDown(): void
    {
        BreadcrumbManager::clear();
    }

    public function test_subscribed_events(): void
    {
        $events = RequestSubscriber::getSubscribedEvents();

        $this->assertArrayHasKey(KernelEvents::REQUEST, $events);
        $this->assertArrayHasKey(KernelEvents::RESPONSE, $events);
    }

    public function test_request_event_priority(): void
    {
        $events = RequestSubscriber::getSubscribedEvents();

        // Request should run early (high priority)
        $this->assertSame(['onRequest', 1000], $events[KernelEvents::REQUEST]);
    }

    public function test_response_event_priority(): void
    {
        $events = RequestSubscriber::getSubscribedEvents();

        // Response should run late (low priority)
        $this->assertSame(['onResponse', -1000], $events[KernelEvents::RESPONSE]);
    }

    public function test_on_request_adds_breadcrumb(): void
    {
        $request = Request::create('/api/users', 'GET');
        $event = $this->createRequestEvent($request);

        $this->subscriber->onRequest($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('navigation', $breadcrumbs[0]['type']);
        $this->assertSame('http.request', $breadcrumbs[0]['category']);
        $this->assertSame('GET /api/users', $breadcrumbs[0]['message']);
    }

    public function test_on_request_includes_method_and_url(): void
    {
        $request = Request::create('https://example.com/checkout', 'POST');
        $event = $this->createRequestEvent($request);

        $this->subscriber->onRequest($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('POST', $breadcrumbs[0]['data']['method']);
        $this->assertStringContainsString('/checkout', $breadcrumbs[0]['data']['url']);
    }

    public function test_on_request_includes_route_if_available(): void
    {
        $request = Request::create('/api/users', 'GET');
        $request->attributes->set('_route', 'api_users_list');
        $request->attributes->set('_controller', 'App\Controller\UserController::list');
        $event = $this->createRequestEvent($request);

        $this->subscriber->onRequest($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertSame('api_users_list', $breadcrumbs[0]['data']['route']);
        $this->assertSame('App\Controller\UserController::list', $breadcrumbs[0]['data']['controller']);
    }

    public function test_on_request_ignores_subrequests(): void
    {
        $request = Request::create('/api/users', 'GET');
        $event = $this->createRequestEvent($request, HttpKernelInterface::SUB_REQUEST);

        $this->subscriber->onRequest($event);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(0, $breadcrumbs);
    }

    public function test_on_response_adds_breadcrumb(): void
    {
        $request = Request::create('/api/users', 'GET');
        $response = new Response('', 200);

        // First trigger request to set start time
        $requestEvent = $this->createRequestEvent($request);
        $this->subscriber->onRequest($requestEvent);

        BreadcrumbManager::clear(); // Clear request breadcrumb for this test

        $responseEvent = $this->createResponseEvent($request, $response);
        $this->subscriber->onResponse($responseEvent);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(1, $breadcrumbs);
        $this->assertSame('http', $breadcrumbs[0]['type']);
        $this->assertSame('http.response', $breadcrumbs[0]['category']);
    }

    public function test_on_response_includes_status_code(): void
    {
        $request = Request::create('/api/users', 'POST');
        $response = new Response('', 201);

        $requestEvent = $this->createRequestEvent($request);
        $this->subscriber->onRequest($requestEvent);

        $responseEvent = $this->createResponseEvent($request, $response);
        $this->subscriber->onResponse($responseEvent);

        $breadcrumbs = BreadcrumbManager::getAll();
        $lastBreadcrumb = end($breadcrumbs);

        $this->assertSame(201, $lastBreadcrumb['data']['status_code']);
        $this->assertArrayHasKey('duration_ms', $lastBreadcrumb['data']);
    }

    public function test_on_response_info_level_for_2xx(): void
    {
        $request = Request::create('/api/users', 'GET');
        $response = new Response('', 200);

        $requestEvent = $this->createRequestEvent($request);
        $this->subscriber->onRequest($requestEvent);

        $responseEvent = $this->createResponseEvent($request, $response);
        $this->subscriber->onResponse($responseEvent);

        $breadcrumbs = BreadcrumbManager::getAll();
        $lastBreadcrumb = end($breadcrumbs);

        $this->assertSame('info', $lastBreadcrumb['level']);
    }

    public function test_on_response_warning_level_for_4xx(): void
    {
        $request = Request::create('/api/users/999', 'GET');
        $response = new Response('', 404);

        $requestEvent = $this->createRequestEvent($request);
        $this->subscriber->onRequest($requestEvent);

        $responseEvent = $this->createResponseEvent($request, $response);
        $this->subscriber->onResponse($responseEvent);

        $breadcrumbs = BreadcrumbManager::getAll();
        $lastBreadcrumb = end($breadcrumbs);

        $this->assertSame('warning', $lastBreadcrumb['level']);
    }

    public function test_on_response_error_level_for_5xx(): void
    {
        $request = Request::create('/api/users', 'POST');
        $response = new Response('', 500);

        $requestEvent = $this->createRequestEvent($request);
        $this->subscriber->onRequest($requestEvent);

        $responseEvent = $this->createResponseEvent($request, $response);
        $this->subscriber->onResponse($responseEvent);

        $breadcrumbs = BreadcrumbManager::getAll();
        $lastBreadcrumb = end($breadcrumbs);

        $this->assertSame('error', $lastBreadcrumb['level']);
    }

    public function test_on_response_ignores_subrequests(): void
    {
        $request = Request::create('/api/users', 'GET');
        $response = new Response('', 200);

        $responseEvent = $this->createResponseEvent($request, $response, HttpKernelInterface::SUB_REQUEST);
        $this->subscriber->onResponse($responseEvent);

        $breadcrumbs = BreadcrumbManager::getAll();
        $this->assertCount(0, $breadcrumbs);
    }

    public function test_response_message_format(): void
    {
        $request = Request::create('/checkout', 'POST');
        $response = new Response('', 302);

        $requestEvent = $this->createRequestEvent($request);
        $this->subscriber->onRequest($requestEvent);

        $responseEvent = $this->createResponseEvent($request, $response);
        $this->subscriber->onResponse($responseEvent);

        $breadcrumbs = BreadcrumbManager::getAll();
        $lastBreadcrumb = end($breadcrumbs);

        $this->assertSame('POST /checkout → 302', $lastBreadcrumb['message']);
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private function createRequestEvent(Request $request, int $requestType = HttpKernelInterface::MAIN_REQUEST): RequestEvent
    {
        $kernel = $this->createMock(HttpKernelInterface::class);

        return new RequestEvent($kernel, $request, $requestType);
    }

    private function createResponseEvent(
        Request $request,
        Response $response,
        int $requestType = HttpKernelInterface::MAIN_REQUEST
    ): ResponseEvent {
        $kernel = $this->createMock(HttpKernelInterface::class);

        return new ResponseEvent($kernel, $request, $requestType, $response);
    }
}
