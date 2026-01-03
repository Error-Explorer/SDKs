#!/usr/bin/env php
<?php
/**
 * Test script to verify SDK connection to Error Explorer backend
 */

require_once dirname(__DIR__) . '/vendor/autoload.php';

use Symfony\Component\Dotenv\Dotenv;

// Load .env
$dotenv = new Dotenv();
$dotenv->load(dirname(__DIR__) . '/.env');

$token = $_ENV['ERROR_EXPLORER_TOKEN'] ?? '';
$endpoint = $_ENV['ERROR_EXPLORER_ENDPOINT'] ?? '';
$hmacSecret = $_ENV['ERROR_EXPLORER_HMAC_SECRET'] ?? '';

echo "=== Error Explorer SDK Connection Test ===\n\n";
echo "Endpoint: $endpoint\n";
echo "Token: " . substr($token, 0, 10) . "...\n";
echo "HMAC Secret: " . (empty($hmacSecret) ? "Not set" : substr($hmacSecret, 0, 10) . "...") . "\n\n";

// Build the full URL
$url = rtrim($endpoint, '/') . '/' . $token;
echo "Full URL: $url\n\n";

// Build test payload
$payload = json_encode([
    'event_id' => bin2hex(random_bytes(16)),
    'message' => 'Test connection from SDK test script',
    'exception_class' => 'TestException',
    'file' => '/test/connection.php',
    'line' => 42,
    'stack_trace' => 'Test stack trace',
    'severity' => 'info',
    'timestamp' => (new DateTimeImmutable())->format(DateTimeInterface::ATOM),
    'environment' => 'dev',
    'release' => 'test-connection',
    'user' => null,
    'request' => [
        'url' => 'cli://test-connection',
        'method' => 'CLI',
    ],
    'server' => [
        'php_version' => PHP_VERSION,
        'os' => PHP_OS,
    ],
    'breadcrumbs' => [],
    'tags' => ['test' => 'connection'],
    'extra' => ['source' => 'test-script'],
    'sdk' => [
        'name' => 'error-explorer/php-sdk',
        'version' => '1.0.0',
    ],
], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);

echo "Payload:\n" . json_encode(json_decode($payload), JSON_PRETTY_PRINT) . "\n\n";

// Build HMAC signature
$timestamp = time();
$signedPayload = $timestamp . '.' . $payload;
$signature = hash_hmac('sha256', $signedPayload, $hmacSecret);

echo "HMAC Signature Details:\n";
echo "  Timestamp: $timestamp\n";
echo "  Signed payload format: timestamp.payload\n";
echo "  Signature: $signature\n\n";

// Build headers
$headers = [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($payload),
    'User-Agent: error-explorer/php-sdk 1.0.0',
    'X-Webhook-Signature: ' . $signature,
    'X-Webhook-Timestamp: ' . $timestamp,
];

echo "Headers:\n";
foreach ($headers as $header) {
    echo "  $header\n";
}
echo "\n";

// Send request
echo "Sending request...\n";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_SSL_VERIFYPEER => false, // For localhost testing
    CURLOPT_SSL_VERIFYHOST => 0,     // For localhost testing
    CURLOPT_VERBOSE => true,
]);

// Capture verbose output
$verbose = fopen('php://temp', 'w+');
curl_setopt($ch, CURLOPT_STDERR, $verbose);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
$errno = curl_errno($ch);
curl_close($ch);

// Show verbose output
rewind($verbose);
$verboseLog = stream_get_contents($verbose);
fclose($verbose);

echo "\n=== cURL Debug ===\n";
echo $verboseLog;

echo "\n=== Response ===\n";
echo "HTTP Code: $httpCode\n";

if ($errno !== 0) {
    echo "cURL Error ($errno): $error\n";
} else {
    echo "Response body:\n$response\n";

    if ($httpCode >= 200 && $httpCode < 300) {
        echo "\n✅ SUCCESS! The SDK can communicate with Error Explorer.\n";
    } else {
        echo "\n❌ FAILED. Check the error message above.\n";
    }
}
