<?php

declare(strict_types=1);

namespace App\Controller;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\ErrorExplorer;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Demo controller to test Error Explorer Symfony Bundle.
 */
class DemoController extends AbstractController
{
    public function __construct(
        private readonly LoggerInterface $logger,
    ) {
    }

    #[Route('/', name: 'app_home')]
    public function index(): Response
    {
        $this->logger->info('Home page accessed');

        return $this->render('home.html.twig', [
            'sdk_initialized' => ErrorExplorer::isInitialized(),
            'breadcrumb_count' => BreadcrumbManager::count(),
        ]);
    }

    #[Route('/test/exception', name: 'app_test_exception')]
    public function testException(): Response
    {
        $this->logger->warning('About to throw test exception');

        throw new \RuntimeException('This is a test exception from the Symfony demo app!');
    }

    #[Route('/test/error', name: 'app_test_error')]
    public function testError(): Response
    {
        $this->logger->info('Triggering PHP warning');

        trigger_error('This is a test PHP warning', E_USER_WARNING);

        return new Response('PHP warning triggered. Check your logs.');
    }

    #[Route('/test/breadcrumbs', name: 'app_test_breadcrumbs')]
    public function testBreadcrumbs(): Response
    {
        // Add some log entries (these become breadcrumbs via Monolog handler)
        $this->logger->debug('Debug message');
        $this->logger->info('Info message', ['user_id' => 123]);
        $this->logger->warning('Warning message');

        // Add manual breadcrumbs
        BreadcrumbManager::addUserAction('Viewed breadcrumbs test page');
        BreadcrumbManager::addHttpRequest('GET', '/api/external', 200, 0.250);
        BreadcrumbManager::addQuery('SELECT * FROM products WHERE id = 1', 0.015);
        BreadcrumbManager::addCache('get', 'product.1', true);

        $breadcrumbs = BreadcrumbManager::getAll();

        return $this->render('breadcrumbs.html.twig', [
            'breadcrumbs' => $breadcrumbs,
        ]);
    }

    #[Route('/test/user-context', name: 'app_test_user_context')]
    public function testUserContext(): Response
    {
        // Set user context
        ErrorExplorer::setUser([
            'id' => 'user_symfony_123',
            'email' => 'symfony@example.com',
            'name' => 'Symfony Demo User',
            'plan' => 'enterprise',
        ]);

        // Set some tags
        ErrorExplorer::setTags([
            'feature' => 'user-context-test',
            'controller' => 'DemoController',
        ]);

        // Set extra data
        ErrorExplorer::setExtra([
            'session_start' => time(),
            'request_count' => 42,
        ]);

        $instance = ErrorExplorer::getInstance();

        return $this->render('user_context.html.twig', [
            'user' => $instance?->getUser() ?? [],
            'tags' => $instance?->getTags() ?? [],
            'extra' => $instance?->getExtra() ?? [],
        ]);
    }

    #[Route('/test/manual-capture', name: 'app_test_manual_capture')]
    public function testManualCapture(): Response
    {
        $this->logger->info('Testing manual capture');

        // Manual exception capture
        try {
            throw new \InvalidArgumentException('This exception is manually captured');
        } catch (\Throwable $e) {
            $exceptionEventId = ErrorExplorer::captureException($e, [
                'tags' => ['capture_type' => 'manual'],
                'extra' => ['test' => true],
            ]);
        }

        // Manual message capture
        $messageEventId = ErrorExplorer::captureMessage('This is a manually captured message', 'warning');

        return $this->render('manual_capture.html.twig', [
            'exception_event_id' => $exceptionEventId ?? null,
            'message_event_id' => $messageEventId ?? null,
        ]);
    }

    #[Route('/test/user-flow', name: 'app_test_user_flow')]
    public function testUserFlow(): Response
    {
        // Simulate a complex user flow with breadcrumbs
        $this->logger->info('Starting user flow simulation');

        BreadcrumbManager::addNavigation('/products', '/cart');
        BreadcrumbManager::addUserAction('Added product to cart', ['product_id' => 'SKU-001', 'quantity' => 2]);

        $this->logger->info('Product added to cart', ['product_id' => 'SKU-001']);

        BreadcrumbManager::addHttpRequest('GET', '/api/inventory/SKU-001', 200, 0.100);
        BreadcrumbManager::addQuery('UPDATE cart SET quantity = 2 WHERE product_id = ?', 0.005);

        BreadcrumbManager::addNavigation('/cart', '/checkout');
        BreadcrumbManager::addUserAction('Proceeded to checkout');

        $this->logger->info('User proceeded to checkout');

        BreadcrumbManager::addUserAction('Entered payment details');
        BreadcrumbManager::addHttpRequest('POST', '/api/payments/validate', 200, 0.500);

        return $this->render('user_flow.html.twig', [
            'breadcrumbs' => BreadcrumbManager::getAll(),
        ]);
    }

    #[Route('/test/subscriber-debug', name: 'app_test_subscriber_debug')]
    public function testSubscriberDebug(): Response
    {
        // Manually test the ExceptionSubscriber
        $subscriber = new \ErrorExplorer\Symfony\EventSubscriber\ExceptionSubscriber();

        return new Response(
            "<h1>ExceptionSubscriber Test</h1>" .
            "<p>Subscriber created successfully!</p>" .
            "<p>Check /tmp/error-explorer-debug.log for constructor log.</p>",
            200,
            ['Content-Type' => 'text/html']
        );
    }

    #[Route('/test/direct-capture', name: 'app_test_direct_capture')]
    public function testDirectCapture(): Response
    {
        // Direct test - manually capture an exception
        $this->logger->info('Testing direct capture');

        $testException = new \RuntimeException('Direct capture test at ' . date('Y-m-d H:i:s'));

        $eventId = ErrorExplorer::captureException($testException);

        // Force flush if async
        ErrorExplorer::flush(5);

        $initialized = ErrorExplorer::isInitialized();
        $instance = ErrorExplorer::getInstance();
        $endpoint = $instance?->getConfig()->getEndpoint() ?? 'N/A';

        return new Response(
            "<h1>Direct Capture Test</h1>" .
            "<p>SDK Initialized: " . ($initialized ? 'YES' : 'NO') . "</p>" .
            "<p>Endpoint: $endpoint</p>" .
            "<p>Event ID: " . ($eventId ?? 'NULL') . "</p>" .
            "<p>Check Error Explorer dashboard now!</p>",
            200,
            ['Content-Type' => 'text/html']
        );
    }

    #[Route('/test/checkout-error', name: 'app_test_checkout_error')]
    public function testCheckoutError(): Response
    {
        // Simulate a real checkout flow with error
        ErrorExplorer::setUser([
            'id' => 'user_checkout_456',
            'email' => 'customer@example.com',
            'name' => 'Test Customer',
        ]);

        ErrorExplorer::setTags([
            'flow' => 'checkout',
            'payment_method' => 'credit_card',
        ]);

        BreadcrumbManager::addUserAction('Started checkout');
        $this->logger->info('Checkout started', ['cart_total' => 149.99]);

        BreadcrumbManager::addUserAction('Entered shipping address');
        $this->logger->info('Shipping address validated');

        BreadcrumbManager::addUserAction('Entered payment details');
        BreadcrumbManager::addHttpRequest('POST', '/api/payments/process', 500, 2.500);

        $this->logger->error('Payment gateway error', ['gateway' => 'stripe', 'error_code' => 'timeout']);

        // Now throw the exception - all breadcrumbs will be included
        throw new \RuntimeException('Payment processing failed: Gateway timeout after 2.5s');
    }
}
