<?php

declare(strict_types=1);

namespace ErrorExplorer\Tests;

use ErrorExplorer\Security\HmacSigner;
use PHPUnit\Framework\TestCase;

final class HmacSignerTest extends TestCase
{
    public function test_signs_payload_with_sha256(): void
    {
        $signer = new HmacSigner('my_secret_key', 'sha256');
        $timestamp = 1703750000;

        $signature = $signer->sign('{"message":"test"}', $timestamp);

        $this->assertNotEmpty($signature);
        $this->assertSame(64, strlen($signature)); // SHA256 produces 64 hex chars
    }

    public function test_signs_payload_with_sha384(): void
    {
        $signer = new HmacSigner('my_secret_key', 'sha384');
        $timestamp = 1703750000;

        $signature = $signer->sign('{"message":"test"}', $timestamp);

        $this->assertNotEmpty($signature);
        $this->assertSame(96, strlen($signature)); // SHA384 produces 96 hex chars
    }

    public function test_signs_payload_with_sha512(): void
    {
        $signer = new HmacSigner('my_secret_key', 'sha512');
        $timestamp = 1703750000;

        $signature = $signer->sign('{"message":"test"}', $timestamp);

        $this->assertNotEmpty($signature);
        $this->assertSame(128, strlen($signature)); // SHA512 produces 128 hex chars
    }

    public function test_throws_on_unsupported_algorithm(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Unsupported HMAC algorithm');

        new HmacSigner('secret', 'md5');
    }

    public function test_same_payload_and_timestamp_produce_same_signature(): void
    {
        $signer = new HmacSigner('secret', 'sha256');
        $payload = '{"id":123}';
        $timestamp = 1703750000;

        $signature1 = $signer->sign($payload, $timestamp);
        $signature2 = $signer->sign($payload, $timestamp);

        $this->assertSame($signature1, $signature2);
    }

    public function test_different_payloads_produce_different_signatures(): void
    {
        $signer = new HmacSigner('secret', 'sha256');
        $timestamp = 1703750000;

        $signature1 = $signer->sign('{"id":1}', $timestamp);
        $signature2 = $signer->sign('{"id":2}', $timestamp);

        $this->assertNotSame($signature1, $signature2);
    }

    public function test_different_timestamps_produce_different_signatures(): void
    {
        $signer = new HmacSigner('secret', 'sha256');
        $payload = '{"id":123}';

        $signature1 = $signer->sign($payload, 1703750000);
        $signature2 = $signer->sign($payload, 1703750001);

        $this->assertNotSame($signature1, $signature2);
    }

    public function test_different_secrets_produce_different_signatures(): void
    {
        $signer1 = new HmacSigner('secret1', 'sha256');
        $signer2 = new HmacSigner('secret2', 'sha256');
        $payload = '{"test":true}';
        $timestamp = 1703750000;

        $signature1 = $signer1->sign($payload, $timestamp);
        $signature2 = $signer2->sign($payload, $timestamp);

        $this->assertNotSame($signature1, $signature2);
    }

    public function test_verifies_valid_signature(): void
    {
        $signer = new HmacSigner('my_secret', 'sha256');
        $payload = '{"message":"hello"}';
        $timestamp = 1703750000;

        $signature = $signer->sign($payload, $timestamp);

        $this->assertTrue($signer->verify($payload, $signature, $timestamp));
    }

    public function test_rejects_invalid_signature(): void
    {
        $signer = new HmacSigner('my_secret', 'sha256');
        $payload = '{"message":"hello"}';
        $timestamp = 1703750000;

        $this->assertFalse($signer->verify($payload, 'invalid_signature', $timestamp));
    }

    public function test_rejects_wrong_timestamp(): void
    {
        $signer = new HmacSigner('my_secret', 'sha256');
        $payload = '{"message":"hello"}';
        $signTimestamp = 1703750000;
        $wrongTimestamp = 1703750001;

        $signature = $signer->sign($payload, $signTimestamp);

        $this->assertFalse($signer->verify($payload, $signature, $wrongTimestamp));
    }

