<?php

return [
    'enabled' => true,
    'token' => env('ERROR_EXPLORER_TOKEN'),
    'endpoint' => env('ERROR_EXPLORER_ENDPOINT'),
    'environment' => env('ERROR_EXPLORER_ENVIRONMENT', 'production'),
    'release' => env('APP_VERSION', '1.0.0'),

    'capture' => [
        'exceptions' => true,
        'errors' => true,
        'fatal_errors' => true,
    ],

    'breadcrumbs' => [
        'max_breadcrumbs' => 50,
        'http_requests' => true,
        'logs' => true,
        'queries' => true,
    ],

    'context' => [
        'user' => true,
        'request' => true,
        'server' => true,
    ],

    'transport' => [
        'async' => true,
        'timeout' => 10,
        'retry' => 2,
    ],

    'security' => [
        'hmac_enabled' => env('ERROR_EXPLORER_HMAC_ENABLED', false),
        'hmac_secret' => env('ERROR_EXPLORER_HMAC_SECRET'),
        'hmac_algorithm' => 'sha256',
    ],

    'scrub_fields' => [
        'password',
        'password_confirmation',
        'token',
        'api_key',
    ],

    'ignore' => [
        'exceptions' => [
            \Illuminate\Auth\AuthenticationException::class,
            \Illuminate\Validation\ValidationException::class,
            \Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class,
        ],
        'routes' => [],
    ],

    'respect_dont_report' => true,
];
