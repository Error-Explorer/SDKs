<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel;

use ErrorExplorer\ErrorExplorer;
use ErrorExplorer\Laravel\Handlers\ErrorExplorerExceptionHandler;
use ErrorExplorer\Laravel\Logging\ErrorExplorerLogHandler;
use ErrorExplorer\Laravel\Middleware\ErrorExplorerMiddleware;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Log\LogManager;
use Illuminate\Support\ServiceProvider;

/**
 * Laravel Service Provider for Error Explorer.
 *
 * Provides automatic error tracking with:
 * - Exception capture via custom exception handler
 * - HTTP request/response breadcrumbs via middleware
 * - Log entry breadcrumbs via custom log channel
 * - Automatic user context detection
 */
class ErrorExplorerServiceProvider extends ServiceProvider
{
    /**
     * Register the service provider.
     */
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/error-explorer.php', 'error-explorer');

        // Only bind the singleton if enabled
        // This prevents any interaction with the SDK when disabled
        $this->app->singleton('error-explorer', function ($app) {
            /** @var bool */
            $enabled = config('error-explorer.enabled', true);
            if (!$enabled) {
                return null;
            }

            return ErrorExplorer::getInstance();
        });
    }

    /**
     * Bootstrap the service provider.
     */
    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/../config/error-explorer.php' => config_path('error-explorer.php'),
        ], 'error-explorer-config');

        if (!$this->isEnabled()) {
            return;
        }

        $this->initializeSdk();
        $this->registerExceptionHandler();
        $this->registerMiddleware();
        $this->registerLogChannel();
    }

    /**
     * Check if Error Explorer is enabled.
     */
    private function isEnabled(): bool
    {
        /** @var bool */
        return config('error-explorer.enabled', true);
    }

    /**
     * Initialize the SDK with configuration.
     */
    private function initializeSdk(): void
    {
        if (ErrorExplorer::isInitialized()) {
            return;
        }

        $options = $this->buildOptions();

        if (empty($options['token']) && empty($options['dsn'])) {
            return;
        }

        ErrorExplorer::init($options);
    }

    /**
     * Build SDK options from config.
     *
     * @return array<string, mixed>
     */
    private function buildOptions(): array
    {
        $options = [];

        // Token or DSN
        /** @var string|null */
        $dsn = config('error-explorer.dsn');
        /** @var string|null */
        $token = config('error-explorer.token');
        /** @var string|null */
        $endpoint = config('error-explorer.endpoint');

        if ($dsn !== null) {
            $options['dsn'] = $dsn;
        } elseif ($token !== null) {
            $options['token'] = $token;
        }

        if ($endpoint !== null) {
            $options['endpoint'] = $endpoint;
        }

        // Environment and release
        /** @var string */
        $options['environment'] = config('error-explorer.environment', config('app.env', 'production'));
        /** @var string|null */
        $release = config('error-explorer.release');
        if ($release !== null) {
            $options['release'] = $release;
        }

        // Capture options
        $options['capture'] = [
            'exceptions' => config('error-explorer.capture.exceptions', true),
            'errors' => config('error-explorer.capture.errors', true),
            'fatal_errors' => config('error-explorer.capture.fatal_errors', true),
        ];

        // Breadcrumb options
        $options['breadcrumbs'] = [
            'max_breadcrumbs' => config('error-explorer.breadcrumbs.max_breadcrumbs', 50),
        ];

        // Transport options
        $options['transport'] = [
            'async' => config('error-explorer.transport.async', true),
            'timeout' => config('error-explorer.transport.timeout', 3),
            'retry' => config('error-explorer.transport.retry', 2),
        ];

        // Security options (HMAC)
        /** @var bool */
        $hmacEnabled = config('error-explorer.security.hmac_enabled', false);
        if ($hmacEnabled) {
            $options['security'] = [
                'hmac_enabled' => true,
                'hmac_secret' => config('error-explorer.security.hmac_secret'),
                'hmac_algorithm' => config('error-explorer.security.hmac_algorithm', 'sha256'),
            ];
        }

        // Scrub fields
        /** @var string[] */
        $scrubFields = config('error-explorer.scrub_fields', []);
        if (!empty($scrubFields)) {
            $options['scrub_fields'] = $scrubFields;
        }

        return $options;
    }

    /**
     * Register the custom exception handler.
     */
    private function registerExceptionHandler(): void
    {
        /** @var bool */
        $captureExceptions = config('error-explorer.capture.exceptions', true);
        if (!$captureExceptions) {
            return;
        }

        $this->app->extend(ExceptionHandler::class, function (ExceptionHandler $handler, $app) {
            return new ErrorExplorerExceptionHandler($handler, $app);
        });
    }

    /**
     * Register the HTTP middleware.
     */
    private function registerMiddleware(): void
    {
        /** @var bool */
        $httpBreadcrumbs = config('error-explorer.breadcrumbs.http_requests', true);
        if (!$httpBreadcrumbs) {
            return;
        }

        /** @var Kernel $kernel */
        $kernel = $this->app->make(Kernel::class);

        if (method_exists($kernel, 'pushMiddleware')) {
            $kernel->pushMiddleware(ErrorExplorerMiddleware::class);
        }
    }

    /**
     * Register the custom log channel.
     */
    private function registerLogChannel(): void
    {
        /** @var bool */
        $logBreadcrumbs = config('error-explorer.breadcrumbs.logs', true);
        if (!$logBreadcrumbs) {
            return;
        }

        $this->app->extend('log', function (LogManager $logger) {
            $logger->extend('error-explorer', function ($app, array $config) {
                return new ErrorExplorerLogHandler(
                    $config['level'] ?? 'debug',
                    $config['bubble'] ?? true
                );
            });

            return $logger;
        });
    }

    /**
     * Get the services provided by the provider.
     *
     * @return string[]
     */
    public function provides(): array
    {
        return ['error-explorer'];
    }
}
