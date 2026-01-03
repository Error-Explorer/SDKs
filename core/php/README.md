# Error Explorer PHP SDK

Automatic error tracking for PHP applications with zero configuration.

## Installation

```bash
composer require error-explorer/php-sdk
```

## Quick Start

```php
<?php

use ErrorExplorer\ErrorExplorer;

// Initialize with your project token - that's it!
ErrorExplorer::init([
    'token' => 'your_project_token',
]);

// All errors are now captured automatically
```

## What's Captured Automatically

| Type | How |
|------|-----|
| **Exceptions** | `set_exception_handler` |
| **Errors** | `set_error_handler` (warnings, notices become breadcrumbs) |
| **Fatal Errors** | `register_shutdown_function` |
| **Request Context** | URL, IP, headers, user-agent |
| **Server Context** | PHP version, OS, memory usage |

## Optional Enrichment

You can optionally enrich error reports with additional context:

### Add Breadcrumbs

Track the user journey leading to an error:

```php
ErrorExplorer::addBreadcrumb([
    'type' => 'user-action',
    'message' => 'User clicked checkout',
    'data' => ['cart_total' => 149.99]
]);
```

### Set User Context

Identify the affected user:

```php
ErrorExplorer::setUser([
    'id' => 'user_123',
    'email' => 'john@example.com',
    'name' => 'John Doe',
    'plan' => 'pro'
]);
```

### Add Tags

Filter errors in the dashboard:

```php
ErrorExplorer::setTags([
    'feature' => 'checkout',
    'version' => 'v2.1.0'
]);
```

### Add Extra Data

Include additional context:

```php
ErrorExplorer::setExtra([
    'order_id' => 'order_789',
    'items_count' => 3
]);
```

### Manual Capture

Capture exceptions or messages manually:

```php
try {
    // risky operation
} catch (Exception $e) {
    ErrorExplorer::captureException($e, [
        'tags' => ['critical' => 'true'],
        'extra' => ['retry_count' => 3]
    ]);
}

// Or capture a message
ErrorExplorer::captureMessage('Payment processing started', 'info');
```

## Configuration Options

```php
ErrorExplorer::init([
    // Required
    'token' => 'your_project_token',

    // Or use DSN format
    // 'dsn' => 'https://token@api.error-explorer.com/api/v1/webhook',

    // Environment (auto-detected from APP_ENV if not set)
    'environment' => 'production',

    // Release version
    'release' => 'v1.2.3',

    // Capture options (all true by default)
    'capture' => [
        'exceptions' => true,
        'errors' => true,
        'fatal_errors' => true,
    ],

    // Breadcrumb options
    'breadcrumbs' => [
        'max_breadcrumbs' => 50,
    ],

    // Transport options
    'transport' => [
        'async' => true,      // Send after request completes
        'timeout' => 3,       // HTTP timeout in seconds
        'retry' => 2,         // Number of retries
    ],

    // Additional fields to scrub (passwords, tokens already included)
    'scrub_fields' => [
        'custom_secret',
        'api_token',
    ],
]);
```

## Async Sending

By default, errors are sent asynchronously after the response is sent to the user (using `fastcgi_finish_request` for PHP-FPM or `register_shutdown_function`). This ensures no impact on response time.

To disable async mode:

```php
ErrorExplorer::init([
    'token' => 'xxx',
    'transport' => ['async' => false],
]);
```

## Long-Running Processes

For workers or daemons, flush events manually:

```php
// In your worker loop
while ($job = getNextJob()) {
    try {
        processJob($job);
    } catch (Exception $e) {
        ErrorExplorer::captureException($e);
        ErrorExplorer::flush(); // Send immediately
    }
}

// At the end
ErrorExplorer::close();
```

## Framework Integration

For framework-specific features (automatic user detection, route info, etc.), use the dedicated packages:

- **Symfony**: `composer require error-explorer/symfony`
- **Laravel**: `composer require error-explorer/laravel`

## Requirements

- PHP 8.1+
- ext-curl
- ext-json

## License

MIT
