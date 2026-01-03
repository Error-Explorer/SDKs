<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

/**
 * Configuration schema for error_explorer bundle.
 */
final class Configuration implements ConfigurationInterface
{
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('error_explorer');
        $rootNode = $treeBuilder->getRootNode();

        $rootNode
            ->children()
                // Enable/disable the bundle
                ->booleanNode('enabled')
                    ->defaultTrue()
                    ->info('Enable or disable Error Explorer entirely')
                ->end()

                // Required: Project token
                ->scalarNode('token')
                    ->defaultNull()
                    ->info('Your Error Explorer project token')
                ->end()

                // Or DSN format
                ->scalarNode('dsn')
                    ->defaultNull()
                    ->info('Alternative: DSN format (https://token@api.error-explorer.com/...)')
                ->end()

                // Custom endpoint URL
                ->scalarNode('endpoint')
                    ->defaultNull()
                    ->info('Custom API endpoint URL (e.g., http://localhost:8000/api/v1/webhook)')
                ->end()

                // Environment (auto-detected if not set)
                ->scalarNode('environment')
                    ->defaultValue('%kernel.environment%')
                    ->info('Environment name (defaults to kernel.environment)')
                ->end()

                // Release version
                ->scalarNode('release')
                    ->defaultNull()
                    ->info('Application release/version')
                ->end()

                // Security options (HMAC)
                ->arrayNode('security')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->booleanNode('hmac_enabled')
                            ->defaultFalse()
                            ->info('Enable HMAC signature for webhook requests')
                        ->end()
                        ->scalarNode('hmac_secret')
                            ->defaultNull()
                            ->info('HMAC secret key for signing requests')
                        ->end()
                        ->enumNode('hmac_algorithm')
                            ->values(['sha256', 'sha384', 'sha512'])
                            ->defaultValue('sha256')
                            ->info('HMAC algorithm to use')
                        ->end()
                    ->end()
                ->end()

                // Capture options
                ->arrayNode('capture')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->booleanNode('exceptions')
                            ->defaultTrue()
                            ->info('Capture uncaught exceptions')
                        ->end()
                        ->booleanNode('errors')
                            ->defaultTrue()
                            ->info('Capture PHP errors (warnings, notices)')
                        ->end()
                        ->booleanNode('fatal_errors')
                            ->defaultTrue()
                            ->info('Capture fatal errors via shutdown function')
                        ->end()
                    ->end()
                ->end()

                // Breadcrumb options
                ->arrayNode('breadcrumbs')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->integerNode('max_breadcrumbs')
                            ->defaultValue(50)
                            ->min(10)
                            ->max(100)
                            ->info('Maximum number of breadcrumbs to keep')
                        ->end()
                        ->booleanNode('http_requests')
                            ->defaultTrue()
                            ->info('Track kernel.request/response events')
                        ->end()
                        ->booleanNode('doctrine')
                            ->defaultTrue()
                            ->info('Track Doctrine SQL queries')
                        ->end()
                        ->booleanNode('monolog')
                            ->defaultTrue()
                            ->info('Track Monolog log entries')
                        ->end()
                        ->booleanNode('console')
                            ->defaultTrue()
                            ->info('Track console commands')
                        ->end()
                        ->booleanNode('messenger')
                            ->defaultTrue()
                            ->info('Track Messenger messages')
                        ->end()
                        ->booleanNode('cache')
                            ->defaultTrue()
                            ->info('Track cache operations')
                        ->end()
                        ->booleanNode('security')
                            ->defaultTrue()
                            ->info('Track security events (login, logout)')
                        ->end()
                    ->end()
                ->end()

                // Context options
                ->arrayNode('context')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->booleanNode('user')
                            ->defaultTrue()
                            ->info('Auto-detect user from Security component')
                        ->end()
                        ->booleanNode('request')
                            ->defaultTrue()
                            ->info('Include request context (URL, IP, headers)')
                        ->end()
                        ->booleanNode('server')
                            ->defaultTrue()
                            ->info('Include server context (PHP version, memory)')
                        ->end()
                    ->end()
                ->end()

                // Transport options
                ->arrayNode('transport')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->booleanNode('async')
                            ->defaultTrue()
                            ->info('Send errors asynchronously (after response)')
                        ->end()
                        ->integerNode('timeout')
                            ->defaultValue(3)
                            ->min(1)
                            ->max(30)
                            ->info('HTTP timeout in seconds')
                        ->end()
                        ->integerNode('retry')
                            ->defaultValue(2)
                            ->min(0)
                            ->max(5)
                            ->info('Number of retries on failure')
                        ->end()
                    ->end()
                ->end()

                // Fields to scrub
                ->arrayNode('scrub_fields')
                    ->scalarPrototype()->end()
                    ->defaultValue([])
                    ->info('Additional field names to scrub from payloads')
                ->end()

                // Ignore/filtering options
                ->arrayNode('ignore')
                    ->addDefaultsIfNotSet()
                    ->children()
                        ->arrayNode('exceptions')
                            ->scalarPrototype()->end()
                            ->defaultValue([])
                            ->info('Exception class names to ignore')
                            ->example(['Symfony\Component\HttpKernel\Exception\NotFoundHttpException'])
                        ->end()
                        ->arrayNode('routes')
                            ->scalarPrototype()->end()
                            ->defaultValue(['_wdt', '_profiler', '_profiler_home', '_profiler_search', '_profiler_search_bar'])
                            ->info('Route names to ignore')
                        ->end()
                        ->arrayNode('status_codes')
                            ->integerPrototype()->end()
                            ->defaultValue([])
                            ->info('HTTP status codes to ignore')
                            ->example([404, 403])
                        ->end()
                        ->arrayNode('paths')
                            ->scalarPrototype()->end()
                            ->defaultValue([])
                            ->info('URL path patterns to ignore (regex)')
                            ->example(['^/health', '^/api/ping'])
                        ->end()
                    ->end()
                ->end()

                // Listener priority (lower = runs later)
                ->integerNode('listener_priority')
                    ->defaultValue(-1024)
                    ->info('Priority for exception listener (lower = runs later)')
                ->end()
            ->end()
        ;

        return $treeBuilder;
    }
}
