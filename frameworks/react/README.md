# @error-explorer/react

Official Error Explorer SDK for React. Provides React-specific error handling with ErrorBoundary, hooks, and React Router integration.

## Features

- 🛡️ **ErrorBoundary** - Catch and report React component errors
- 🪝 **React Hooks** - `useErrorExplorer`, `useErrorHandler`, `useUserContext`
- 🔄 **React Router integration** - Automatic navigation breadcrumbs
- 📦 **HOC Support** - `withErrorBoundary` for wrapping components
- 🎯 **Context Provider** - Share SDK instance across your app
- 📝 **TypeScript** - Full type definitions included

## Installation

```bash
# npm
npm install @error-explorer/react

# yarn
yarn add @error-explorer/react

# pnpm
pnpm add @error-explorer/react
```

## Quick Start

### Option 1: Provider (Recommended)

```tsx
import { ErrorExplorerProvider, ErrorBoundary } from '@error-explorer/react';

function App() {
  return (
    <ErrorExplorerProvider
      options={{
        token: 'ee_your_project_token',
        project: 'my-react-app',
        environment: 'production',
      }}
    >
      <ErrorBoundary>
        <MainContent />
      </ErrorBoundary>
    </ErrorExplorerProvider>
  );
}
```

### Option 2: Direct Initialization

```tsx
import { initErrorExplorer, ErrorBoundary } from '@error-explorer/react';

// In your entry file (main.tsx or index.tsx)
initErrorExplorer({
  token: 'ee_your_project_token',
  project: 'my-react-app',
  environment: 'production',
});

function App() {
  return (
    <ErrorBoundary>
      <MainContent />
    </ErrorBoundary>
  );
}
```

## ErrorBoundary

Catch errors in component trees and report them to Error Explorer:

```tsx
import { ErrorBoundary } from '@error-explorer/react';

// Basic usage
<ErrorBoundary>
  <RiskyComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary
  fallback={<div>Something went wrong</div>}
>
  <RiskyComponent />
</ErrorBoundary>

// With render prop fallback
<ErrorBoundary
  fallback={({ error, resetErrorBoundary }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )}
>
  <RiskyComponent />
</ErrorBoundary>

// With callbacks and context
<ErrorBoundary
  onError={(error, errorInfo) => console.log('Caught:', error)}
  onReset={() => console.log('Reset')}
  tags={{ component: 'UserProfile' }}
  context={{ userId: '123' }}
>
  <UserProfile />
</ErrorBoundary>
```

### ErrorBoundary Props

| Prop | Type | Description |
|------|------|-------------|
| `children` | ReactNode | Components to wrap |
| `fallback` | ReactNode \| Function | UI to show on error |
| `onError` | Function | Called when error is caught |
| `onReset` | Function | Called when boundary resets |
| `capture` | boolean | Send to Error Explorer (default: true) |
| `tags` | Record<string, string> | Additional tags for filtering |
| `context` | Record<string, unknown> | Extra context data |
| `resetKeys` | unknown[] | Keys that trigger reset when changed |

## withErrorBoundary HOC

Wrap components with error boundary using HOC pattern:

```tsx
import { withErrorBoundary } from '@error-explorer/react';

const SafeComponent = withErrorBoundary(RiskyComponent, {
  fallback: <ErrorFallback />,
  onError: (error) => console.error(error),
  tags: { feature: 'checkout' },
});

// Use it like a normal component
<SafeComponent userId="123" />
```

## Hooks

### useErrorExplorer

Access SDK methods from any component:

```tsx
import { useErrorExplorer } from '@error-explorer/react';

function MyComponent() {
  const { captureException, addBreadcrumb, setUser } = useErrorExplorer();

  const handleClick = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      captureException(error, {
        tags: { action: 'risky_operation' },
      });
    }
  };

  return <button onClick={handleClick}>Do Something</button>;
}
```

### useErrorHandler

Simplified error handling for async operations:

```tsx
import { useErrorHandler } from '@error-explorer/react';

function MyComponent() {
  const { handleError, wrapAsync, tryCatch } = useErrorHandler({
    tags: { component: 'MyComponent' },
  });

  // Option 1: Wrap async function
  const safeSubmit = wrapAsync(async (data) => {
    await api.submit(data);
  });

  // Option 2: Manual handling
  const handleClick = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      handleError(error, { extra: { action: 'click' } });
    }
  };

  // Option 3: Sync try-catch wrapper
  const result = tryCatch(() => JSON.parse(data));

  return <button onClick={() => safeSubmit({ name: 'test' })}>Submit</button>;
}
```

### useUserContext

Manage user context with automatic cleanup:

```tsx
import { useUserContext } from '@error-explorer/react';

function App() {
  const currentUser = useAuth(); // Your auth hook

  // Automatically sets user context and clears on logout/unmount
  useUserContext(currentUser ? {
    id: currentUser.id,
    email: currentUser.email,
    name: currentUser.name,
    plan: currentUser.plan, // Custom fields allowed
  } : null);

  return <MainContent />;
}
```

### useActionTracker

Track user interactions as breadcrumbs:

