<?php

namespace App\Http\Controllers;

use ErrorExplorer\Laravel\Facades\ErrorExplorer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TestController
{
    /**
     * Home page with test links.
     */
    public function index()
    {
        return view('home');
    }

    /**
     * Test basic exception capture.
     */
    public function exception()
    {
        Log::info('About to throw a test exception');

        throw new \RuntimeException('This is a test exception from Laravel!');
    }

    /**
     * Test with breadcrumbs.
     */
    public function breadcrumbs()
    {
        // Add some log entries (become breadcrumbs)
        Log::debug('Starting breadcrumb test');
        Log::info('User requested breadcrumb test page');
        Log::warning('This is a warning before the error');

        // Add custom breadcrumb
        ErrorExplorer::addBreadcrumb([
            'type' => 'user-action',
            'message' => 'User clicked test button',
            'data' => ['button_id' => 'test-breadcrumbs'],
        ]);

        // Simulate some processing
        usleep(100000); // 100ms

        throw new \Exception('Exception with breadcrumbs!');
    }

    /**
     * Test with user context.
     */
    public function userContext()
    {
        // Set user context
        ErrorExplorer::setUser([
            'id' => 'user_12345',
            'email' => 'test@example.com',
            'name' => 'John Doe',
            'plan' => 'enterprise',
        ]);

        // Set tags
        ErrorExplorer::setTags([
            'feature' => 'user-test',
            'version' => '2.0',
        ]);

        // Set extra context
        ErrorExplorer::setExtra([
            'session_id' => 'sess_abc123',
            'order_id' => 'order_789',
        ]);

        throw new \LogicException('Exception with full context!');
    }

    /**
     * Test manual capture.
     */
    public function manualCapture()
    {
        try {
            // Simulate risky operation
            $this->riskyOperation();
        } catch (\Exception $e) {
            // Capture manually
            $eventId = ErrorExplorer::captureException($e, [
                'tags' => ['caught' => 'manually'],
                'extra' => ['handled' => true],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Exception was captured manually',
                'event_id' => $eventId,
            ]);
        }
    }

    /**
     * Test message capture.
     */
    public function captureMessage()
    {
        $eventId = ErrorExplorer::captureMessage(
            'This is a test message from Laravel SDK',
            'warning'
        );

        return response()->json([
            'success' => true,
            'message' => 'Message was captured',
            'event_id' => $eventId,
        ]);
    }

    /**
     * Test PHP error (warning).
     */
    public function phpError()
    {
        // Trigger a PHP warning
        $array = [];
        echo $array['nonexistent'];
    }

    /**
     * Simulate a risky operation.
     */
    private function riskyOperation(): void
    {
        throw new \RuntimeException('This operation failed!');
    }
}
