<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Error Explorer middleware is automatically registered via ServiceProvider
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Error Explorer exception handler is automatically registered via ServiceProvider
    })
    ->create();
