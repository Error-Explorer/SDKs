/**
 * Error Explorer Node.js SDK - Standalone Error Test
 *
 * This script demonstrates error capture without Express.
 */

import { ErrorExplorer } from '@error-explorer/node';

// Initialize Error Explorer
ErrorExplorer.init({
  // Use token + endpoint format for environments where hostname DNS isn't configured
  token: 'ee_ea13238616f6fb1dffca3fb3ab6edfe6a8846a9ad456a5b5110f574809cc',
  endpoint: 'http://error-explorer.localhost/api/v1/webhook',
  hmacSecret: '05b9794c79bb49f330a7cb51bfeb4e2fc06ab37255646bca9f84b7bd8b9251a9',
  environment: 'development',
  release: '1.0.0',
  serverName: 'test-script',
  debug: true,
  exitOnUncaughtException: false,
});

console.log('Error Explorer initialized');

// Set user context (id should be a valid UUID or positive integer)
ErrorExplorer.setUser({
  id: '12345',  // Use numeric string or UUID
  email: 'test@example.com',
  name: 'Test User',
  role: 'developer',
});

// Set global tags
ErrorExplorer.setTags({
  script: 'test-errors',
  type: 'manual-test',
});

async function runTests() {
  console.log('\n--- Running Error Tests ---\n');

  // Test 1: Manual exception capture
  console.log('1. Testing manual exception capture...');
  try {
    throw new TypeError('This is a TypeError for testing');
  } catch (error) {
    const eventId = ErrorExplorer.captureException(error, {
      tags: { test: 'manual-capture' },
      extra: { testNumber: 1 },
    });
    console.log(`   Captured with event ID: ${eventId}`);
  }

  // Wait a bit for the request to complete
  await sleep(1000);

  // Test 2: Capture message
  console.log('\n2. Testing message capture...');
  const messageId = ErrorExplorer.captureMessage('Test warning message', 'warning');
  console.log(`   Captured with event ID: ${messageId}`);

  await sleep(1000);

  // Test 3: Error with custom context
  console.log('\n3. Testing error with custom context...');
  try {
    throw new RangeError('Value out of range');
  } catch (error) {
    ErrorExplorer.setContext('custom', {
      minValue: 0,
      maxValue: 100,
      actualValue: 150,
    });

    const eventId = ErrorExplorer.captureException(error, {
      level: 'error',
      fingerprint: ['custom-range-error'],
    });
    console.log(`   Captured with event ID: ${eventId}`);
  }

  await sleep(1000);

  // Test 4: Breadcrumbs
  console.log('\n4. Testing breadcrumbs...');
  ErrorExplorer.addBreadcrumb({
    type: 'custom',
    category: 'init',
    message: 'Application started',
    level: 'info',
  });

  ErrorExplorer.addBreadcrumb({
    type: 'query',
    category: 'database',
    message: 'Connected to database',
    level: 'info',
    data: { host: 'localhost', database: 'test' },
  });

  ErrorExplorer.addBreadcrumb({
    type: 'http',
    category: 'api',
    message: 'Fetched user data',
    level: 'info',
    data: { endpoint: '/api/users', status: 200 },
  });

  try {
    throw new Error('Error after breadcrumbs');
  } catch (error) {
    const eventId = ErrorExplorer.captureException(error);
    console.log(`   Captured with event ID: ${eventId}`);
    console.log('   (Check the event in Error Explorer - it should have 3 breadcrumbs)');
  }

  await sleep(1000);

  // Test 5: Different error types
  console.log('\n5. Testing different error types...');

  const errorTypes = [
    new SyntaxError('Invalid syntax'),
    new ReferenceError('Variable not defined'),
    new URIError('Invalid URI'),
    new EvalError('Eval error'),
  ];

  for (const error of errorTypes) {
    ErrorExplorer.captureException(error, {
      tags: { errorType: error.name },
    });
    console.log(`   Captured ${error.name}`);
    await sleep(500);
  }

  // Flush and wait
  console.log('\n--- Flushing pending events ---');
  await ErrorExplorer.flush(5000);

  console.log('\n--- All tests completed ---');
  console.log('Check Error Explorer dashboard for the captured events.\n');

  // Close SDK
  await ErrorExplorer.close();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests
runTests().catch(console.error);
