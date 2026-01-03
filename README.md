# Error Explorer SDKs

[![CI](https://github.com/Error-Explorer/sdks/actions/workflows/ci.yml/badge.svg)](https://github.com/Error-Explorer/sdks/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Official SDKs for [Error Explorer](https://error-explorer.com) - Automatic error tracking with zero configuration.

## Philosophy

All SDKs follow the same principle: **capture everything automatically**, with optional manual enrichment.

```php
// One line to start tracking errors
ErrorExplorer::init(['token' => 'your_token']);
```

## Available SDKs

### Core SDKs

| SDK | Package | Status | Tests |
|-----|---------|--------|-------|
| **PHP** | `error-explorer/php-sdk` | ✅ Available | 77 |
| **JavaScript (Browser)** | `@error-explorer/browser` | ✅ Available | 83 |
| **Node.js** | `@error-explorer/node` | ✅ Available | 120 |
| **Python** | `error-explorer` | ✅ Available | 138 |

### Framework SDKs

| SDK | Package | Status | Tests |
|-----|---------|--------|-------|
| **Symfony** | `error-explorer/symfony-sdk` | ✅ Available | 96 |
| **Laravel** | `error-explorer/laravel-sdk` | ✅ Available | 6 |
| **React** | `@error-explorer/react` | ✅ Available | 74 |
| **Vue** | `@error-explorer/vue` | ✅ Available | 63 |
| **Django** | `error-explorer-django` | ✅ Available | 33 |
| **Flask** | `error-explorer-flask` | ✅ Available | 27 |
| **FastAPI** | `error-explorer-fastapi` | ✅ Available | 26 |

## Quick Start

### PHP

```bash
composer require error-explorer/php-sdk
```

```php
use ErrorExplorer\ErrorExplorer;

ErrorExplorer::init(['token' => 'your_project_token']);
// All errors are now captured automatically
```

### Symfony

```bash
composer require error-explorer/symfony
```

```yaml
# config/packages/error_explorer.yaml
error_explorer:
    token: '%env(ERROR_EXPLORER_TOKEN)%'
```

## What's Captured Automatically

| Feature | PHP | Symfony | JS Browser | Node.js |
|---------|-----|---------|------------|---------|
| Exceptions | ✅ | ✅ | ✅ | ✅ |
| HTTP Requests | ✅ | ✅ | ✅ | ✅ |
| SQL Queries | - | ✅ (Doctrine) | - | ✅ |
| Logs | - | ✅ (Monolog) | ✅ | ✅ |
| User Context | ✅ | ✅ (Security) | ✅ | ✅ |
| Click Tracking | - | - | ✅ | - |
| Navigation | - | - | ✅ | - |

## Optional Enrichment

All SDKs support the same enrichment API:

```php
// Add breadcrumbs
ErrorExplorer::addBreadcrumb([
    'type' => 'user-action',
    'message' => 'User clicked checkout'
]);

// Set user context
ErrorExplorer::setUser([
    'id' => 'user_123',
    'email' => 'john@example.com'
]);

// Add tags for filtering
ErrorExplorer::setTags(['feature' => 'checkout']);

// Add extra data
ErrorExplorer::setExtra(['order_id' => 'order_789']);
```

## Directory Structure

```
error-explorer-sdks/
├── core/
│   ├── php/          # PHP SDK
│   ├── browser/      # Browser SDK
│   ├── node/         # Node.js SDK
│   └── python/       # Python SDK
├── frameworks/
│   ├── symfony/      # Symfony Bundle
│   ├── laravel/      # Laravel Package
│   ├── react/        # React SDK
│   ├── vue/          # Vue SDK
│   └── express/      # Express Middleware
└── shared/           # Shared types/utils
```

## Development

### Requirements

- PHP 8.1+ (for PHP SDKs)
- Node.js 18+ (for JS SDKs)
- Python 3.9+ (for Python SDKs)

### Testing

```bash
# PHP SDKs
cd core/php && composer test

# Symfony Bundle
cd frameworks/symfony && composer test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT - See [LICENSE](LICENSE) for details.
