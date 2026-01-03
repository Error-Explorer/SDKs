<?php
// Clear OPcache from web context
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "OPcache reset!\n";
}

// Invalidate specific SDK files
$sdkFiles = [
    dirname(__DIR__, 3) . '/frameworks/symfony/src/EventSubscriber/ExceptionSubscriber.php',
    dirname(__DIR__, 3) . '/core/php/src/ErrorExplorer.php',
    dirname(__DIR__, 3) . '/core/php/src/Transport/HttpTransport.php',
];

foreach ($sdkFiles as $file) {
    if (file_exists($file) && function_exists('opcache_invalidate')) {
        opcache_invalidate($file, true);
        echo "Invalidated: $file\n";
    }
}

// Also clear Symfony cache
$cacheDir = dirname(__DIR__) . '/var/cache';
if (is_dir($cacheDir)) {
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($cacheDir, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($files as $file) {
        if ($file->isDir()) {
            @rmdir($file->getRealPath());
        } else {
            @unlink($file->getRealPath());
        }
    }
    echo "Symfony cache cleared!\n";
}

echo "\nDone. PLEASE RESTART YOUR PHP SERVER (Ctrl+C and restart).\n";
echo "The PHP built-in server caches classes in memory.\n";
