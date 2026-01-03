<?php

declare(strict_types=1);

namespace ErrorExplorer\Security;

/**
 * Scrubs sensitive data from payloads before sending.
 */
final class DataScrubber
{
    private const REPLACEMENT = '[Filtered]';

    /** @var string[] */
    private array $fields;

    /** @var string[] */
    private array $patterns;

    /** @var array<string, string> */
    private array $replacements = [];

    /**
     * @param string[] $fields Field names to scrub
     */
    public function __construct(array $fields = [])
    {
        $this->fields = array_map('strtolower', $fields);
        $this->patterns = $this->buildPatterns();
    }

    /**
     * Scrub sensitive data from a payload.
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function scrub(array $payload): array
    {
        return $this->scrubRecursive($payload);
    }

    /**
     * Recursively scrub data.
     *
     * @param mixed $data
     * @return mixed
     */
    private function scrubRecursive(mixed $data): mixed
    {
        if (is_array($data)) {
            $result = [];
            foreach ($data as $key => $value) {
                $keyLower = strtolower((string) $key);

                // Check if key matches sensitive field
                if ($this->isSensitiveKey($keyLower)) {
                    $result[$key] = self::REPLACEMENT;
                } else {
                    $result[$key] = $this->scrubRecursive($value);
                }
            }
            return $result;
        }

        if (is_string($data)) {
            return $this->scrubString($data);
        }

        return $data;
    }

    /**
     * Check if a key is sensitive.
     */
    private function isSensitiveKey(string $key): bool
    {
        foreach ($this->fields as $field) {
            if (str_contains($key, $field)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Scrub sensitive patterns from a string.
     */
    private function scrubString(string $value): string
    {
        foreach ($this->patterns as $pattern) {
            $replacement = $this->replacements[$pattern] ?? self::REPLACEMENT;
            $value = preg_replace($pattern, $replacement, $value) ?? $value;
        }

        return $value;
    }

    /**
     * Build regex patterns for common sensitive data.
     *
     * @return string[]
     */
    private function buildPatterns(): array
    {
        $this->replacements = [
            // Credit card numbers (basic pattern)
            '/\b(?:\d{4}[- ]?){3}\d{4}\b/' => self::REPLACEMENT,

            // Bearer tokens
            '/Bearer\s+[A-Za-z0-9\-_]+\.?[A-Za-z0-9\-_]*\.?[A-Za-z0-9\-_]*/i' => 'Bearer ' . self::REPLACEMENT,

            // API keys in URLs
            '/([?&](?:api_?key|token|secret|password|auth)=)[^&]+/i' => '$1' . self::REPLACEMENT,
        ];

        return array_keys($this->replacements);
    }

    /**
     * Add additional fields to scrub.
     *
     * @param string[] $fields
     */
    public function addFields(array $fields): void
    {
        $this->fields = array_merge($this->fields, array_map('strtolower', $fields));
    }

    /**
     * Add a custom regex pattern to scrub.
     */
    public function addPattern(string $pattern): void
    {
        $this->patterns[] = $pattern;
    }
}
