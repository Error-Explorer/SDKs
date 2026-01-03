# Error Explorer Symfony Bundle

Automatic error tracking for Symfony applications with zero configuration.

## Installation

```bash
composer require error-explorer/symfony
```

## Quick Start

Add your token to your environment:

```bash
# .env
ERROR_EXPLORER_TOKEN=your_project_token
```

Create the configuration file:

```yaml
# config/packages/error_explorer.yaml
error_explorer:
    token: '%env(ERROR_EXPLORER_TOKEN)%'
```

**That's it!** All exceptions are now captured automatically.

## What's Captured Automatically

| Type | How |
|------|-----|
| **Exceptions** | `kernel.exception` event |
| **HTTP Requests** | `kernel.request` / `kernel.response` |
| **SQL Queries** | Doctrine middleware |
| **Logs** | Monolog handler |
| **Console Commands** | Console events |
| **Messenger** | Message handled/failed events |
| **User Context** | Auto-detected from Security component |

## Full Configuration

```yaml
# config/packages/error_explorer.yaml
error_explorer:
    # Required: Your project token
    token: '%env(ERROR_EXPLORER_TOKEN)%'

    # Or use DSN format instead
    # dsn: 'https://token@api.error-explorer.com/api/v1/webhook'

    # Environment (defaults to kernel.environment)
    environment: '%kernel.environment%'

    # Release version (optional)
    release: '%env(APP_VERSION)%'

    # Capture options (all enabled by default)
    capture:
        exceptions: true
        errors: true           # PHP warnings, notices
        fatal_errors: true     # Fatal errors via shutdown

    # Breadcrumb options
    breadcrumbs:
        max_breadcrumbs: 50
        http_requests: true    # kernel.request/response
        doctrine: true         # SQL queries
        monolog: true          # Log entries
        console: true          # Console commands
        messenger: true        # Messenger messages

    # Context options
    context:
        user: true             # Auto-detect from Security
        request: true          # URL, IP, headers
        server: true           # PHP version, memory

    # Transport options
    transport:
        async: true            # Send after response
        timeout: 3             # HTTP timeout
        retry: 2               # Retry count

    # Additional fields to scrub
    scrub_fields:
        - custom_secret
        - my_api_key

    # Exception listener priority (lower = runs later)
    listener_priority: -1024
```

## Optional Enrichment

### Add Custom Breadcrumbs

```php
use ErrorExplorer\ErrorExplorer;

class CheckoutController
{
    public function checkout(): Response
    {
        ErrorExplorer::addBreadcrumb([
            'type' => 'user-action',
            'message' => 'User started checkout',
            'data' => ['cart_items' => 5]
        ]);

        // ... checkout logic
    }
}
```

### Override User Context

```php
// The bundle auto-detects user from Security, but you can override:
ErrorExplorer::setUser([
    'id' => $user->getId(),
    'email' => $user->getEmail(),
    'plan' => $user->getSubscription()->getPlan(),
]);
```

### Add Tags and Extra Data

```php
ErrorExplorer::setTags([
    'feature' => 'checkout',
    'ab_test' => 'new-flow'
]);

ErrorExplorer::setExtra([
    'order_id' => $order->getId(),
    'total' => $order->getTotal()
]);
```

### Manual Exception Capture

```php
try {
    $paymentService->process($order);
} catch (PaymentException $e) {
    ErrorExplorer::captureException($e, [
        'tags' => ['payment' => 'failed'],
        'extra' => ['order_id' => $order->getId()]
    ]);

    throw $e; // Re-throw to let Symfony handle it
}
```

## Console Commands

Errors in console commands are automatically captured. The bundle also clears breadcrumbs between commands to avoid mixing context.

## Messenger Workers

For long-running Messenger workers, the bundle:
- Tracks message received/handled/failed as breadcrumbs
- Captures exceptions on failure (if not retrying)
- Clears breadcrumbs after each successful message

## Monolog Integration

The bundle registers a Monolog handler that records all log entries as breadcrumbs. When an error occurs, you'll see the full log trail in Error Explorer.

To customize the handler:

```yaml
# config/packages/monolog.yaml
monolog:
    handlers:
        error_explorer:
            type: service
            id: error_explorer.monolog_handler
            level: debug  # Capture all levels
```

## Requirements

- PHP 8.1+
- Symfony 6.0+ or 7.0+
- error-explorer/php-sdk ^1.0

## Optional Dependencies

- `symfony/security-bundle`: For automatic user detection
- `doctrine/dbal`: For SQL query breadcrumbs
- `monolog/monolog`: For log breadcrumbs

## License

MIT
