# Error Explorer Node.js SDK Example

This example demonstrates how to integrate `@error-explorer/node` with an Express.js application.

## Installation

```bash
npm install
```

## Configuration

Update the credentials in `server.js` and `test-errors.js`:

```javascript
ErrorExplorer.init({
  token: 'ee_your_token_here',
  endpoint: 'http://your-error-explorer-instance/api/v1/webhook',
  hmacSecret: 'your_hmac_secret',  // Optional but recommended
  environment: 'development',
  release: '1.0.0',
});
```

## Running the Express Server

```bash
npm start
```

The server will start on http://localhost:3001

### Available Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Help message with all endpoints |
| `GET /api/success` | Successful API call |
| `GET /api/error` | Trigger a caught error (manual capture) |
| `GET /api/uncaught` | Trigger an uncaught error |
| `GET /api/async-error` | Trigger an async error |
| `GET /api/rejection` | Trigger an unhandled promise rejection |
| `GET /api/custom` | Send a custom event/message |
| `GET /api/breadcrumbs` | Demonstrate breadcrumbs |

## Running Standalone Tests

```bash
npm run test:errors
```

This script demonstrates error capture without Express:
- Manual exception capture
- Message capture
- Custom context
- Breadcrumbs
- Different error types

## SDK Features Demonstrated

### Express Middleware

```javascript
import { requestHandler, errorHandler } from '@error-explorer/node';

// Add as first middleware
app.use(requestHandler({
  extractUser: (req) => ({ id: req.user?.id }),
  breadcrumbs: true,
}));

// Add as last middleware (before 404)
app.use(errorHandler());
```

### Manual Capture

```javascript
import { ErrorExplorer } from '@error-explorer/node';

// Capture exception
ErrorExplorer.captureException(error, {
  tags: { module: 'api' },
  extra: { requestId: '123' },
});

// Capture message
ErrorExplorer.captureMessage('Something happened', 'warning');
```

### User Context

```javascript
ErrorExplorer.setUser({
  id: '12345',
  email: 'user@example.com',
  name: 'John Doe',
});
```

### Breadcrumbs

```javascript
ErrorExplorer.addBreadcrumb({
  type: 'http',
  category: 'api',
  message: 'GET /api/users',
  level: 'info',
  data: { status: 200 },
});
```

### Tags and Extra Data

```javascript
ErrorExplorer.setTag('version', '1.0.0');
ErrorExplorer.setTags({ service: 'api', team: 'backend' });
ErrorExplorer.setExtra('debug', { key: 'value' });
```
