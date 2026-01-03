<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\Tests\DependencyInjection;

use ErrorExplorer\Symfony\DependencyInjection\Configuration;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Config\Definition\Processor;

final class ConfigurationTest extends TestCase
{
    private Processor $processor;
    private Configuration $configuration;

    protected function setUp(): void
    {
        $this->processor = new Processor();
        $this->configuration = new Configuration();
    }

    public function test_default_configuration(): void
    {
        $config = $this->process([]);

        $this->assertTrue($config['enabled']);
        $this->assertNull($config['token']);
        $this->assertNull($config['dsn']);
        $this->assertSame('%kernel.environment%', $config['environment']);
        $this->assertNull($config['release']);
        $this->assertSame(-1024, $config['listener_priority']);
    }

    public function test_token_configuration(): void
    {
        $config = $this->process([
            'token' => 'ee_proj_abc123',
        ]);

        $this->assertSame('ee_proj_abc123', $config['token']);
    }

    public function test_dsn_configuration(): void
    {
        $config = $this->process([
            'dsn' => 'https://my_token@api.error-explorer.com/api/v1/webhook',
        ]);

        $this->assertSame('https://my_token@api.error-explorer.com/api/v1/webhook', $config['dsn']);
    }

    public function test_environment_configuration(): void
    {
        $config = $this->process([
            'environment' => 'staging',
        ]);

        $this->assertSame('staging', $config['environment']);
    }

    public function test_release_configuration(): void
    {
        $config = $this->process([
            'release' => 'v2.1.0',
        ]);

        $this->assertSame('v2.1.0', $config['release']);
    }

    // =========================================================================
    // Security Configuration
    // =========================================================================

    public function test_default_security_configuration(): void
    {
        $config = $this->process([]);

        $this->assertFalse($config['security']['hmac_enabled']);
        $this->assertNull($config['security']['hmac_secret']);
        $this->assertSame('sha256', $config['security']['hmac_algorithm']);
    }

    public function test_hmac_configuration(): void
    {
        $config = $this->process([
            'security' => [
                'hmac_enabled' => true,
                'hmac_secret' => 'my_secret_key',
                'hmac_algorithm' => 'sha512',
            ],
        ]);

        $this->assertTrue($config['security']['hmac_enabled']);
        $this->assertSame('my_secret_key', $config['security']['hmac_secret']);
        $this->assertSame('sha512', $config['security']['hmac_algorithm']);
    }

    public function test_hmac_algorithm_validation(): void
    {
        $config = $this->process([
            'security' => [
                'hmac_algorithm' => 'sha384',
            ],
        ]);

        $this->assertSame('sha384', $config['security']['hmac_algorithm']);
    }

    public function test_invalid_hmac_algorithm_throws(): void
    {
        $this->expectException(\Symfony\Component\Config\Definition\Exception\InvalidConfigurationException::class);

        $this->process([
            'security' => [
                'hmac_algorithm' => 'md5',
            ],
        ]);
    }

    // =========================================================================
    // Capture Configuration
    // =========================================================================

    public function test_default_capture_configuration(): void
    {
        $config = $this->process([]);

        $this->assertTrue($config['capture']['exceptions']);
        $this->assertTrue($config['capture']['errors']);
        $this->assertTrue($config['capture']['fatal_errors']);
    }

    public function test_custom_capture_configuration(): void
    {
        $config = $this->process([
            'capture' => [
                'exceptions' => true,
                'errors' => false,
                'fatal_errors' => false,
            ],
        ]);

        $this->assertTrue($config['capture']['exceptions']);
        $this->assertFalse($config['capture']['errors']);
        $this->assertFalse($config['capture']['fatal_errors']);
    }

    // =========================================================================
    // Breadcrumbs Configuration
    // =========================================================================

    public function test_default_breadcrumbs_configuration(): void
    {
        $config = $this->process([]);

        $this->assertSame(50, $config['breadcrumbs']['max_breadcrumbs']);
        $this->assertTrue($config['breadcrumbs']['http_requests']);
        $this->assertTrue($config['breadcrumbs']['doctrine']);
        $this->assertTrue($config['breadcrumbs']['monolog']);
        $this->assertTrue($config['breadcrumbs']['console']);
        $this->assertTrue($config['breadcrumbs']['messenger']);
        $this->assertTrue($config['breadcrumbs']['cache']);
        $this->assertTrue($config['breadcrumbs']['security']);
    }

    public function test_custom_breadcrumbs_configuration(): void
    {
        $config = $this->process([
            'breadcrumbs' => [
                'max_breadcrumbs' => 100,
                'doctrine' => false,
                'messenger' => false,
            ],
        ]);

        $this->assertSame(100, $config['breadcrumbs']['max_breadcrumbs']);
        $this->assertFalse($config['breadcrumbs']['doctrine']);
        $this->assertFalse($config['breadcrumbs']['messenger']);
        $this->assertTrue($config['breadcrumbs']['http_requests']); // Default
    }