```tsx
import { useActionTracker } from '@error-explorer/react';

function CheckoutForm() {
  const { trackAction, trackInteraction } = useActionTracker('CheckoutForm');

  const handleSubmit = () => {
    trackAction('checkout_submitted', { total: 149.99 });
    // ... submit logic
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        onFocus={() => trackInteraction('email-input', 'focus')}
        onBlur={() => trackInteraction('email-input', 'blur')}
      />
      <button onClick={() => trackInteraction('submit-button', 'click')}>
        Pay Now
      </button>
    </form>
  );
}
```

### useComponentBreadcrumbs

Track component lifecycle:

```tsx
import { useComponentBreadcrumbs } from '@error-explorer/react';

function UserDashboard() {
  // Adds breadcrumbs for mount/unmount
  useComponentBreadcrumbs('UserDashboard');

  return <div>Dashboard content</div>;
}
```

### useErrorBoundary

Programmatically trigger error boundary from functional components:

```tsx
import { ErrorBoundary, useErrorBoundary } from '@error-explorer/react';

function AsyncComponent() {
  const { showBoundary } = useErrorBoundary();

  const loadData = async () => {
    try {
      await fetchData();
    } catch (error) {
      showBoundary(error); // Triggers nearest ErrorBoundary
    }
  };

  return <button onClick={loadData}>Load Data</button>;
}

// Wrap with ErrorBoundary to catch the error
<ErrorBoundary>
  <AsyncComponent />
</ErrorBoundary>
```

## React Router Integration

Track navigation as breadcrumbs:

### Using the Hook (React Router v6+)

```tsx
import { useLocation } from 'react-router-dom';
import { useRouterBreadcrumbs } from '@error-explorer/react/router';

function App() {
  const location = useLocation();

  // Track navigation automatically
  useRouterBreadcrumbs(location, {
    trackQuery: false,  // Don't include query params (default)
    trackHash: false,   // Don't include hash (default)
  });

  return <Routes>{/* your routes */}</Routes>;
}
```

### Using the Router Subscriber

```tsx
import { createBrowserRouter } from 'react-router-dom';
import { createNavigationListener } from '@error-explorer/react/router';

const router = createBrowserRouter([/* routes */]);

// Subscribe to navigation
createNavigationListener(router);

// In your app
<RouterProvider router={router} />
```

### Using HOC

```tsx
import { BrowserRouter } from 'react-router-dom';
import { withRouterTracking } from '@error-explorer/react/router';

const TrackedRouter = withRouterTracking(BrowserRouter, {
  trackQuery: true,
});

function App() {
  return (
    <TrackedRouter>
      <Routes>{/* your routes */}</Routes>
    </TrackedRouter>
  );
}
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import {
  ErrorBoundary,
  ErrorExplorerProvider,
  useErrorExplorer,
  type ReactErrorExplorerOptions,
  type ErrorBoundaryProps,
  type FallbackProps,
  type ErrorExplorerContextValue,
} from '@error-explorer/react';

// All types are fully typed
const options: ReactErrorExplorerOptions = {
  token: 'ee_token',
  project: 'my-app',
  environment: 'production',
};
```

## Configuration

All configuration options from `@error-explorer/browser` are supported, plus React-specific options:

```tsx
<ErrorExplorerProvider
  options={{
    // Required
    token: 'ee_your_project_token',
    project: 'my-react-app',

    // Recommended
    environment: 'production',
    release: '1.0.0',

    // React-specific
    captureComponentStack: true, // Include React component stack (default: true)

    // Filtering
    ignoreErrors: [/ResizeObserver/],

    // Hooks
    beforeSend: (event) => {
      // Modify or filter events
      return event;
    },
  }}
>
  <App />
</ErrorExplorerProvider>
```

## Best Practices

1. **Wrap at the top level** - Add ErrorBoundary at your app's root
2. **Use multiple boundaries** - Add ErrorBoundaries around critical sections
3. **Set user context early** - Use `useUserContext` after authentication
4. **Track key actions** - Use `useActionTracker` for important user flows
5. **Use meaningful tags** - Add tags like `feature`, `component`, `action`

## Example: Complete Setup

```tsx
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import {
  ErrorExplorerProvider,
  ErrorBoundary,
} from '@error-explorer/react';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorExplorerProvider
      options={{
        token: import.meta.env.VITE_ERROR_EXPLORER_TOKEN,
        project: 'my-react-app',
        environment: import.meta.env.MODE,
        release: import.meta.env.VITE_APP_VERSION,
      }}
    >
      <ErrorBoundary
        fallback={({ error, resetErrorBoundary }) => (
          <div className="error-page">
            <h1>Oops! Something went wrong</h1>
            <p>{error.message}</p>
            <button onClick={resetErrorBoundary}>Try again</button>
          </div>
        )}
      >
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </ErrorExplorerProvider>
  </React.StrictMode>
);
```

## Related Packages

- `@error-explorer/browser` - Core browser SDK
- `@error-explorer/vue` - Vue.js SDK
- `@error-explorer/node` - Node.js SDK

## License

MIT
