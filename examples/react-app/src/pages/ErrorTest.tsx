/**
 * Error Test Page - Various error scenarios for testing
 */

import { useState } from 'react';
import {
  useErrorExplorer,
  useErrorHandler,
  useActionTracker,
  useComponentBreadcrumbs,
  ErrorBoundary,
  useErrorBoundary,
} from '@error-explorer/react';

// Component that will throw an error
function BuggyComponent() {
  throw new Error('This is a render error from BuggyComponent');
}

// Component that throws on button click
function ErrorButton({ message }: { message: string }) {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error(message);
  }

  return (
    <button
      className="btn-error"
      onClick={() => setShouldThrow(true)}
    >
      Throw Render Error
    </button>
  );
}

function ErrorTest() {
  useComponentBreadcrumbs('ErrorTest');

  const { captureException, captureMessage, addBreadcrumb, setTag } = useErrorExplorer();
  const { handleError, wrapAsync } = useErrorHandler({ tags: { page: 'error-test' } });
  const { trackAction } = useActionTracker('ErrorTest');
  const { showBoundary } = useErrorBoundary();

  const [logs, setLogs] = useState<string[]>([]);
  const [showBuggy, setShowBuggy] = useState(false);

  const log = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  // Manual error capture
  const handleManualError = () => {
    trackAction('manual_error_capture');
    try {
      throw new Error('This is a manually captured error');
    } catch (error) {
      const eventId = captureException(error as Error, {
        tags: { source: 'manual' },
        extra: { testData: 'some extra info' },
      });
      log(`Captured error with ID: ${eventId}`);
    }
  };

  // Async error
  const handleAsyncError = async () => {
    trackAction('async_error_test');
    const safeAsync = wrapAsync(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      throw new Error('This is an asynchronous error from React component');
    });

    await safeAsync();
    log('Async error captured via wrapAsync');
  };

  // Unhandled promise rejection
  const handleUnhandledRejection = () => {
    trackAction('unhandled_rejection_test');
    Promise.reject(new Error('This is an unhandled promise rejection'));
    log('Unhandled rejection triggered');
  };

  // TypeError simulation
  const handleTypeError = () => {
    trackAction('type_error_test');
    try {
      const obj: any = null;
      obj.property.value; // This will throw TypeError
    } catch (error) {
      handleError(error, { tags: { errorType: 'TypeError' } });
      log('TypeError captured via handleError');
    }
  };

  // Capture a message
  const handleCaptureMessage = () => {
    trackAction('capture_message');
    const eventId = captureMessage('This is an info message from React', 'info');
    log(`Captured message with ID: ${eventId}`);
  };

  // Add breadcrumb
  const handleAddBreadcrumb = () => {
    addBreadcrumb({
      type: 'user-action',
      category: 'test',
      message: 'User clicked add breadcrumb button',
      level: 'info',
      data: { timestamp: new Date().toISOString() },
    });
    log('Breadcrumb added');
  };

  // Set tag
  const handleSetTag = () => {
    const tagValue = `test-${Date.now()}`;
    setTag('customTag', tagValue);
    log(`Tag set: customTag = ${tagValue}`);
  };

  // Trigger error boundary via hook
  const handleTriggerBoundary = () => {
    trackAction('trigger_boundary');
    showBoundary(new Error('Error triggered via useErrorBoundary hook'));
  };

  // Reset logs
  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="error-test">
      <h2>Error Testing Page</h2>
      <p>Test various error scenarios and see how Error Explorer captures them.</p>

      <div className="section">
        <h3>Manual Error Capture</h3>
        <div className="button-group">
          <button className="btn-error" onClick={handleManualError}>
            Capture Exception
          </button>
          <button className="btn-warning" onClick={handleCaptureMessage}>
            Capture Message
          </button>
          <button className="btn-info" onClick={handleAddBreadcrumb}>
            Add Breadcrumb
          </button>
          <button className="btn-info" onClick={handleSetTag}>
            Set Tag
          </button>
        </div>
      </div>

      <div className="section">
        <h3>Automatic Error Capture</h3>
        <div className="button-group">
          <button className="btn-error" onClick={handleAsyncError}>
            Async Error (wrapAsync)
          </button>
          <button className="btn-error" onClick={handleUnhandledRejection}>
            Unhandled Rejection
          </button>
          <button className="btn-error" onClick={handleTypeError}>
            TypeError
          </button>
        </div>
      </div>

      <div className="section">
        <h3>Error Boundary Tests</h3>
        <div className="button-group">
          <button className="btn-error" onClick={handleTriggerBoundary}>
            Trigger via Hook
          </button>
          <button
            className="btn-error"
            onClick={() => setShowBuggy(true)}
          >
            Show Buggy Component
          </button>
        </div>

        {/* Nested Error Boundary for isolated testing */}
        <div style={{ marginTop: '15px' }}>
          <ErrorBoundary
            fallback={({ error, resetErrorBoundary }) => (
              <div style={{
                padding: '15px',
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '4px'
              }}>
                <strong>Caught in nested boundary:</strong>
                <p>{error.message}</p>
                <button className="btn-warning" onClick={resetErrorBoundary}>
                  Reset
                </button>
              </div>
            )}
            onReset={() => setShowBuggy(false)}
          >
            {showBuggy && <BuggyComponent />}
            <ErrorButton message="Render error from ErrorButton" />
          </ErrorBoundary>
        </div>
      </div>

      <div className="section">
        <h3>Activity Log</h3>
        <button className="btn-info" onClick={handleClearLogs} style={{ marginBottom: '10px' }}>
          Clear Logs
        </button>
        <div className="log-area">
          {logs.length === 0 ? (
            <div className="log-entry">No activity yet. Try triggering some errors!</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="log-entry">{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ErrorTest;
