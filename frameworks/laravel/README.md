# Error Explorer Laravel SDK

Official Laravel SDK for [Error Explorer](https://error-explorer.com) - Automatic error tracking with breadcrumbs.

## Requirements

- PHP 8.1+
- Laravel 10.x or 11.x

## Installation

```bash
composer require error-explorer/laravel
```

The service provider is automatically discovered. No manual registration needed.

## Configuration

### 1. Set your token

Add to your `.env` file:

```env
ERROR_EXPLORER_TOKEN=your_project_token
```

### 2. Publish config (optional)

```bash
php artisan vendor:publish --tag=error-explorer-config
```

## Usage

### Automatic Capture

The SDK automatically captures:
- **Exceptions** - All unhandled exceptions
- **HTTP Requests** - Request/response breadcrumbs
- **User Context** - Authenticated user info
- **Log Entries** - Via custom log channel (optional)

### Manual Enrichment

```php
use ErrorExplorer\Laravel\Facades\ErrorExplorer;

// Add custom breadcrumb
ErrorExplorer::addBreadcrumb([
    'type' => 'user-action',
    'message' => 'User clicked checkout',
    'data' => ['cartTotal' => 149.99]
]);

// Set user context (overrides auto-detected)
ErrorExplorer::setUser([
    'id' => 'user_123',
    'email' => 'john@example.com',
    'plan' => 'pro'
]);

// Add tags for filtering
ErrorExplorer::setTags([
    'feature' => 'checkout',
    'version' => '2.0'
]);

// Add extra context
ErrorExplorer::setExtra([
    'orderId' => 'order_789'
]);

// Capture exception manually
try {
    // risky operation
} catch (Exception $e) {
    ErrorExplorer::captureException($e);
}

// Capture message
ErrorExplorer::captureMessage('Something noteworthy happened', 'info');
```

### Log Channel Integration

Add the Error Explorer channel to your `config/logging.php`:

```php
'channels' => [
    'stack' => [
        'driver' => 'stack',
        'channels' => ['daily', 'error-explorer'],
    ],

    'error-explorer' => [
        'driver' => 'custom',
        'via' => \ErrorExplorer\Laravel\Logging\ErrorExplorerLogHandler::class,
        'level' => 'debug',
    ],
],
```

## Configuration Options

```php
// config/error-explorer.php

return [
    // Enable/disable the SDK
    'enabled' => env('ERROR_EXPLORER_ENABLED', true),

    // Authentication
    'token' => env('ERROR_EXPLORER_TOKEN'),
    'dsn' => env('ERROR_EXPLORER_DSN'),

    // Environment & Release
    'environment' => env('APP_ENV', 'production'),
    'release' => env('APP_VERSION'),

    // What to capture
    'capture' => [
        'exceptions' => true,
        'errors' => true,
        'fatal_errors' => true,
    ],

    // Breadcrumbs
    'breadcrumbs' => [
        'max_breadcrumbs' => 50,
        'http_requests' => true,
        'logs' => true,
        'queries' => true,
    ],

    // Context
    'context' => [
        'user' => true,
        'request' => true,
        'server' => true,
    ],

    // Transport
    'transport' => [
        'async' => true,
        'timeout' => 3,
        'retry' => 2,
    ],

    // Data scrubbing
    'scrub_fields' => [
        'password',
        'password_confirmation',
        'token',
        'api_key',
    ],

    // Ignored exceptions
    'ignore' => [
        'exceptions' => [
            \Illuminate\Auth\AuthenticationException::class,
            \Illuminate\Validation\ValidationException::class,
            // ...
        ],
    ],
];
```

## HMAC Authentication

For enhanced security:

```env
ERROR_EXPLORER_HMAC_ENABLED=true
ERROR_EXPLORER_HMAC_SECRET=your_hmac_secret
```

## Testing

```bash
composer test
```

## License

MIT License. See [LICENSE](../../LICENSE) for details.
