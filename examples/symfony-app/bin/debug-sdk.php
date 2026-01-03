#!/usr/bin/env php
<?php
/**
 * Debug script to check SDK initialization
 */

require_once dirname(__DIR__) . '/vendor/autoload.php';

use Symfony\Component\Dotenv\Dotenv;
use ErrorExplorer\ErrorExplorer;

// Load .env
$dotenv = new Dotenv();
$dotenv->load(dirname(__DIR__) . '/.env');

echo "=== Error Explorer SDK Debug ===\n\n";

// Check env vars
$token = $_ENV['ERROR_EXPLORER_TOKEN'] ?? '';
$endpoint = $_ENV['ERROR_EXPLORER_ENDPOINT'] ?? '';
$hmacSecret = $_ENV['ERROR_EXPLORER_HMAC_SECRET'] ?? '';

echo "Environment Variables:\n";
echo "  ERROR_EXPLORER_TOKEN: " . (empty($token) ? "NOT SET" : substr($token, 0, 15) . "...") . "\n";
echo "  ERROR_EXPLORER_ENDPOINT: " . (empty($endpoint) ? "NOT SET" : $endpoint) . "\n";
echo "  ERROR_EXPLORER_HMAC_SECRET: " . (empty($hmacSecret) ? "NOT SET" : "SET (" . strlen($hmacSecret) . " chars)") . "\n\n";

// Check if ErrorExplorer is initialized
echo "SDK State Before Init:\n";
echo "  isInitialized: " . (ErrorExplorer::isInitialized() ? "YES" : "NO") . "\n";
echo "  getInstance: " . (ErrorExplorer::getInstance() === null ? "NULL" : "EXISTS") . "\n\n";

// Initialize SDK
echo "Initializing SDK...\n";
try {
    ErrorExplorer::init([
        'token' => $token,
        'endpoint' => $endpoint,
        'environment' => 'dev',
        'release' => 'debug-test',
        'security' => [
            'hmac_enabled' => true,
            'hmac_secret' => $hmacSecret,
            'hmac_algorithm' => 'sha256',
        ],
        'capture' => [
            'exceptions' => true,
            'errors' => true,
            'fatal_errors' => true,
        ],
        'transport' => [
            'async' => false, // Sync for testing
            'timeout' => 10,
            'retry' => 2,
        ],
    ]);
    echo "  ✅ SDK initialized successfully\n\n";
} catch (\Throwable $e) {
    echo "  ❌ SDK initialization failed: " . $e->getMessage() . "\n\n";
    exit(1);
}

// Check SDK state after init
echo "SDK State After Init:\n";
echo "  isInitialized: " . (ErrorExplorer::isInitialized() ? "YES" : "NO") . "\n";
$instance = ErrorExplorer::getInstance();
echo "  getInstance: " . ($instance === null ? "NULL" : "EXISTS") . "\n";

if ($instance !== null) {
    $config = $instance->getConfig();
    echo "  Config endpoint: " . $config->getEndpoint() . "\n";
    echo "  Config environment: " . $config->getEnvironment() . "\n";
    echo "  Config HMAC enabled: " . ($config->isHmacEnabled() ? "YES" : "NO") . "\n";
    echo "  Config async transport: " . ($config->isAsyncTransport() ? "YES" : "NO") . "\n";
}
echo "\n";

// Test capturing an exception
echo "Testing exception capture (sync mode)...\n";
try {
    $testException = new \RuntimeException("Debug test exception at " . date('Y-m-d H:i:s'));
    $eventId = ErrorExplorer::captureException($testException);

    if ($eventId !== null) {
        echo "  ✅ Exception captured! Event ID: $eventId\n";
    } else {
        echo "  ❌ Exception capture returned NULL\n";
    }
} catch (\Throwable $e) {
    echo "  ❌ Exception capture failed: " . $e->getMessage() . "\n";
    echo "  Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\nDone!\n";
