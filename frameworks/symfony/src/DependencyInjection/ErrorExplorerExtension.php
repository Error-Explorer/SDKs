<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\DependencyInjection;

use ErrorExplorer\Symfony\Doctrine\DoctrineQueryLogger;
use ErrorExplorer\Symfony\EventSubscriber\ConsoleSubscriber;
use ErrorExplorer\Symfony\EventSubscriber\ExceptionSubscriber;
use ErrorExplorer\Symfony\EventSubscriber\MessengerSubscriber;
use ErrorExplorer\Symfony\EventSubscriber\RequestSubscriber;
use ErrorExplorer\Symfony\Monolog\ErrorExplorerHandler;
use Symfony\Component\Config\FileLocator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Extension\Extension;
use Symfony\Component\DependencyInjection\Loader\YamlFileLoader;
use Symfony\Component\DependencyInjection\Reference;

/**
 * Loads Error Explorer bundle configuration and services.
 */
final class ErrorExplorerExtension extends Extension
{
    public function load(array $configs, ContainerBuilder $container): void
    {
        $configuration = new Configuration();
        $config = $this->processConfiguration($configuration, $configs);

        // Store config as parameters
        $container->setParameter('error_explorer.enabled', $config['enabled']);
        $container->setParameter('error_explorer.token', $config['token']);
        $container->setParameter('error_explorer.dsn', $config['dsn']);
        $container->setParameter('error_explorer.endpoint', $config['endpoint']);
        $container->setParameter('error_explorer.environment', $config['environment']);
        $container->setParameter('error_explorer.release', $config['release']);
        $container->setParameter('error_explorer.security', $config['security']);
        $container->setParameter('error_explorer.capture', $config['capture']);
        $container->setParameter('error_explorer.breadcrumbs', $config['breadcrumbs']);
        $container->setParameter('error_explorer.context', $config['context']);
        $container->setParameter('error_explorer.context.user', $config['context']['user']);
        $container->setParameter('error_explorer.context.request', $config['context']['request']);
        $container->setParameter('error_explorer.context.server', $config['context']['server']);
        $container->setParameter('error_explorer.transport', $config['transport']);
        $container->setParameter('error_explorer.scrub_fields', $config['scrub_fields']);
        $container->setParameter('error_explorer.ignore', $config['ignore']);
        $container->setParameter('error_explorer.listener_priority', $config['listener_priority']);

        // Load services
        $loader = new YamlFileLoader($container, new FileLocator(__DIR__ . '/../../config'));
        $loader->load('services.yaml');

        // Conditionally register optional services
        $this->registerOptionalServices($container, $config);
    }

    /**
     * @param array<string, mixed> $config
     */
    private function registerOptionalServices(ContainerBuilder $container, array $config): void
    {
        $breadcrumbs = $config['breadcrumbs'];

        // Doctrine query logging
        if ($breadcrumbs['doctrine'] && class_exists('Doctrine\DBAL\Connection')) {
            $container->register('error_explorer.doctrine_logger', DoctrineQueryLogger::class)
                ->setAutoconfigured(true)
                ->addTag('doctrine.middleware');
        }

        // Console command subscriber
        if ($breadcrumbs['console']) {
            $container->register('error_explorer.console_subscriber', ConsoleSubscriber::class)
                ->setAutoconfigured(true)
                ->addTag('kernel.event_subscriber');
        }

        // Messenger subscriber
        if ($breadcrumbs['messenger'] && interface_exists('Symfony\Component\Messenger\MessageBusInterface')) {
            $container->register('error_explorer.messenger_subscriber', MessengerSubscriber::class)
                ->setAutoconfigured(true)
                ->addTag('kernel.event_subscriber');
        }

        // Monolog handler
        if ($breadcrumbs['monolog'] && class_exists('Monolog\Logger')) {
            $container->register('error_explorer.monolog_handler', ErrorExplorerHandler::class)
                ->setAutoconfigured(true)
                ->addTag('monolog.handler');
        }
    }

    public function getAlias(): string
    {
        return 'error_explorer';
    }
}
