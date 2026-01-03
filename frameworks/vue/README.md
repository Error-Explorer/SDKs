# @error-explorer/vue

Error Explorer SDK for Vue.js 3 - Automatic error tracking with Vue integration.

## Features

- **Automatic Error Capture**: Hooks into Vue's `errorHandler` and `warnHandler`
- **Vue Router Integration**: Automatic navigation breadcrumbs
- **ErrorBoundary Component**: Catch and handle errors in component trees
- **Composables**: Vue 3 Composition API hooks for easy integration
- **TypeScript Support**: Full type definitions included

## Installation

```bash
npm install @error-explorer/vue @error-explorer/browser
```

## Quick Start

### Plugin Setup

```typescript
// main.ts
import { createApp } from 'vue';
import { createErrorExplorerPlugin } from '@error-explorer/vue';
import App from './App.vue';

const app = createApp(App);

app.use(createErrorExplorerPlugin({
  token: 'ee_your_token_here',
  environment: 'production',
  release: '1.0.0',
}));

app.mount('#app');
```

### With Vue Router

```typescript
// main.ts
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createErrorExplorerPlugin, setupRouterIntegration } from '@error-explorer/vue';
import App from './App.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [/* ... */],
});

const app = createApp(App);

// Initialize Error Explorer
app.use(createErrorExplorerPlugin({
  token: 'ee_your_token_here',
  environment: 'production',
}));

// Setup router integration
app.use(router);
setupRouterIntegration(router);

app.mount('#app');
```

## ErrorBoundary Component

Catch errors in a component subtree:

```vue
<script setup lang="ts">
import { ErrorBoundary } from '@error-explorer/vue';

const handleError = (error: Error, info: string) => {
  console.error('Caught error:', error, info);
};
</script>

<template>
  <ErrorBoundary @error="handleError">
    <template #default>
      <RiskyComponent />
    </template>
    <template #fallback="{ error, reset }">
      <div class="error-fallback">
        <p>Something went wrong: {{ error.message }}</p>
        <button @click="reset">Try Again</button>
      </div>
    </template>
  </ErrorBoundary>
</template>
```

### Higher-Order Component

Wrap a component with error boundary:

```typescript
import { withErrorBoundary } from '@error-explorer/vue';
import RiskyComponent from './RiskyComponent.vue';

export default withErrorBoundary(RiskyComponent, {
  onError: (error, info) => console.error(error),
  tags: { feature: 'risky' },
});
```

## Composables

### useErrorExplorer

Access Error Explorer methods in Composition API:

```vue
<script setup lang="ts">
import { useErrorExplorer } from '@error-explorer/vue';

const { captureException, addBreadcrumb, setUser } = useErrorExplorer();

// Set user context
setUser({
  id: 'user_123',
  email: 'user@example.com',
});

// Add breadcrumb
addBreadcrumb({
  type: 'user',
  category: 'action',
  message: 'User clicked submit',
});

// Capture exception
const handleSubmit = async () => {
  try {
    await api.submit(data);
  } catch (error) {
    captureException(error as Error, {
      tags: { action: 'submit' },
    });
  }
};
</script>
```

### useErrorHandler

Simplify error handling in async operations:

```vue
<script setup lang="ts">
import { useErrorHandler } from '@error-explorer/vue';

const { wrapAsync, handleError } = useErrorHandler();

// Wrap async functions to auto-capture errors
const safeSubmit = wrapAsync(async () => {
  await api.submit(formData);
});

// Or handle manually
const manualSubmit = async () => {
  try {
    await api.submit(formData);
  } catch (error) {
    handleError(error, { tags: { form: 'contact' } });
  }
};
</script>
```

### useActionTracker

Track user actions as breadcrumbs:

```vue
<script setup lang="ts">
import { useActionTracker } from '@error-explorer/vue';

const { trackAction, trackInteraction } = useActionTracker();

const handleClick = () => {
  trackInteraction('submit-button', 'click', { formId: 'contact' });
  // ... actual handler
};
</script>
```

### useComponentBreadcrumbs

Track component lifecycle:

```vue
<script setup lang="ts">
import { useComponentBreadcrumbs } from '@error-explorer/vue';

// Adds mount/unmount breadcrumbs automatically
useComponentBreadcrumbs();
</script>
```

## Configuration Options

```typescript
interface VueErrorExplorerOptions {
  // Required: Your Error Explorer token
  token: string;

  // Environment (production, staging, development)
  environment?: string;

  // App release version
  release?: string;

  // Enable Vue error handler (default: true)
  vueErrorHandler?: boolean;

  // Enable Vue warning handler (default: true in dev)
  vueWarnHandler?: boolean;

  // Capture component name (default: true)
  captureComponentName?: boolean;

  // Capture component props (default: false)
  captureComponentProps?: boolean;

  // Props serialization depth (default: 2)
  propsDepth?: number;

  // Hook before capturing Vue errors
  beforeVueCapture?: (
    error: Error,
    instance: ComponentPublicInstance | null,
    info: string
  ) => boolean;
}
```

## Router Integration Options

```typescript
import { setupRouterIntegration } from '@error-explorer/vue/router';

setupRouterIntegration(router, {
  // Track navigation (default: true)
  trackNavigation: true,

  // Track route params (default: false)
  trackParams: false,

  // Track query params (default: false)
  trackQuery: false,

  // Custom route name extractor
  getRouteName: (route) => route.meta.title || route.name || route.path,

  // Filter navigation breadcrumbs
  beforeNavigationBreadcrumb: (from, to) => {
    // Return false to skip this breadcrumb
    return !to.path.startsWith('/admin');
  },
});
```

## Options API Support

For Options API components, use `this.$errorExplorer`:

```vue
<script>
export default {
  methods: {
    handleAction() {
      this.$errorExplorer.addBreadcrumb({
        type: 'user',
        message: 'Action performed',
      });
    },
    handleError(error) {
      this.$errorExplorer.captureException(error);
    },
  },
};
</script>
```

## Best Practices

1. **Initialize early**: Set up the plugin before mounting your app
2. **Set user context**: Call `setUser()` after authentication
3. **Use ErrorBoundary**: Wrap critical sections with ErrorBoundary
4. **Add meaningful breadcrumbs**: Track user actions for debugging context
5. **Don't capture props by default**: May contain sensitive data

## TypeScript

Full TypeScript support is included. Import types as needed:

```typescript
import type {
  VueErrorExplorerOptions,
  VueComponentContext,
  ErrorBoundaryProps,
} from '@error-explorer/vue';
```

## License

MIT
