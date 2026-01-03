<?php

declare(strict_types=1);

/**
 * Error Explorer PHP SDK - Basic Example
 *
 * This file demonstrates basic SDK usage in a simple PHP application.
 * Run with: php -S localhost:8080 -t public
 */

require_once __DIR__ . '/../vendor/autoload.php';

use ErrorExplorer\ErrorExplorer;
use ErrorExplorer\Breadcrumbs\BreadcrumbManager;

// Initialize the SDK
ErrorExplorer::init([
    'token' => $_ENV['ERROR_EXPLORER_TOKEN'] ?? 'test_token_for_demo',
    'environment' => 'development',
    'release' => 'v1.0.0-demo',
    // Uncomment to enable HMAC
    // 'security' => [
    //     'hmac_enabled' => true,
    //     'hmac_secret' => 'your_secret_key',
    // ],
]);

// Set user context
ErrorExplorer::setUser([
    'id' => 'user_demo_123',
    'email' => 'demo@example.com',
    'name' => 'Demo User',
]);

// Set tags for filtering
ErrorExplorer::setTags([
    'demo' => 'true',
    'test_type' => 'manual',
]);

// Simple router
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Add navigation breadcrumb
BreadcrumbManager::addNavigation($_SERVER['HTTP_REFERER'] ?? '/', $path);

echo "<h1>Error Explorer PHP SDK Demo</h1>";
echo "<p>SDK Initialized: " . (ErrorExplorer::isInitialized() ? 'Yes' : 'No') . "</p>";
echo "<hr>";

echo "<h2>Test Endpoints:</h2>";
echo "<ul>";
echo "<li><a href='/'>Home (this page)</a></li>";
echo "<li><a href='/breadcrumbs'>Test Breadcrumbs</a></li>";
echo "<li><a href='/exception'>Trigger Exception</a></li>";
echo "<li><a href='/error'>Trigger PHP Error</a></li>";
echo "<li><a href='/manual'>Manual Capture</a></li>";
echo "<li><a href='/user-action'>Simulate User Actions</a></li>";
echo "</ul>";
echo "<hr>";

switch ($path) {
    case '/':
        echo "<p>Welcome! Click on the links above to test different SDK features.</p>";
        echo "<h3>Current Breadcrumbs:</h3>";
        echo "<pre>" . json_encode(BreadcrumbManager::getAll(), JSON_PRETTY_PRINT) . "</pre>";
        break;

    case '/breadcrumbs':
        // Add various types of breadcrumbs
        BreadcrumbManager::addHttpRequest('GET', '/api/users', 200, 0.150);
        BreadcrumbManager::addHttpRequest('POST', '/api/orders', 201, 0.350);
        BreadcrumbManager::addQuery('SELECT * FROM users WHERE id = 1', 0.025, 'default');
        BreadcrumbManager::addLog('info', 'User loaded from database', ['user_id' => 123]);
        BreadcrumbManager::addCache('get', 'user.123', true);
        BreadcrumbManager::addUserAction('Viewed product page', ['product_id' => 'SKU-001']);

        echo "<h2>Breadcrumbs Added!</h2>";
        echo "<p>Various breadcrumbs have been added to demonstrate tracking.</p>";
        echo "<h3>Current Breadcrumbs (" . BreadcrumbManager::count() . "):</h3>";
        echo "<pre>" . json_encode(BreadcrumbManager::getAll(), JSON_PRETTY_PRINT) . "</pre>";
        break;

    case '/exception':
        // This will be automatically captured by the SDK
        echo "<h2>Triggering Exception...</h2>";
        throw new RuntimeException('This is a test exception from the demo application!');

    case '/error':
        // This will trigger a PHP warning
        echo "<h2>Triggering PHP Error...</h2>";
        // Trigger a warning
        trigger_error('This is a test warning', E_USER_WARNING);
        echo "<p>A PHP warning was triggered. Check your error logs.</p>";
        break;

    case '/manual':
        // Manual exception capture
        echo "<h2>Manual Exception Capture</h2>";
        try {
            throw new InvalidArgumentException('This exception will be manually captured');
        } catch (Throwable $e) {
            $eventId = ErrorExplorer::captureException($e, [
                'tags' => ['capture_type' => 'manual'],
                'extra' => ['custom_data' => 'test_value'],
            ]);
            echo "<p>Exception captured manually!</p>";
            echo "<p>Event ID: <code>" . ($eventId ?? 'null') . "</code></p>";
        }

        // Manual message capture
        $messageId = ErrorExplorer::captureMessage('This is a test message', 'warning');
        echo "<p>Message captured!</p>";
        echo "<p>Message Event ID: <code>" . ($messageId ?? 'null') . "</code></p>";
        break;

    case '/user-action':
        echo "<h2>Simulating User Actions</h2>";

        // Simulate a user flow
        BreadcrumbManager::addUserAction('Visited homepage');
        usleep(100000); // 100ms
        BreadcrumbManager::addUserAction('Searched for products', ['query' => 'laptop']);
        usleep(50000); // 50ms
        BreadcrumbManager::addUserAction('Viewed product', ['product_id' => 'LAPTOP-001']);
        usleep(75000); // 75ms
        BreadcrumbManager::addUserAction('Added to cart', ['product_id' => 'LAPTOP-001', 'quantity' => 1]);
        usleep(100000); // 100ms
        BreadcrumbManager::addNavigation('/product/LAPTOP-001', '/cart');
        BreadcrumbManager::addUserAction('Proceeded to checkout');

        echo "<p>User flow simulated with breadcrumbs.</p>";
        echo "<h3>User Journey:</h3>";
        echo "<pre>" . json_encode(BreadcrumbManager::getAll(), JSON_PRETTY_PRINT) . "</pre>";

        // Now trigger an error at checkout
        echo "<p><a href='/checkout-error'>Simulate checkout error</a></p>";
        break;

    case '/checkout-error':
        // Add some breadcrumbs first
        BreadcrumbManager::addUserAction('Entered payment details');
        BreadcrumbManager::addHttpRequest('POST', '/api/payments', 500, 2.5);
        BreadcrumbManager::addLog('error', 'Payment gateway timeout', ['gateway' => 'stripe']);

        // Now throw exception - breadcrumbs will be included
        throw new RuntimeException('Payment processing failed: Gateway timeout');

    default:
        http_response_code(404);
        echo "<h2>404 Not Found</h2>";
        echo "<p>Page not found. <a href='/'>Go back home</a></p>";
}
