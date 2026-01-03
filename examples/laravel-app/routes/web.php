<?php

use App\Http\Controllers\TestController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

Route::get('/', [TestController::class, 'index'])->name('home');

// Test routes for Error Explorer SDK
Route::prefix('test')->name('test.')->group(function () {
    // Basic exception test
    Route::get('/exception', [TestController::class, 'exception'])->name('exception');

    // Exception with breadcrumbs
    Route::get('/breadcrumbs', [TestController::class, 'breadcrumbs'])->name('breadcrumbs');

    // Exception with user context
    Route::get('/user-context', [TestController::class, 'userContext'])->name('user-context');

    // Manual exception capture
    Route::get('/manual-capture', [TestController::class, 'manualCapture'])->name('manual-capture');

    // Capture message (not exception)
    Route::get('/capture-message', [TestController::class, 'captureMessage'])->name('capture-message');

    // PHP error (warning)
    Route::get('/php-error', [TestController::class, 'phpError'])->name('php-error');
});
