#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Error Explorer PHP SDK - CLI Test Script
 *
 * Run with: php bin/test-sdk.php
 */

require_once __DIR__ . '/../vendor/autoload.php';

use ErrorExplorer\ErrorExplorer;
use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\Context\ServerContext;
use ErrorExplorer\Context\UserContext;
use ErrorExplorer\Security\DataScrubber;
use ErrorExplorer\Security\HmacSigner;

echo "╔══════════════════════════════════════════════════════════════╗\n";
echo "║       Error Explorer PHP SDK - Integration Tests            ║\n";
echo "╚══════════════════════════════════════════════════════════════╝\n\n";

$passed = 0;
$failed = 0;

function test(string $name, callable $fn): void
{
    global $passed, $failed;
    echo "Testing: $name... ";
    try {
        $fn();
        echo "\033[32m✓ PASSED\033[0m\n";
        $passed++;
    } catch (Throwable $e) {
        echo "\033[31m✗ FAILED\033[0m\n";
        echo "  Error: " . $e->getMessage() . "\n";
        $failed++;
    }
}

function assert_true(bool $condition, string $message = ''): void
{
    if (!$condition) {
        throw new RuntimeException($message ?: 'Assertion failed: expected true');
    }
}

function assert_equals($expected, $actual, string $message = ''): void
{
    if ($expected !== $actual) {
        throw new RuntimeException(
            $message ?: sprintf('Assertion failed: expected %s, got %s', var_export($expected, true), var_export($actual, true))
        );
    }
}

// ============================================================================
// Test 1: SDK Initialization
// ============================================================================
echo "\n--- SDK Initialization ---\n";

test('SDK initializes correctly', function () {
    assert_true(!ErrorExplorer::isInitialized(), 'SDK should not be initialized yet');

    ErrorExplorer::init([
        'token' => 'test_token_cli',
        'environment' => 'testing',
        'release' => 'v1.0.0-test',
    ]);

    assert_true(ErrorExplorer::isInitialized(), 'SDK should be initialized');
});

test('SDK getInstance returns instance', function () {
    $instance = ErrorExplorer::getInstance();
    assert_true($instance !== null, 'getInstance should return an instance');
});

// ============================================================================
// Test 2: Breadcrumb Management
// ============================================================================
echo "\n--- Breadcrumb Management ---\n";

test('Add custom breadcrumb', function () {
    BreadcrumbManager::clear();
    BreadcrumbManager::add([
        'type' => 'test',
        'message' => 'Test breadcrumb',
        'level' => 'info',
    ]);
    assert_equals(1, BreadcrumbManager::count());
});

test('Add HTTP request breadcrumb', function () {
    BreadcrumbManager::clear();
    BreadcrumbManager::addHttpRequest('POST', '/api/users', 201, 0.150);
    $breadcrumbs = BreadcrumbManager::getAll();
    assert_equals('http', $breadcrumbs[0]['type']);
    assert_equals(201, $breadcrumbs[0]['data']['status_code']);
});

test('Add query breadcrumb', function () {
    BreadcrumbManager::clear();
    BreadcrumbManager::addQuery('SELECT * FROM users', 0.025, 'default');
    $breadcrumbs = BreadcrumbManager::getAll();
    assert_equals('query', $breadcrumbs[0]['type']);
    assert_true(str_contains($breadcrumbs[0]['data']['sql'], 'SELECT'));
});

test('Add log breadcrumb', function () {
    BreadcrumbManager::clear();
    BreadcrumbManager::addLog('warning', 'Test warning', ['key' => 'value']);
    $breadcrumbs = BreadcrumbManager::getAll();
    assert_equals('log', $breadcrumbs[0]['type']);
    assert_equals('warning', $breadcrumbs[0]['level']);
});

test('Breadcrumb FIFO (max limit)', function () {
    BreadcrumbManager::clear();
    BreadcrumbManager::setMaxBreadcrumbs(5);
    for ($i = 1; $i <= 10; $i++) {
        BreadcrumbManager::add(['message' => "Breadcrumb $i"]);
    }
    $breadcrumbs = BreadcrumbManager::getAll();
    assert_equals(5, count($breadcrumbs));
    assert_equals('Breadcrumb 6', $breadcrumbs[0]['message']); // First kept
    assert_equals('Breadcrumb 10', $breadcrumbs[4]['message']); // Last added
    BreadcrumbManager::setMaxBreadcrumbs(50); // Reset
});

// ============================================================================
// Test 3: User Context
// ============================================================================
echo "\n--- User Context ---\n";

test('Set user context', function () {
    ErrorExplorer::setUser([
        'id' => 'user_123',
        'email' => 'test@example.com',
        'name' => 'Test User',
    ]);
    $instance = ErrorExplorer::getInstance();
    $user = $instance->getUser();
    assert_equals('user_123', $user['id']);
    assert_equals('test@example.com', $user['email']);
});

test('Clear user context', function () {
    ErrorExplorer::setUser(['id' => '123']);
    ErrorExplorer::clearUser();
    $instance = ErrorExplorer::getInstance();
    assert_true(empty($instance->getUser()));
});

test('UserContext static methods', function () {
    UserContext::clear();
    assert_true(!UserContext::isSet());
    UserContext::setId('user_456');
    UserContext::setEmail('john@example.com');
    assert_true(UserContext::isSet());
    $user = UserContext::get();
    assert_equals('user_456', $user['id']);
    assert_equals('john@example.com', $user['email']);
    UserContext::clear();
});

