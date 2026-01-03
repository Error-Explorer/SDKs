<?php

declare(strict_types=1);

namespace ErrorExplorer\Tests;

use ErrorExplorer\Security\DataScrubber;
use PHPUnit\Framework\TestCase;

final class DataScrubberTest extends TestCase
{
    public function test_scrubs_password_field(): void
    {
        $scrubber = new DataScrubber(['password']);

        $data = $scrubber->scrub([
            'username' => 'john',
            'password' => 'secret123',
        ]);

        $this->assertSame('john', $data['username']);
        $this->assertSame('[Filtered]', $data['password']);
    }

    public function test_scrubs_nested_fields(): void
    {
        $scrubber = new DataScrubber(['password', 'token']);

        $data = $scrubber->scrub([
            'user' => [
                'name' => 'John',
                'password' => 'secret',
            ],
            'auth' => [
                'token' => 'abc123',
            ],
        ]);

        $this->assertSame('John', $data['user']['name']);
        $this->assertSame('[Filtered]', $data['user']['password']);
        $this->assertSame('[Filtered]', $data['auth']['token']);
    }

    public function test_scrubs_partial_key_matches(): void
    {
        $scrubber = new DataScrubber(['password']);

        $data = $scrubber->scrub([
            'user_password' => 'secret',
            'password_hash' => 'hash123',
            'old_password' => 'old_secret',
        ]);

        $this->assertSame('[Filtered]', $data['user_password']);
        $this->assertSame('[Filtered]', $data['password_hash']);
        $this->assertSame('[Filtered]', $data['old_password']);
    }

    public function test_scrubs_case_insensitive(): void
    {
        $scrubber = new DataScrubber(['password']);

        $data = $scrubber->scrub([
            'Password' => 'secret1',
            'PASSWORD' => 'secret2',
            'passWORD' => 'secret3',
        ]);

        $this->assertSame('[Filtered]', $data['Password']);
        $this->assertSame('[Filtered]', $data['PASSWORD']);
        $this->assertSame('[Filtered]', $data['passWORD']);
    }

    public function test_scrubs_credit_card_pattern_in_strings(): void
    {
        $scrubber = new DataScrubber([]);

        $data = $scrubber->scrub([
            'message' => 'Payment with card 4111-1111-1111-1111 failed',
        ]);

        $this->assertStringContainsString('[Filtered]', $data['message']);
        $this->assertStringNotContainsString('4111', $data['message']);
    }

    public function test_scrubs_bearer_tokens_in_strings(): void
    {
        $scrubber = new DataScrubber([]);

        $data = $scrubber->scrub([
            'header' => 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
        ]);

        $this->assertStringContainsString('Bearer [Filtered]', $data['header']);
        $this->assertStringNotContainsString('eyJ', $data['header']);
    }

    public function test_scrubs_api_keys_in_urls(): void
    {
        $scrubber = new DataScrubber([]);

        $data = $scrubber->scrub([
            'url' => 'https://api.example.com/data?api_key=secret123&other=value',
        ]);

        $this->assertStringContainsString('api_key=[Filtered]', $data['url']);
        $this->assertStringContainsString('other=value', $data['url']);
    }

    public function test_preserves_non_sensitive_data(): void
    {
        $scrubber = new DataScrubber(['password']);

        $data = $scrubber->scrub([
            'username' => 'john',
            'email' => 'john@example.com',
            'age' => 30,
            'active' => true,
            'balance' => 99.99,
        ]);

        $this->assertSame('john', $data['username']);
        $this->assertSame('john@example.com', $data['email']);
        $this->assertSame(30, $data['age']);
        $this->assertTrue($data['active']);
        $this->assertSame(99.99, $data['balance']);
    }

    public function test_handles_null_values(): void
    {
        $scrubber = new DataScrubber(['password']);

        $data = $scrubber->scrub([
            'password' => null,
            'optional' => null,
        ]);

        // Even null password should be filtered (key matches)
        $this->assertSame('[Filtered]', $data['password']);
        $this->assertNull($data['optional']);
    }

    public function test_add_custom_fields(): void
    {
        $scrubber = new DataScrubber([]);
        $scrubber->addFields(['my_secret']);

        $data = $scrubber->scrub([
            'my_secret' => 'value',
            'other' => 'visible',
        ]);

        $this->assertSame('[Filtered]', $data['my_secret']);
        $this->assertSame('visible', $data['other']);
    }

    public function test_add_custom_pattern(): void
    {
        $scrubber = new DataScrubber([]);
        $scrubber->addPattern('/SECRET_[A-Z0-9]+/');

        $data = $scrubber->scrub([
            'message' => 'Using SECRET_ABC123 for auth',
        ]);

        $this->assertStringContainsString('[Filtered]', $data['message']);
        $this->assertStringNotContainsString('SECRET_ABC123', $data['message']);
    }

    public function test_deeply_nested_structures(): void
    {
        $scrubber = new DataScrubber(['password', 'secret']);

        $data = $scrubber->scrub([
            'level1' => [
                'level2' => [
                    'level3' => [
                        'password' => 'deep_secret',
                        'data' => 'visible',
                    ],
                ],
            ],
        ]);

        $this->assertSame('[Filtered]', $data['level1']['level2']['level3']['password']);
        $this->assertSame('visible', $data['level1']['level2']['level3']['data']);
    }
}
