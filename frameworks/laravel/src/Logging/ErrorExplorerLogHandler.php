<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel\Logging;

use ErrorExplorer\Breadcrumbs\BreadcrumbManager;
use Monolog\Handler\AbstractProcessingHandler;
use Monolog\Level;
use Monolog\LogRecord;

/**
 * Monolog handler that records log entries as breadcrumbs.
 *
 * Can be used as a Laravel log channel to capture all logs
 * as breadcrumbs for error context.
 */
class ErrorExplorerLogHandler extends AbstractProcessingHandler
{
    public function __construct(
        int|string|Level $level = Level::Debug,
        bool $bubble = true,
    ) {
        parent::__construct($level, $bubble);
    }

    /**
     * Create handler for Laravel's logging config.
     *
     * @param array{level?: string, bubble?: bool} $config
     */
    public function __invoke(array $config): self
    {
        $level = $config['level'] ?? 'debug';
        $bubble = $config['bubble'] ?? true;

        return new self($level, $bubble);
    }

    protected function write(LogRecord $record): void
    {
        $message = $this->interpolateMessage($record->message, $record->context);

        BreadcrumbManager::add([
            'type' => 'log',
            'category' => $record->channel,
            'message' => $message,
            'level' => $this->mapLevel($record->level),
            'data' => array_merge(
                ['channel' => $record->channel],
                $this->sanitizeContext($record->context)
            ),
        ]);
    }

    /**
     * Interpolate {placeholders} in message with context values.
     *
     * @param array<string, mixed> $context
     */
    private function interpolateMessage(string $message, array $context): string
    {
        $replacements = [];

        foreach ($context as $key => $value) {
            if (is_scalar($value) || (is_object($value) && method_exists($value, '__toString'))) {
                $replacements['{' . $key . '}'] = (string) $value;
            }
        }

        return strtr($message, $replacements);
    }

    /**
     * Map Monolog level to our level.
     */
    private function mapLevel(Level $level): string
    {
        // Backend only accepts: debug, info, warning, error
        return match ($level) {
            Level::Emergency, Level::Alert, Level::Critical, Level::Error => 'error',
            Level::Warning => 'warning',
            Level::Notice, Level::Info => 'info',
            Level::Debug => 'debug',
        };
    }

    /**
     * Sanitize context to avoid large or circular objects.
     *
     * @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    private function sanitizeContext(array $context): array
    {
        $result = [];

        foreach ($context as $key => $value) {
            // Skip exception - it will be captured separately
            if ($key === 'exception' && $value instanceof \Throwable) {
                continue;
            }

            if (is_scalar($value) || is_null($value)) {
                $result[$key] = $value;
            } elseif (is_array($value)) {
                $result[$key] = '[array]';
            } elseif (is_object($value)) {
                $result[$key] = sprintf('[%s]', get_class($value));
            } else {
                $result[$key] = '[' . gettype($value) . ']';
            }
        }

        return $result;
    }
}