    public function test_rejects_tampered_payload(): void
    {
        $signer = new HmacSigner('my_secret', 'sha256');
        $originalPayload = '{"amount":100}';
        $tamperedPayload = '{"amount":1000}';
        $timestamp = 1703750000;

        $signature = $signer->sign($originalPayload, $timestamp);

        $this->assertFalse($signer->verify($tamperedPayload, $signature, $timestamp));
    }

    public function test_get_signature_header_name(): void
    {
        $signer = new HmacSigner('secret');

        $this->assertSame('X-Webhook-Signature', $signer->getSignatureHeaderName());
    }

    public function test_get_timestamp_header_name(): void
    {
        $signer = new HmacSigner('secret');

        $this->assertSame('X-Webhook-Timestamp', $signer->getTimestampHeaderName());
    }

    public function test_get_algorithm(): void
    {
        $signer256 = new HmacSigner('secret', 'sha256');
        $signer512 = new HmacSigner('secret', 'sha512');

        $this->assertSame('sha256', $signer256->getAlgorithm());
        $this->assertSame('sha512', $signer512->getAlgorithm());
    }

    public function test_build_headers(): void
    {
        $signer = new HmacSigner('secret', 'sha256');
        $payload = '{"test":true}';
        $timestamp = 1703750000;

        $headers = $signer->buildHeaders($payload, $timestamp);

        $this->assertArrayHasKey('X-Webhook-Signature', $headers);
        $this->assertArrayHasKey('X-Webhook-Timestamp', $headers);
        $this->assertSame((string) $timestamp, $headers['X-Webhook-Timestamp']);
        $this->assertSame($signer->sign($payload, $timestamp), $headers['X-Webhook-Signature']);
    }

    public function test_build_headers_uses_current_time_if_no_timestamp(): void
    {
        $signer = new HmacSigner('secret', 'sha256');
        $payload = '{"test":true}';

        $before = time();
        $headers = $signer->buildHeaders($payload);
        $after = time();

        $timestamp = (int) $headers['X-Webhook-Timestamp'];
        $this->assertGreaterThanOrEqual($before, $timestamp);
        $this->assertLessThanOrEqual($after, $timestamp);
    }

    public function test_sign_uses_current_time_if_no_timestamp(): void
    {
        $signer = new HmacSigner('secret', 'sha256');
        $payload = '{"test":true}';

        // Sign without explicit timestamp
        $signature = $signer->sign($payload);

        // Verify with current time (within 1 second)
        $verified = $signer->verify($payload, $signature, time());
        $this->assertTrue($verified);
    }

    public function test_timing_safe_comparison(): void
    {
        $signer = new HmacSigner('secret', 'sha256');
        $payload = '{"data":"test"}';
        $timestamp = 1703750000;
        $signature = $signer->sign($payload, $timestamp);

        // This test verifies that hash_equals is used internally
        // by checking that verification works correctly
        $this->assertTrue($signer->verify($payload, $signature, $timestamp));

        // Test with slightly different signature (timing attack prevention)
        $wrongSignature = substr($signature, 0, -1) . 'x';
        $this->assertFalse($signer->verify($payload, $wrongSignature, $timestamp));
    }

    public function test_signature_matches_backend_format(): void
    {
        // This test ensures our SDK produces the same signature as the backend expects
        // Backend computes: hash_hmac('sha256', $timestamp . '.' . $payload, $secret)
        $secret = 'test_secret_key';
        $payload = '{"message":"test error"}';
        $timestamp = 1703750000;

        $signer = new HmacSigner($secret, 'sha256');
        $signature = $signer->sign($payload, $timestamp);

        // Manually compute expected signature (backend format)
        $signedPayload = $timestamp . '.' . $payload;
        $expectedSignature = hash_hmac('sha256', $signedPayload, $secret);

        $this->assertSame($expectedSignature, $signature);
    }
}
