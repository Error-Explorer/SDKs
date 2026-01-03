# @error-explorer/browser

Official Error Explorer SDK for Browser. Automatically captures errors, unhandled promise rejections, and provides detailed context through breadcrumbs.

## Features

- 🔄 **Automatic error capture** - `window.onerror`, unhandled promise rejections
- 🍞 **Breadcrumbs** - Track clicks, navigation, network requests, console logs
- 🧑 **User context** - Associate errors with user information
- 📦 **Offline support** - Queue events when offline, send when back online
- 🔒 **Data scrubbing** - Automatically filter sensitive data (passwords, tokens, etc.)
- ⚡ **Non-blocking** - Uses `sendBeacon` and `fetch` with keepalive
- 🎯 **Small footprint** - < 10KB gzipped

## Installation

```bash
# npm
npm install @error-explorer/browser

# yarn
yarn add @error-explorer/browser

# pnpm
pnpm add @error-explorer/browser
```

## Quick Start

```javascript
import ErrorExplorer from '@error-explorer/browser';

// Initialize (1 line!)
ErrorExplorer.init({
  token: 'ee_your_project_token',
  environment: 'production',
  release: '1.0.0',
});

// That's it! Errors are now captured automatically.
```

## CDN Usage

```html
<script src="https://cdn.error-explorer.com/sdk.min.js"></script>
<script>
  ErrorExplorer.init({
    token: 'ee_your_project_token',
    environment: 'production',
  });
</script>
```

## Configuration

```javascript
ErrorExplorer.init({
  // Required
  token: 'ee_your_project_token',

  // Recommended
  environment: 'production',  // or 'staging', 'development'
  release: '1.2.3',           // Your app version

  // Auto capture (all true by default)
  autoCapture: {
    errors: true,              // window.onerror
    unhandledRejections: true, // Promise rejections
    console: true,             // console.error
  },

  // Breadcrumbs (all true by default except inputs)
  breadcrumbs: {
    enabled: true,
    maxBreadcrumbs: 20,
    clicks: true,              // Click events
    navigation: true,          // Route changes
    fetch: true,               // Fetch requests
    xhr: true,                 // XMLHttpRequest
    console: true,             // Console logs
    inputs: false,             // Input focus (privacy)
  },

  // Filtering
  ignoreErrors: [/ResizeObserver/],
  denyUrls: [/chrome-extension/],
  allowUrls: [],               // If set, only these URLs

  // Hooks
  beforeSend: (event) => {
    // Modify or filter events
    if (event.message.includes('ignore')) {
      return null; // Drop event
    }
    return event;
  },

  // Transport
  maxRetries: 3,
  timeout: 5000,
  offline: true,              // Queue when offline

  // Debug
  debug: false,
});
```

## Manual Capture

```javascript
// Capture an exception
try {
  riskyOperation();
} catch (error) {
  ErrorExplorer.captureException(error, {
    tags: { feature: 'checkout' },
    extra: { orderId: '12345' },
  });
}

// Capture a message
ErrorExplorer.captureMessage('User completed onboarding', 'info');
```

## User Context

```javascript
// Set user (after login)
ErrorExplorer.setUser({
  id: 'user_123',
  email: 'john@example.com',
  name: 'John Doe',
  plan: 'pro', // Custom fields allowed
});

// Clear user (after logout)
ErrorExplorer.clearUser();
```

## Tags & Extra Data

```javascript
// Set tags (for filtering in dashboard)
ErrorExplorer.setTags({
  feature: 'checkout',
  ab_test: 'variant_b',
});

// Set a single tag
ErrorExplorer.setTag('version', '2.0');

// Set extra data (appears in error details)
ErrorExplorer.setExtra({
  cartTotal: 149.99,
  itemCount: 3,
});

// Set a named context
ErrorExplorer.setContext('cart', {
  items: ['SKU-1', 'SKU-2'],
  total: 149.99,
});
```

## Manual Breadcrumbs

```javascript
// Add a custom breadcrumb
ErrorExplorer.addBreadcrumb({
  type: 'user-action',
  category: 'ui',
  message: 'User clicked "Add to Cart"',
  level: 'info',
  data: {
    productId: 'SKU-123',
    price: 29.99,
  },
});
```

## Automatic Breadcrumbs

The SDK automatically captures:

| Type | Data |
|------|------|
| `click` | Element tag, id, classes, text |
| `navigation` | From URL, To URL, navigation type |
| `fetch` | Method, URL, status, duration |
| `xhr` | Method, URL, status, duration |
| `console` | Level, message |
| `input` | Element type, name (never the value!) |

## Flushing & Cleanup

```javascript
// Flush pending events (before page unload)
await ErrorExplorer.flush(5000); // 5s timeout

// Close SDK and cleanup
await ErrorExplorer.close();
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import ErrorExplorer, {
  InitOptions,
  UserContext,
  Breadcrumb,
  CaptureContext,
  SeverityLevel,
} from '@error-explorer/browser';

const user: UserContext = {
  id: '123',
  email: 'user@example.com',
};

ErrorExplorer.setUser(user);
```

## Framework Integrations

For framework-specific features, use our dedicated packages:

- **React**: `@error-explorer/react` - ErrorBoundary, hooks
- **Vue**: `@error-explorer/vue` - Plugin, composables
- **Angular**: `@error-explorer/angular` - Module, ErrorHandler
- **Next.js**: `@error-explorer/nextjs` - App Router support

## Privacy & Security

- **No PII by default**: Input values are never captured
- **Data scrubbing**: Passwords, tokens, API keys are automatically filtered
- **Configurable**: Add custom scrub fields via configuration
- **GDPR friendly**: User consent can be managed via `beforeSend`

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## License

MIT
