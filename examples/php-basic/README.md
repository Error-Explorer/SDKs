# Error Explorer PHP SDK - Basic Example

This is a basic PHP example demonstrating the Error Explorer SDK.

## Installation

```bash
cd examples/php-basic
composer install
```

## Running the Tests

### CLI Integration Tests

Run the comprehensive SDK test suite:

```bash
php bin/test-sdk.php
```

This will test:
- SDK initialization
- Breadcrumb management
- User context
- Tags and extra data
- Server context
- Data scrubbing
- HMAC signing
- Manual capture

### Web Demo

Start the built-in PHP server:

```bash
php -S localhost:8080 -t public
```

Then open http://localhost:8080 in your browser.

Available endpoints:
- `/` - Home page with SDK status
- `/breadcrumbs` - Test various breadcrumb types
- `/exception` - Trigger an uncaught exception
- `/error` - Trigger a PHP warning
- `/manual` - Manual exception and message capture
- `/user-action` - Simulate user action flow
- `/checkout-error` - Simulate error with breadcrumb trail

## Configuration

Set your Error Explorer token via environment variable:

```bash
export ERROR_EXPLORER_TOKEN=your_token_here
php bin/test-sdk.php
```

Or modify the initialization in `public/index.php`:

```php
ErrorExplorer::init([
    'token' => 'your_token_here',
    'environment' => 'production',
    'release' => 'v1.0.0',
]);
```

## HMAC Authentication

To enable HMAC signing:

```php
ErrorExplorer::init([
    'token' => 'your_token',
    'security' => [
        'hmac_enabled' => true,
        'hmac_secret' => 'your_secret_key',
        'hmac_algorithm' => 'sha256', // or sha384, sha512
    ],
]);
```