    public function test_max_breadcrumbs_minimum(): void
    {
        $this->expectException(\Symfony\Component\Config\Definition\Exception\InvalidConfigurationException::class);

        $this->process([
            'breadcrumbs' => [
                'max_breadcrumbs' => 5,
            ],
        ]);
    }

    public function test_max_breadcrumbs_maximum(): void
    {
        $this->expectException(\Symfony\Component\Config\Definition\Exception\InvalidConfigurationException::class);

        $this->process([
            'breadcrumbs' => [
                'max_breadcrumbs' => 150,
            ],
        ]);
    }

    // =========================================================================
    // Context Configuration
    // =========================================================================

    public function test_default_context_configuration(): void
    {
        $config = $this->process([]);

        $this->assertTrue($config['context']['user']);
        $this->assertTrue($config['context']['request']);
        $this->assertTrue($config['context']['server']);
    }

    public function test_custom_context_configuration(): void
    {
        $config = $this->process([
            'context' => [
                'user' => false,
                'request' => true,
                'server' => false,
            ],
        ]);

        $this->assertFalse($config['context']['user']);
        $this->assertTrue($config['context']['request']);
        $this->assertFalse($config['context']['server']);
    }

    // =========================================================================
    // Transport Configuration
    // =========================================================================

    public function test_default_transport_configuration(): void
    {
        $config = $this->process([]);

        $this->assertTrue($config['transport']['async']);
        $this->assertSame(3, $config['transport']['timeout']);
        $this->assertSame(2, $config['transport']['retry']);
    }

    public function test_custom_transport_configuration(): void
    {
        $config = $this->process([
            'transport' => [
                'async' => false,
                'timeout' => 10,
                'retry' => 5,
            ],
        ]);

        $this->assertFalse($config['transport']['async']);
        $this->assertSame(10, $config['transport']['timeout']);
        $this->assertSame(5, $config['transport']['retry']);
    }

    public function test_transport_timeout_minimum(): void
    {
        $this->expectException(\Symfony\Component\Config\Definition\Exception\InvalidConfigurationException::class);

        $this->process([
            'transport' => [
                'timeout' => 0,
            ],
        ]);
    }

    public function test_transport_retry_maximum(): void
    {
        $this->expectException(\Symfony\Component\Config\Definition\Exception\InvalidConfigurationException::class);

        $this->process([
            'transport' => [
                'retry' => 10,
            ],
        ]);
    }

    // =========================================================================
    // Scrub Fields Configuration
    // =========================================================================

    public function test_default_scrub_fields(): void
    {
        $config = $this->process([]);

        $this->assertSame([], $config['scrub_fields']);
    }

    public function test_custom_scrub_fields(): void
    {
        $config = $this->process([
            'scrub_fields' => ['custom_password', 'api_token'],
        ]);

        $this->assertSame(['custom_password', 'api_token'], $config['scrub_fields']);
    }

    // =========================================================================
    // Ignore Configuration
    // =========================================================================

    public function test_default_ignore_configuration(): void
    {
        $config = $this->process([]);

        $this->assertSame([], $config['ignore']['exceptions']);
        $this->assertContains('_wdt', $config['ignore']['routes']);
        $this->assertContains('_profiler', $config['ignore']['routes']);
        $this->assertSame([], $config['ignore']['status_codes']);
        $this->assertSame([], $config['ignore']['paths']);
    }

    public function test_custom_ignore_exceptions(): void
    {
        $config = $this->process([
            'ignore' => [
                'exceptions' => [
                    'Symfony\Component\HttpKernel\Exception\NotFoundHttpException',
                    'Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException',
                ],
            ],
        ]);

        $this->assertCount(2, $config['ignore']['exceptions']);
        $this->assertContains('Symfony\Component\HttpKernel\Exception\NotFoundHttpException', $config['ignore']['exceptions']);
    }

    public function test_custom_ignore_routes(): void
    {
        $config = $this->process([
            'ignore' => [
                'routes' => ['api_health', 'api_ping'],
            ],
        ]);

        $this->assertSame(['api_health', 'api_ping'], $config['ignore']['routes']);
    }

    public function test_custom_ignore_status_codes(): void
    {
        $config = $this->process([
            'ignore' => [
                'status_codes' => [404, 403, 401],
            ],
        ]);

        $this->assertSame([404, 403, 401], $config['ignore']['status_codes']);
    }

    public function test_custom_ignore_paths(): void
    {
        $config = $this->process([
            'ignore' => [
                'paths' => ['^/health', '^/api/ping'],
            ],
        ]);

        $this->assertSame(['^/health', '^/api/ping'], $config['ignore']['paths']);
    }

    // =========================================================================
    // Listener Priority
    // =========================================================================

    public function test_custom_listener_priority(): void
    {
        $config = $this->process([
            'listener_priority' => -2048,
        ]);

        $this->assertSame(-2048, $config['listener_priority']);
    }

    // =========================================================================
    // Helper
    // =========================================================================

    /**
     * @param array<string, mixed> $config
     * @return array<string, mixed>
     */
    private function process(array $config): array
    {
        return $this->processor->processConfiguration(
            $this->configuration,
            ['error_explorer' => $config]
        );
    }
}
