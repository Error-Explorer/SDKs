<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Enable Error Explorer
    |--------------------------------------------------------------------------
    |
    | Set to false to completely disable Error Explorer.
    |
    */
    'enabled' => env('ERROR_EXPLORER_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    |
    | Your Error Explorer project token or DSN.
    | Get your token from https://error-explorer.com/projects
    |
    */
    'token' => env('ERROR_EXPLORER_TOKEN'),
    'dsn' => env('ERROR_EXPLORER_DSN'),
    'endpoint' => env('ERROR_EXPLORER_ENDPOINT'),

    /*
    |--------------------------------------------------------------------------
    | Environment & Release
    |--------------------------------------------------------------------------
    |
    | The environment name and release version for filtering in the dashboard.
    |
    */
    'environment' => env('ERROR_EXPLORER_ENVIRONMENT', env('APP_ENV', 'production')),
    'release' => env('ERROR_EXPLORER_RELEASE', env('APP_VERSION')),

    /*
    |--------------------------------------------------------------------------
    | Capture Settings
    |--------------------------------------------------------------------------
    |
    | Control what types of errors are captured.
    |
    */
    'capture' => [
        'exceptions' => true,      // Capture thrown exceptions
        'errors' => true,          // Capture PHP errors (E_WARNING, E_NOTICE, etc.)
        'fatal_errors' => true,    // Capture fatal errors via shutdown handler
    ],

    /*
    |--------------------------------------------------------------------------
    | Breadcrumbs
    |--------------------------------------------------------------------------
    |
    | Breadcrumbs are events that happened before an error.
    | They help you understand what led to the error.
    |
    */
    'breadcrumbs' => [
        'max_breadcrumbs' => 50,   // Maximum breadcrumbs to keep
        'http_requests' => true,   // Capture HTTP request/response
        'logs' => true,            // Capture log entries
        'queries' => true,         // Capture database queries (requires listener setup)
        'cache' => true,           // Capture cache operations
        'queue' => true,           // Capture queue jobs
    ],

    /*
    |--------------------------------------------------------------------------
    | Context
    |--------------------------------------------------------------------------
    |
    | Additional context captured automatically.
    |
    */
    'context' => [
        'user' => true,            // Capture authenticated user info
        'request' => true,         // Capture request data (URL, IP, headers)
        'server' => true,          // Capture server info (PHP version, OS, memory)
    ],

    /*
    |--------------------------------------------------------------------------
    | Transport
    |--------------------------------------------------------------------------
    |
    | How errors are sent to Error Explorer.
    |
    */
    'transport' => [
        'async' => true,           // Send errors asynchronously (non-blocking)
        'timeout' => 3,            // Request timeout in seconds
        'retry' => 2,              // Number of retry attempts
    ],

    /*
    |--------------------------------------------------------------------------
    | Security
    |--------------------------------------------------------------------------
    |
    | HMAC signature for webhook authentication.
    |
    */
    'security' => [
        'hmac_enabled' => env('ERROR_EXPLORER_HMAC_ENABLED', false),
        'hmac_secret' => env('ERROR_EXPLORER_HMAC_SECRET'),
        'hmac_algorithm' => 'sha256',
    ],

    /*
    |--------------------------------------------------------------------------
    | Data Scrubbing
    |--------------------------------------------------------------------------
    |
    | Fields that should be scrubbed from error reports.
    | Values of these fields will be replaced with [FILTERED].
    |
    */
    'scrub_fields' => [
        'password',
        'password_confirmation',
        'secret',
        'token',
        'api_key',
        'apikey',
        'access_token',
        'auth_token',
        'authorization',
        'credit_card',
        'card_number',
        'cvv',
        'ssn',
    ],

    /*
    |--------------------------------------------------------------------------
    | Ignore Settings
    |--------------------------------------------------------------------------
    |
    | Exceptions and routes to ignore.
    |
    */
    'ignore' => [
        // Exception classes to ignore
        'exceptions' => [
            \Illuminate\Auth\AuthenticationException::class,
            \Illuminate\Auth\Access\AuthorizationException::class,
            \Illuminate\Database\Eloquent\ModelNotFoundException::class,
            \Illuminate\Validation\ValidationException::class,
            \Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class,
            \Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException::class,
        ],

        // Route names to ignore for breadcrumbs
        'routes' => [
            // 'debugbar.assets.css',
            // 'debugbar.assets.js',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Respect Laravel's dontReport
    |--------------------------------------------------------------------------
    |
    | If true, exceptions in Laravel's $dontReport array won't be captured.
    |
    */
    'respect_dont_report' => true,
];
