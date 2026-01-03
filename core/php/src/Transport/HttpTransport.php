<?php

declare(strict_types=1);

namespace ErrorExplorer\Transport;

use ErrorExplorer\Config\Config;
use ErrorExplorer\Security\HmacSigner;

/**
 * HTTP transport for sending error reports.
 *
 * Supports synchronous and asynchronous (shutdown) sending.
 * Supports HMAC signing for secure transmission.
 */
final class HttpTransport
{
    private Config $config;
    private ?HmacSigner $hmacSigner = null;

    /** @var array<int, array<string, mixed>> */
    private array $queue = [];

    public function __construct(Config $config)
    {
        $this->config = $config;

        // Initialize HMAC signer if enabled
        if ($config->isHmacEnabled() && $config->getHmacSecret() !== null) {
            $this->hmacSigner = new HmacSigner(
                $config->getHmacSecret(),
                $config->getHmacAlgorithm()
            );
        }

        // Register async flush on shutdown if async mode is enabled
        if ($config->isAsyncTransport()) {
            register_shutdown_function([$this, 'flushOnShutdown']);
        }
    }

    /**
     * Send a payload to the API.
     *
     * @param array<string, mixed> $payload
     */
    public function send(array $payload): void
    {
        if ($this->config->isAsyncTransport()) {
            // Queue for async sending
            $this->queue[] = $payload;
        } else {
            // Send immediately
            $this->doSend($payload);
        }
    }

    /**
     * Flush pending events on shutdown.
     */
    public function flushOnShutdown(): void
    {
        // Finish the request before sending (for FPM)
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }

        $this->flush($this->config->getTimeout());
    }

    /**
     * Flush all queued payloads.
     */
    public function flush(int $timeout = 2): bool
    {
        if (empty($this->queue)) {
            return true;
        }

        $success = true;

        foreach ($this->queue as $payload) {
            if (!$this->doSend($payload)) {
                $success = false;
            }
        }

        $this->queue = [];

        return $success;
    }

    /**
     * Actually send the payload via cURL.
     *
     * @param array<string, mixed> $payload
     */
    private function doSend(array $payload): bool
    {
        $json = json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $retries = $this->config->getRetry();

        for ($attempt = 0; $attempt <= $retries; $attempt++) {
            if ($this->sendRequest($json)) {
                return true;
            }

            // Wait before retry (exponential backoff)
            if ($attempt < $retries) {
                usleep((int) (pow(2, $attempt) * 100000)); // 100ms, 200ms, 400ms...
            }
        }

        return false;
    }

    /**
     * Send HTTP request via cURL.
     */
    private function sendRequest(string $json): bool
    {
        $headers = [
            'Content-Type: application/json',
            'Content-Length: ' . strlen($json),
            'User-Agent: error-explorer/php-sdk 1.0.0',
        ];

        // Add HMAC signature if enabled
        if ($this->hmacSigner !== null) {
            $signatureHeaders = $this->hmacSigner->buildHeaders($json);
            foreach ($signatureHeaders as $name => $value) {
                $headers[] = sprintf('%s: %s', $name, $value);
            }
        }

        $endpoint = $this->config->getEndpoint();

        $ch = curl_init();

        curl_setopt_array($ch, [
            CURLOPT_URL => $endpoint,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->config->getTimeout(),
            CURLOPT_CONNECTTIMEOUT => 2,
        ]);

        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // Success if 2xx status code
        return $httpCode >= 200 && $httpCode < 300;
    }

    /**
     * Get the number of queued payloads.
     */
    public function getQueueSize(): int
    {
        return count($this->queue);
    }
}
