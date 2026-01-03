<?php

declare(strict_types=1);

namespace ErrorExplorer\Security;

/**
 * Signs payloads with HMAC for secure transmission.
 *
 * Uses timestamp-based signing to prevent replay attacks:
 * - Signature = HMAC(timestamp.payload, secret)
 * - Headers: X-Webhook-Signature, X-Webhook-Timestamp
 */
final class HmacSigner
{
    private const SUPPORTED_ALGORITHMS = ['sha256', 'sha384', 'sha512'];
    private const SIGNATURE_HEADER = 'X-Webhook-Signature';
    private const TIMESTAMP_HEADER = 'X-Webhook-Timestamp';

    public function __construct(
        private readonly string $secret,
        private readonly string $algorithm = 'sha256',
    ) {
        if (!in_array($algorithm, self::SUPPORTED_ALGORITHMS, true)) {
            throw new \InvalidArgumentException(sprintf(
                'Unsupported HMAC algorithm: %s. Supported: %s',
                $algorithm,
                implode(', ', self::SUPPORTED_ALGORITHMS)
            ));
        }
    }

    /**
     * Sign a payload with timestamp and return the signature.
     *
     * @param string $payload The payload to sign
     * @param int|null $timestamp Unix timestamp (defaults to current time)
     */
    public function sign(string $payload, ?int $timestamp = null): string
    {
        $timestamp = $timestamp ?? time();
        $signedPayload = $timestamp . '.' . $payload;

        return hash_hmac($this->algorithm, $signedPayload, $this->secret);
    }

    /**
     * Verify a signature against a payload and timestamp.
     *
     * @param string $payload The original payload
     * @param string $signature The signature to verify
     * @param int $timestamp The timestamp used when signing
     */
    public function verify(string $payload, string $signature, int $timestamp): bool
    {
        $expected = $this->sign($payload, $timestamp);

        return hash_equals($expected, $signature);
    }

    /**
     * Get the signature header name.
     */
    public function getSignatureHeaderName(): string
    {
        return self::SIGNATURE_HEADER;
    }

    /**
     * Get the timestamp header name.
     */
    public function getTimestampHeaderName(): string
    {
        return self::TIMESTAMP_HEADER;
    }

    /**
     * Get the current algorithm.
     */
    public function getAlgorithm(): string
    {
        return $this->algorithm;
    }

    /**
     * Build headers for a signed request.
     *
     * @param string $payload The payload to sign
     * @param int|null $timestamp Unix timestamp (defaults to current time)
     * @return array<string, string>
     */
    public function buildHeaders(string $payload, ?int $timestamp = null): array
    {
        $timestamp = $timestamp ?? time();

        return [
            self::SIGNATURE_HEADER => $this->sign($payload, $timestamp),
            self::TIMESTAMP_HEADER => (string) $timestamp,
        ];
    }
}
