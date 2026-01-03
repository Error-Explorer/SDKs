# Error Explorer Symfony Bundle - Demo Application

This is a demo Symfony application showcasing the Error Explorer Bundle integration.

## Installation

```bash
cd examples/symfony-app
composer install
```

## Configuration

1. Copy and configure your environment:
```bash
cp .env .env.local
# Edit .env.local and set your ERROR_EXPLORER_TOKEN
```

2. The bundle is configured in `config/packages/error_explorer.yaml`

## Running the Application

Start the Symfony development server:

```bash
# Using Symfony CLI
symfony serve

# Or using PHP built-in server
php -S localhost:8000 -t public
```

Then open http://localhost:8000 in your browser.

## Demo Endpoints

| Endpoint | Description |
|----------|-------------|
| `/` | Home page with SDK status |
| `/test/breadcrumbs` | Test various breadcrumb types |
| `/test/user-context` | Test user context, tags, extra data |
| `/test/manual-capture` | Test manual exception/message capture |
| `/test/user-flow` | Simulate a complete user checkout flow |
| `/test/exception` | Trigger an uncaught exception |
| `/test/checkout-error` | Simulate checkout failure with full breadcrumb trail |

## Features Demonstrated

### Automatic Capture
- Uncaught exceptions via `ExceptionSubscriber`
- HTTP request/response breadcrumbs via `RequestSubscriber`
- Console command breadcrumbs via `ConsoleSubscriber`

### Monolog Integration
- Log entries are automatically converted to breadcrumbs
- Configure log levels in `config/packages/monolog.yaml`

### User Context
- Automatic user detection from Symfony Security (when available)
- Manual user context via `ErrorExplorer::setUser()`

### Breadcrumbs
- HTTP requests (automatic)
- Database queries (via Doctrine middleware)
- Log entries (via Monolog handler)
- Cache operations
- User actions (manual)
- Navigation (manual)

## Console Commands

Test error capture in CLI context:

```bash
# Run a command that fails
php bin/console app:failing-command

# Or trigger an error manually
php -r "require 'vendor/autoload.php'; \
  ErrorExplorer\ErrorExplorer::init(['token' => 'test']); \
  throw new RuntimeException('CLI test');"
```

## HMAC Authentication

To enable HMAC signing for secure webhook transmission:

1. Edit `config/packages/error_explorer.yaml`:
```yaml
error_explorer:
    security:
        hmac_enabled: true
        hmac_secret: '%env(ERROR_EXPLORER_HMAC_SECRET)%'
        hmac_algorithm: sha256
```

2. Set the secret in `.env.local`:
```
ERROR_EXPLORER_HMAC_SECRET=your_secret_key
```
