<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel\Tests;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use ErrorExplorer\ErrorExplorer;
use ErrorExplorer\Laravel\ErrorExplorerServiceProvider;
use Orchestra\Testbench\TestCase as OrchestraTestCase;

abstract class TestCase extends OrchestraTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        BreadcrumbManager::clear();
    }

    protected function tearDown(): void
    {
        BreadcrumbManager::clear();

        // Close ErrorExplorer to reset state
        if (ErrorExplorer::isInitialized()) {
            ErrorExplorer::close();
        }

        parent::tearDown();
    }

    /**
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            ErrorExplorerServiceProvider::class,
        ];
    }

    /**
     * @return array<string, class-string>
     */
    protected function getPackageAliases($app): array
    {
        return [
            'ErrorExplorer' => \ErrorExplorer\Laravel\Facades\ErrorExplorer::class,
        ];
    }

    /**
     * @param \Illuminate\Foundation\Application $app
     */
    protected function defineEnvironment($app): void
    {
        // Default test configuration - disable capture to avoid handler conflicts
        $app['config']->set('error-explorer.enabled', true);
        $app['config']->set('error-explorer.token', 'test_token_123');
        $app['config']->set('error-explorer.environment', 'testing');
        $app['config']->set('error-explorer.capture.exceptions', false);
        $app['config']->set('error-explorer.capture.errors', false);
        $app['config']->set('error-explorer.capture.fatal_errors', false);
    }
}
