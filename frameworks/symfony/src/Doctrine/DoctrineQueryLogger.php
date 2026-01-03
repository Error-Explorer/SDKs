<?php

declare(strict_types=1);

namespace ErrorExplorer\Symfony\Doctrine;

use Doctrine\DBAL\Driver as DriverInterface;
use Doctrine\DBAL\Driver\Middleware as MiddlewareInterface;
use ErrorExplorer\Breadcrumbs\BreadcrumbManager;

/**
 * Doctrine middleware that logs SQL queries as breadcrumbs.
 */
final class DoctrineQueryLogger implements MiddlewareInterface
{
    public function wrap(DriverInterface $driver): DriverInterface
    {
        return new LoggingDriver($driver);
    }
}

/**
 * @internal
 */
final class LoggingDriver implements DriverInterface
{
    public function __construct(
        private readonly DriverInterface $driver,
    ) {
    }

    public function connect(array $params): \Doctrine\DBAL\Driver\Connection
    {
        return new LoggingConnection($this->driver->connect($params));
    }

    public function getDatabasePlatform(): \Doctrine\DBAL\Platforms\AbstractPlatform
    {
        return $this->driver->getDatabasePlatform();
    }

    public function getSchemaManager(\Doctrine\DBAL\Connection $conn, \Doctrine\DBAL\Platforms\AbstractPlatform $platform): \Doctrine\DBAL\Schema\AbstractSchemaManager
    {
        return $this->driver->getSchemaManager($conn, $platform);
    }

    public function getExceptionConverter(): \Doctrine\DBAL\Driver\API\ExceptionConverter
    {
        return $this->driver->getExceptionConverter();
    }
}

/**
 * @internal
 */
final class LoggingConnection implements \Doctrine\DBAL\Driver\Connection
{
    public function __construct(
        private readonly \Doctrine\DBAL\Driver\Connection $connection,
    ) {
    }

    public function prepare(string $sql): \Doctrine\DBAL\Driver\Statement
    {
        return new LoggingStatement($this->connection->prepare($sql), $sql);
    }

    public function query(string $sql): \Doctrine\DBAL\Driver\Result
    {
        $start = microtime(true);
        $result = $this->connection->query($sql);
        $duration = microtime(true) - $start;

        self::logQuery($sql, $duration);

        return $result;
    }

    public function quote(string $value): string
    {
        return $this->connection->quote($value);
    }

    public function exec(string $sql): int|string
    {
        $start = microtime(true);
        $result = $this->connection->exec($sql);
        $duration = microtime(true) - $start;

        self::logQuery($sql, $duration);

        return $result;
    }

    public function lastInsertId(): int|string
    {
        return $this->connection->lastInsertId();
    }

    public function beginTransaction(): void
    {
        $this->connection->beginTransaction();
    }

    public function commit(): void
    {
        $this->connection->commit();
    }

    public function rollBack(): void
    {
        $this->connection->rollBack();
    }

    public function getServerVersion(): string
    {
        return $this->connection->getServerVersion();
    }

    public function getNativeConnection(): mixed
    {
        return $this->connection->getNativeConnection();
    }

    public static function logQuery(string $sql, float $duration): void
    {
        // Truncate long queries for display
        $message = strlen($sql) > 80 ? substr($sql, 0, 80) . '...' : $sql;

        BreadcrumbManager::add([
            'type' => 'query',
            'category' => 'db.query',
            'message' => $message,
            'level' => 'info',
            'data' => [
                'sql' => $sql,
                'duration_ms' => round($duration * 1000, 2),
            ],
        ]);
    }
}

/**
 * @internal
 */
final class LoggingStatement implements \Doctrine\DBAL\Driver\Statement
{
    public function __construct(
        private readonly \Doctrine\DBAL\Driver\Statement $statement,
        private readonly string $sql,
    ) {
    }

    public function bindValue(int|string $param, mixed $value, int $type = \Doctrine\DBAL\ParameterType::STRING): void
    {
        $this->statement->bindValue($param, $value, $type);
    }

    public function execute(): \Doctrine\DBAL\Driver\Result
    {
        $start = microtime(true);
        $result = $this->statement->execute();
        $duration = microtime(true) - $start;

        LoggingConnection::logQuery($this->sql, $duration);

        return $result;
    }
}
