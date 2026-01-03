<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony;

use ErrorExplorer\Symfony\DependencyInjection\ErrorExplorerExtension;
use Symfony\Component\DependencyInjection\Extension\ExtensionInterface;
use Symfony\Component\HttpKernel\Bundle\AbstractBundle;

/**
 * Error Explorer Bundle for Symfony.
 *
 * Provides automatic error tracking with:
 * - Exception capture via kernel.exception event
 * - Automatic breadcrumbs (requests, responses, SQL queries, logs)
 * - Automatic user context detection via Security component
 * - Monolog integration
 */
final class ErrorExplorerBundle extends AbstractBundle
{
    public function getContainerExtension(): ExtensionInterface
    {
        return new ErrorExplorerExtension();
    }
}
