<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel\Tests\Unit;

use ErrorExplorer\ErrorExplorer;
use ErrorExplorer\Laravel\ErrorExplorerServiceProvider;
use ErrorExplorer\Laravel\Tests\TestCase;

final class ServiceProviderTest extends TestCase
{
    public function test_service_provider_is_registered(): void
    {
        $this->assertTrue(
            $this->app->providerIsLoaded(ErrorExplorerServiceProvider::class)
        );
    }

    public function test_error_explorer_is_bound_in_container(): void
    {
        $this->assertTrue($this->app->bound('error-explorer'));
    }

    public function test_config_is_merged(): void
    {
        $this->assertNotNull(config('error-explorer'));
        $this->assertTrue(config('error-explorer.enabled'));
    }

    public function test_sdk_is_initialized_with_token(): void
    {
        $this->assertTrue(ErrorExplorer::isInitialized());
    }

    public function test_provides_returns_error_explorer(): void
    {
        $provider = new ErrorExplorerServiceProvider($this->app);

        $this->assertContains('error-explorer', $provider->provides());
    }

    public function test_config_can_be_published(): void
    {
        $this->artisan('vendor:publish', [
            '--provider' => ErrorExplorerServiceProvider::class,
            '--tag' => 'error-explorer-config',
        ])->assertSuccessful();
    }
}
