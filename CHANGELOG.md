# Changelog

All notable changes to Error Explorer SDKs will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-28

### Added

#### PHP SDK (`error-explorer/php-sdk`)
- Initial release
- Automatic exception capture via `set_exception_handler`
- Automatic error capture via `set_error_handler`
- Fatal error capture via `register_shutdown_function`
- Breadcrumb management with FIFO queue (max 50)
- User, request, and server context collection
- HMAC signature support for secure transmission
- Data scrubbing for sensitive fields (passwords, tokens, etc.)
- Async transport with `register_shutdown_function` + `fastcgi_finish_request()`
- Retry with exponential backoff
- DSN and token-based configuration

#### Symfony Bundle (`error-explorer/symfony-bundle`)
- Auto-configuration via Symfony Flex
- Exception capture via `ExceptionSubscriber`
- HTTP request/response breadcrumbs via `RequestSubscriber`
- Console command breadcrumbs via `ConsoleSubscriber`
- Messenger message breadcrumbs via `MessengerSubscriber`
- Doctrine query breadcrumbs via `DoctrineQueryLogger`
- Monolog integration via `ErrorExplorerHandler` with PSR-3 message interpolation
- YAML configuration with full customization
- Environment-based capture settings
- Ignored routes support (`_wdt`, `_profiler`, etc.)

### Security
- HMAC-SHA256 signature with timestamp for webhook authentication
- Automatic scrubbing of sensitive data
- XSS prevention (scripts removed, HTML encoding at display time)

---

## [Unreleased]

### Planned
- Laravel SDK (`error-explorer/laravel`)
- Browser SDK (`@error-explorer/browser`)
- Node.js SDK (`@error-explorer/node`)
- React integration (`@error-explorer/react`)
- Vue integration (`@error-explorer/vue`)
