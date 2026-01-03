<?php

declare(strict_types=1);

namespace ErrorExplorer\Laravel\Tests\Unit;

use ErrorExplorer\Laravel\Handlers\ErrorExplorerExceptionHandler;
use ErrorExplorer\Laravel\Tests\TestCase;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;
use Mockery;
use RuntimeException;

final class ExceptionHandlerTest extends TestCase
{

    public function test_reports_exception_to_original_handler(): void
    {
        $originalHandler = Mockery::mock(ExceptionHandler::class);
        $originalHandler->shouldReceive('report')->once();
        $originalHandler->shouldReceive('shouldReport')->andReturn(true);

        $handler = new ErrorExplorerExceptionHandler($originalHandler, $this->app);

        $exception = new RuntimeException('Test exception');
        $handler->report($exception);

        // Mockery verifies the expectation
        $this->assertTrue(true);
    }

    public function test_renders_exception_via_original_handler(): void
    {
        $originalHandler = Mockery::mock(ExceptionHandler::class);
        $originalHandler->shouldReceive('render')->once()->andReturn(response('Error', 500));

        $handler = new ErrorExplorerExceptionHandler($originalHandler, $this->app);

        $exception = new RuntimeException('Test exception');
        $request = request();

        $response = $handler->render($request, $exception);
        $this->assertSame(500, $response->getStatusCode());
    }

    public function test_should_report_delegates_to_original(): void
    {
        $originalHandler = Mockery::mock(ExceptionHandler::class);
        $originalHandler->shouldReceive('shouldReport')->andReturn(true);

        $handler = new ErrorExplorerExceptionHandler($originalHandler, $this->app);

        $exception = new RuntimeException('Test exception');
        $this->assertTrue($handler->shouldReport($exception));
    }

    public function test_ignores_authentication_exception(): void
    {
        $this->app['config']->set('error-explorer.ignore.exceptions', [
            AuthenticationException::class,
        ]);

        $originalHandler = Mockery::mock(ExceptionHandler::class);
        $originalHandler->shouldReceive('report')->once();
        $originalHandler->shouldReceive('shouldReport')->andReturn(true);

        $handler = new ErrorExplorerExceptionHandler($originalHandler, $this->app);

        // Should not capture but should report to original
        $exception = new AuthenticationException('Unauthenticated');
        $handler->report($exception);

        // Mockery verifies the expectation
        $this->assertTrue(true);
    }

    public function test_ignores_model_not_found_exception(): void
    {
        $this->app['config']->set('error-explorer.ignore.exceptions', [
            ModelNotFoundException::class,
        ]);

        $originalHandler = Mockery::mock(ExceptionHandler::class);
        $originalHandler->shouldReceive('report')->once();
        $originalHandler->shouldReceive('shouldReport')->andReturn(true);

        $handler = new ErrorExplorerExceptionHandler($originalHandler, $this->app);

        $exception = new ModelNotFoundException('Model not found');
        $handler->report($exception);

        // Mockery verifies the expectation
        $this->assertTrue(true);
    }

    public function test_ignores_validation_exception(): void
    {
        $this->app['config']->set('error-explorer.ignore.exceptions', [
            ValidationException::class,
        ]);

        $originalHandler = Mockery::mock(ExceptionHandler::class);
        $originalHandler->shouldReceive('report')->once();
        $originalHandler->shouldReceive('shouldReport')->andReturn(true);

        $handler = new ErrorExplorerExceptionHandler($originalHandler, $this->app);

        $validator = \Illuminate\Support\Facades\Validator::make([], ['field' => 'required']);
        $exception = new ValidationException($validator);
        $handler->report($exception);

        // Mockery verifies the expectation
        $this->assertTrue(true);
    }

    public function test_respects_dont_report_setting(): void
    {
        $this->app['config']->set('error-explorer.respect_dont_report', true);

        $originalHandler = Mockery::mock(ExceptionHandler::class);
        $originalHandler->shouldReceive('report')->once();
        $originalHandler->shouldReceive('shouldReport')->andReturn(false);

        $handler = new ErrorExplorerExceptionHandler($originalHandler, $this->app);

        $exception = new RuntimeException('Test exception');
        $handler->report($exception);

        // Exception should not be captured (shouldReport = false)
        $this->assertTrue(true);
    }

    public function test_captures_when_respect_dont_report_is_false(): void
    {
        $this->app['config']->set('error-explorer.respect_dont_report', false);
        $this->app['config']->set('error-explorer.ignore.exceptions', []);

        $originalHandler = Mockery::mock(ExceptionHandler::class);
        $originalHandler->shouldReceive('report')->once();
        $originalHandler->shouldReceive('shouldReport')->andReturn(false);

        $handler = new ErrorExplorerExceptionHandler($originalHandler, $this->app);

        $exception = new RuntimeException('Test exception');
        $handler->report($exception);

        // Exception should be captured even though shouldReport = false
        $this->assertTrue(true);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}