// ============================================================================
// Test 4: Tags and Extra
// ============================================================================
echo "\n--- Tags and Extra ---\n";

test('Set tags', function () {
    ErrorExplorer::setTags(['env' => 'test', 'feature' => 'checkout']);
    $instance = ErrorExplorer::getInstance();
    $tags = $instance->getTags();
    assert_equals('test', $tags['env']);
    assert_equals('checkout', $tags['feature']);
});

test('Set single tag', function () {
    ErrorExplorer::setTag('version', '2.0');
    $instance = ErrorExplorer::getInstance();
    $tags = $instance->getTags();
    assert_equals('2.0', $tags['version']);
});

test('Set extra data', function () {
    ErrorExplorer::setExtra(['order_id' => 'ORD-123', 'amount' => 99.99]);
    $instance = ErrorExplorer::getInstance();
    $extra = $instance->getExtra();
    assert_equals('ORD-123', $extra['order_id']);
    assert_equals(99.99, $extra['amount']);
});

// ============================================================================
// Test 5: Server Context
// ============================================================================
echo "\n--- Server Context ---\n";

test('Collect server context', function () {
    $context = ServerContext::collect();
    assert_true(isset($context['php_version']));
    assert_true(isset($context['php_sapi']));
    assert_true(isset($context['os']));
    assert_true(isset($context['extensions']));
    assert_equals(PHP_VERSION, $context['php_version']);
});

// ============================================================================
// Test 6: Data Scrubber
// ============================================================================
echo "\n--- Data Scrubber ---\n";

test('Scrub password fields', function () {
    $scrubber = new DataScrubber(['password']);
    $data = $scrubber->scrub([
        'username' => 'john',
        'password' => 'secret123',
    ]);
    assert_equals('john', $data['username']);
    assert_equals('[Filtered]', $data['password']);
});

test('Scrub nested fields', function () {
    $scrubber = new DataScrubber(['token']);
    $data = $scrubber->scrub([
        'user' => [
            'name' => 'John',
            'auth_token' => 'abc123',
        ],
    ]);
    assert_equals('John', $data['user']['name']);
    assert_equals('[Filtered]', $data['user']['auth_token']);
});

test('Scrub credit card pattern', function () {
    $scrubber = new DataScrubber([]);
    $data = $scrubber->scrub([
        'message' => 'Card 4111-1111-1111-1111 used',
    ]);
    assert_true(str_contains($data['message'], '[Filtered]'));
    assert_true(!str_contains($data['message'], '4111'));
});

test('Scrub Bearer token', function () {
    $scrubber = new DataScrubber([]);
    $data = $scrubber->scrub([
        'header' => 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ0ZXN0IjoidmFsdWUifQ.signature',
    ]);
    assert_true(str_contains($data['header'], 'Bearer [Filtered]'));
});

// ============================================================================
// Test 7: HMAC Signer
// ============================================================================
echo "\n--- HMAC Signer ---\n";

test('Sign payload with SHA256', function () {
    $signer = new HmacSigner('my_secret', 'sha256');
    $signature = $signer->sign('{"test":true}');
    assert_equals(64, strlen($signature)); // SHA256 = 64 hex chars
});

test('Verify valid signature', function () {
    $signer = new HmacSigner('my_secret', 'sha256');
    $payload = '{"message":"hello"}';
    $signature = $signer->sign($payload);
    assert_true($signer->verify($payload, $signature));
});

test('Reject invalid signature', function () {
    $signer = new HmacSigner('my_secret', 'sha256');
    $payload = '{"message":"hello"}';
    assert_true(!$signer->verify($payload, 'invalid_signature'));
});

test('Reject tampered payload', function () {
    $signer = new HmacSigner('my_secret', 'sha256');
    $signature = $signer->sign('{"amount":100}');
    assert_true(!$signer->verify('{"amount":1000}', $signature));
});

test('Build headers', function () {
    $signer = new HmacSigner('secret', 'sha256');
    $headers = $signer->buildHeaders('{"test":true}');
    assert_true(isset($headers['X-Error-Explorer-Signature']));
    assert_true(isset($headers['X-Error-Explorer-Signature-Algorithm']));
    assert_equals('sha256', $headers['X-Error-Explorer-Signature-Algorithm']);
});

// ============================================================================
// Test 8: Manual Capture
// ============================================================================
echo "\n--- Manual Capture ---\n";

test('Capture exception manually', function () {
    BreadcrumbManager::clear();
    BreadcrumbManager::add(['type' => 'test', 'message' => 'Before error']);

    $eventId = ErrorExplorer::captureException(
        new RuntimeException('Test exception'),
        ['extra' => ['test_run' => true]]
    );

    assert_true($eventId !== null);
    assert_equals(32, strlen($eventId)); // UUID hex = 32 chars
});

test('Capture message', function () {
    $eventId = ErrorExplorer::captureMessage('Test info message', 'info');
    assert_true($eventId !== null);
});

// ============================================================================
// Summary
// ============================================================================
echo "\n";
echo "══════════════════════════════════════════════════════════════\n";
echo "                      TEST SUMMARY\n";
echo "══════════════════════════════════════════════════════════════\n";
echo "\033[32mPassed: $passed\033[0m\n";
echo "\033[31mFailed: $failed\033[0m\n";
echo "Total:  " . ($passed + $failed) . "\n";
echo "══════════════════════════════════════════════════════════════\n";

// Clean up
ErrorExplorer::close();

exit($failed > 0 ? 1 : 0);
