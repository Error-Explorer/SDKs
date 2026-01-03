# Error Explorer Laravel SDK - Example Application

This example application demonstrates the Error Explorer Laravel SDK integration.

## Requirements

- PHP 8.1+
- Composer

## Installation

```bash
# Install dependencies
composer install

# Generate app key if not set
php artisan key:generate
```

## Configuration

The `.env` file is pre-configured with Error Explorer credentials. You can modify them if needed:

```env
ERROR_EXPLORER_TOKEN=your_project_token
ERROR_EXPLORER_ENDPOINT=https://your-error-explorer.com/api/v1/webhook
ERROR_EXPLORER_ENVIRONMENT=production
ERROR_EXPLORER_HMAC_ENABLED=true
ERROR_EXPLORER_HMAC_SECRET=your_hmac_secret
```

## Running the Application

```bash
# Start PHP built-in server
php artisan serve

# Or use PHP directly
php -S localhost:8000 -t public
```

Then open http://localhost:8000 in your browser.

## Test Scenarios

The application provides several test endpoints:

### Exception Tests

| Route | Description |
|-------|-------------|
| `/test/exception` | Throws a basic RuntimeException |
| `/test/breadcrumbs` | Throws exception with log breadcrumbs |
| `/test/user-context` | Throws exception with user context |
| `/test/php-error` | Triggers a PHP warning |

### Manual Capture Tests

| Route | Description |
|-------|-------------|
| `/test/manual-capture` | Catches and manually captures an exception |
| `/test/capture-message` | Captures a message without exception |

## SDK Features Demonstrated

### Automatic Capture

The SDK automatically captures:
- Unhandled exceptions
- PHP errors (warnings, notices)
- Fatal errors

### Breadcrumbs

Breadcrumbs are automatically collected from:
- HTTP requests/responses (via middleware)
- Log entries (via Monolog handler)

### Manual Enrichment

```php
use ErrorExplorer\Laravel\Facades\ErrorExplorer;

// Add breadcrumb
ErrorExplorer::addBreadcrumb([
    'type' => 'user-action',
    'message' => 'User clicked checkout',
    'data' => ['cartTotal' => 149.99]
]);

// Set user context
ErrorExplorer::setUser([
    'id' => 'user_123',
    'email' => 'user@example.com',
    'plan' => 'enterprise'
]);

// Set tags
ErrorExplorer::setTags([
    'feature' => 'checkout',
    'version' => '2.0'
]);

// Capture exception manually
try {
    $this->riskyOperation();
} catch (\Exception $e) {
    ErrorExplorer::captureException($e, [
        'tags' => ['caught' => 'manually'],
        'extra' => ['orderId' => '12345']
    ]);
}

// Capture message
ErrorExplorer::captureMessage('Something happened', 'warning');
```

## Configuration Options

See `config/error-explorer.php` for all available options:

- `capture.exceptions` - Enable exception capture
- `capture.errors` - Enable PHP error capture
- `breadcrumbs.max_breadcrumbs` - Maximum breadcrumbs to store
- `breadcrumbs.http_requests` - Enable HTTP breadcrumbs
- `breadcrumbs.logs` - Enable log breadcrumbs
- `security.hmac_enabled` - Enable HMAC request signing
- `scrub_fields` - Fields to mask in captured data
- `ignore.exceptions` - Exception classes to ignore
