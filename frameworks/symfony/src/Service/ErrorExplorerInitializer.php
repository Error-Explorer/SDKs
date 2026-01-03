<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\Service;

use ErrorExplorer\ErrorExplorer;
use Symfony\Component\HttpKernel\Event\RequestEvent;

/**
 * Initializes Error Explorer SDK on first request.
 */
final class ErrorExplorerInitializer
{
    private bool $initialized = false;

    /**
     * @param array{hmac_enabled?: bool, hmac_secret?: string, hmac_algorithm?: string} $security
     * @param array{exceptions?: bool, errors?: bool, fatal_errors?: bool} $capture
     * @param array{max_breadcrumbs?: int, http_requests?: bool, doctrine?: bool, monolog?: bool, console?: bool, cache?: bool, messenger?: bool} $breadcrumbs
     * @param array{async?: bool, timeout?: int, retry?: int} $transport
     * @param string[] $scrubFields
     */
    public function __construct(
        private readonly ?string $token,
        private readonly ?string $dsn,
        private readonly ?string $endpoint,
        private readonly string $environment,
        private readonly ?string $release,
        private readonly array $security,
        private readonly array $capture,
        private readonly array $breadcrumbs,
        private readonly array $transport,
        private readonly array $scrubFields,
    ) {
    }

    public function __invoke(RequestEvent $event): void
    {
        if ($this->initialized || !$event->isMainRequest()) {
            return;
        }

        $options = [];

        // Token or DSN
        if ($this->dsn !== null) {
            $options['dsn'] = $this->dsn;
        } elseif ($this->token !== null) {
            $options['token'] = $this->token;
        }

        // Custom endpoint
        if ($this->endpoint !== null) {
            $options['endpoint'] = $this->endpoint;
        }

        // Environment and release
        $options['environment'] = $this->environment;
        if ($this->release !== null) {
            $options['release'] = $this->release;
        }

        // Security (HMAC)
        if (!empty($this->security) && ($this->security['hmac_enabled'] ?? false)) {
            $options['security'] = $this->security;
        }

        // Capture options
        $options['capture'] = $this->capture;

        // Breadcrumb options
        $options['breadcrumbs'] = [
            'max_breadcrumbs' => $this->breadcrumbs['max_breadcrumbs'] ?? 50,
        ];

        // Transport options
        $options['transport'] = $this->transport;

        // Scrub fields
        if (!empty($this->scrubFields)) {
            $options['scrub_fields'] = $this->scrubFields;
        }

        ErrorExplorer::init($options);
        $this->initialized = true;
    }
}
