# Vue App Example - Error Explorer

This example demonstrates how to integrate the Error Explorer SDK with a Vue 3 application.

## Features Demonstrated

- **Vue Plugin**: Automatic error capturing through Vue's `errorHandler` and `warnHandler`
- **Vue Router Integration**: Navigation breadcrumbs for route changes
- **ErrorBoundary Component**: Catch and handle errors in component subtrees
- **Composables**: Composition API hooks for error tracking
  - `useErrorExplorer()` - Access ErrorExplorer methods
  - `useErrorHandler()` - Handle errors with wrapAsync and tryCatch
  - `useActionTracker()` - Track user actions as breadcrumbs
  - `useComponentBreadcrumbs()` - Track component lifecycle
  - `useUserContext()` - Set user context reactively

## Getting Started

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at http://localhost:3002

### Test Error Tracking

Visit the "Error Test" page to trigger various types of errors and see them captured by Error Explorer.

## Project Structure

```
src/
  main.ts           # App entry point with Error Explorer setup
  router.ts         # Vue Router configuration
  App.vue           # Main app component
  views/
    Home.vue        # Home page with feature list
    About.vue       # About page
    ErrorTest.vue   # Error testing page with various error triggers
```

## Configuration

The Error Explorer plugin is initialized in `main.ts`:

```typescript
import { createErrorExplorerPlugin, setupRouterIntegration } from '@error-explorer/vue';

app.use(createErrorExplorerPlugin({
  token: 'your_token',
  environment: 'development',
  release: '1.0.0',
  vueErrorHandler: true,
  vueWarnHandler: true,
}));

// Setup router integration
setupRouterIntegration(router, {
  trackNavigation: true,
  trackParams: false,
});
```

## Error Scenarios

The Error Test page demonstrates:

1. **Sync Error**: Triggered manually and captured with `handleError()`
2. **Async Error**: Wrapped with `wrapAsync()` for automatic capture
3. **Network Error**: Failed fetch request captured with `captureException()`
4. **TypeError**: Caught with `tryCatch()` helper
5. **Custom Message**: Sent with `captureMessage()`
6. **ErrorBoundary**: Component-level error catching with fallback UI
