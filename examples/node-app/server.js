/**
 * Error Explorer Node.js SDK - Express Example Server
 *
 * This example demonstrates how to integrate @error-explorer/node
 * with an Express.js application.
 */

import express from 'express';
import { ErrorExplorer, requestHandler, errorHandler } from '@error-explorer/node';

// Initialize Error Explorer
ErrorExplorer.init({
  // DSN format: token@endpoint
  // Note: Use 127.0.0.1 or add error-explorer.localhost to /etc/hosts
  dsn: 'http://ee_ea13238616f6fb1dffca3fb3ab6edfe6a8846a9ad456a5b5110f574809cc@127.0.0.1/api/v1/webhook',

  // HMAC secret for signing requests (optional but recommended)
  hmacSecret: '05b9794c79bb49f330a7cb51bfeb4e2fc06ab37255646bca9f84b7bd8b9251a9',

  // Environment and release info
  environment: 'development',
  release: '1.0.0',
  serverName: 'node-example-server',

  // Debug mode for verbose logging
  debug: true,

  // Don't exit on uncaught exceptions in development
  exitOnUncaughtException: false,

  // Configure breadcrumbs
  breadcrumbs: {
    enabled: true,
    maxBreadcrumbs: 50,
    http: true,
    console: true,
  },
});

// Set global tags
ErrorExplorer.setTags({
  service: 'node-example',
  team: 'backend',
});

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());

// Add Error Explorer request handler (first middleware)
app.use(requestHandler({
  // Extract user from request (e.g., from session or JWT)
  extractUser: (req) => {
    // In a real app, you'd get this from authentication
    return {
      id: 'user_123',
      email: 'demo@example.com',
      name: 'Demo User',
    };
  },
  // Enable request/response breadcrumbs
  breadcrumbs: true,
}));

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Error Explorer Node.js SDK Example',
    endpoints: {
      '/': 'This help message',
      '/api/success': 'Successful API call',
      '/api/error': 'Trigger a caught error',
      '/api/uncaught': 'Trigger an uncaught error',
      '/api/async-error': 'Trigger an async error',
      '/api/rejection': 'Trigger an unhandled promise rejection',
      '/api/custom': 'Send a custom event',
      '/api/breadcrumbs': 'Demonstrate breadcrumbs',
    },
  });
});

// Successful API call
app.get('/api/success', (req, res) => {
  console.log('Processing successful request');
  res.json({ success: true, message: 'Everything is working!' });
});

// Caught error (manual capture)
app.get('/api/error', (req, res) => {
  try {
    throw new Error('This is a caught error for testing');
  } catch (error) {
    // Manually capture the error
    ErrorExplorer.captureException(error, {
      tags: { route: '/api/error' },
      extra: { requestId: req.headers['x-request-id'] },
    });

    res.status(500).json({
      success: false,
      error: 'Error captured and sent to Error Explorer',
    });
  }
});

// Uncaught error (will be caught by error middleware)
app.get('/api/uncaught', (req, res) => {
  // Add breadcrumb before error
  ErrorExplorer.addBreadcrumb({
    type: 'custom',
    category: 'api',
    message: 'About to trigger uncaught error',
    level: 'warning',
  });

  throw new Error('This is an uncaught error!');
});

// Async error
app.get('/api/async-error', async (req, res) => {
  console.log('Starting async operation...');

  // Simulate async work
  await new Promise(resolve => setTimeout(resolve, 100));

  // Throw error in async context
  throw new Error('Async operation failed!');
});

// Unhandled promise rejection
app.get('/api/rejection', (req, res) => {
  // Create a rejected promise without handling it
  new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('Unhandled promise rejection!'));
    }, 100);
  });

  res.json({
    message: 'Promise rejection will occur in 100ms',
  });
});

// Custom event/message
app.get('/api/custom', (req, res) => {
  // Capture a custom message
  ErrorExplorer.captureMessage('Custom event from API', 'info');

  // Set custom context
  ErrorExplorer.setContext('api', {
    endpoint: '/api/custom',
    version: 'v1',
  });

  res.json({
    success: true,
    message: 'Custom event sent to Error Explorer',
  });
});

// Breadcrumbs demonstration
app.get('/api/breadcrumbs', async (req, res) => {
  // Add various breadcrumbs
  ErrorExplorer.addBreadcrumb({
    type: 'custom',
    category: 'auth',
    message: 'User authenticated',
    level: 'info',
    data: { userId: 'user_123' },
  });

  ErrorExplorer.addBreadcrumb({
    type: 'query',
    category: 'database',
    message: 'SELECT * FROM users WHERE id = ?',
    level: 'info',
    data: { params: ['user_123'], duration_ms: 15 },
  });

  ErrorExplorer.addBreadcrumb({
    type: 'http',
    category: 'external_api',
    message: 'GET https://api.example.com/data',
    level: 'info',
    data: { status: 200, duration_ms: 250 },
  });

  // Now trigger an error to see the breadcrumbs
  throw new Error('Error with breadcrumb trail');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Add Error Explorer error handler (last middleware before 404)
app.use(errorHandler({
  // Continue to next error handler after capturing
  callNext: true,
}));

// Final error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    error: err.message,
    message: 'Error has been reported to Error Explorer',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Error Explorer Node.js SDK Example                ║
╠══════════════════════════════════════════════════════════════╣
║  Server running at http://localhost:${PORT}                   ║
║                                                              ║
║  Try these endpoints:                                        ║
║  - GET /                    Show help                        ║
║  - GET /api/success        Successful request                ║
║  - GET /api/error          Trigger caught error              ║
║  - GET /api/uncaught       Trigger uncaught error            ║
║  - GET /api/async-error    Trigger async error               ║
║  - GET /api/rejection      Trigger promise rejection         ║
║  - GET /api/custom         Send custom event                 ║
║  - GET /api/breadcrumbs    Demo breadcrumbs                  ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
