<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue';
import {
  useErrorExplorer,
  useErrorHandler,
  useComponentBreadcrumbs,
  ErrorBoundary,
} from '@error-explorer/vue';

// Track component lifecycle
useComponentBreadcrumbs();

const { captureException, captureMessage, addBreadcrumb } = useErrorExplorer();
const { handleError, wrapAsync, tryCatch } = useErrorHandler({
  tags: { page: 'error-test' },
});

const errorMessage = ref('');
const showRiskyComponent = ref(false);

// Risky component that might throw
const RiskyComponent = defineAsyncComponent(() =>
  Promise.resolve({
    setup() {
      const shouldError = ref(false);
      const triggerError = () => {
        shouldError.value = true;
      };
      return { shouldError, triggerError };
    },
    template: `
      <div class="risky-component">
        <p v-if="!shouldError">This component might throw an error.</p>
        <button @click="triggerError">Trigger Render Error</button>
        <div v-if="shouldError">{{ nonExistent.property }}</div>
      </div>
    `,
  })
);

// Error handlers
const triggerSyncError = () => {
  addBreadcrumb({
    type: 'user',
    category: 'action',
    message: 'User clicked trigger sync error button',
  });

  try {
    throw new Error('This is a synchronous error from Vue component');
  } catch (e) {
    handleError(e as Error);
    errorMessage.value = 'Sync error captured and sent!';
  }
};

const triggerAsyncError = async () => {
  addBreadcrumb({
    type: 'user',
    category: 'action',
    message: 'User clicked trigger async error button',
  });

  const safeAsyncOp = wrapAsync(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    throw new Error('This is an asynchronous error from Vue component');
  });

  await safeAsyncOp();
  errorMessage.value = 'Async error captured and sent!';
};

const triggerNetworkError = async () => {
  addBreadcrumb({
    type: 'http',
    category: 'fetch',
    message: 'Attempting to fetch from non-existent endpoint',
    data: {
      url: 'http://localhost:9999/does-not-exist',
      method: 'GET',
    },
  });

  try {
    await fetch('http://localhost:9999/does-not-exist');
  } catch (e) {
    captureException(e as Error, {
      tags: {
        errorType: 'network',
        component: 'ErrorTest',
      },
    });
    errorMessage.value = 'Network error captured and sent!';
  }
};

const triggerCustomMessage = () => {
  captureMessage('This is a custom message from Vue app', {
    level: 'warning',
    tags: {
      source: 'error-test-page',
      type: 'custom-message',
    },
  });
  errorMessage.value = 'Custom message sent!';
};

const triggerTypeError = () => {
  const result = tryCatch(() => {
    const obj: any = null;
    return obj.property.nested; // This will throw TypeError
  });

  if (result === undefined) {
    errorMessage.value = 'TypeError captured and sent!';
  }
};

const handleBoundaryError = (error: Error, info: string) => {
  console.log('ErrorBoundary caught:', error.message, info);
  errorMessage.value = `ErrorBoundary caught: ${error.message}`;
};

const handleBoundaryReset = () => {
  showRiskyComponent.value = false;
  errorMessage.value = 'ErrorBoundary reset!';
};

const toggleRiskyComponent = () => {
  showRiskyComponent.value = !showRiskyComponent.value;
  errorMessage.value = '';
};
</script>

<template>
  <div class="error-test">
    <h2>Error Testing</h2>

    <p class="description">
      Click the buttons below to trigger different types of errors.
      All errors will be captured and sent to Error Explorer.
    </p>

    <div v-if="errorMessage" class="status-message">
      {{ errorMessage }}
    </div>

    <div class="button-grid">
      <button class="error-button sync" @click="triggerSyncError">
        Trigger Sync Error
      </button>

      <button class="error-button async" @click="triggerAsyncError">
        Trigger Async Error
      </button>

      <button class="error-button network" @click="triggerNetworkError">
        Trigger Network Error
      </button>

      <button class="error-button type" @click="triggerTypeError">
        Trigger TypeError
      </button>

      <button class="error-button message" @click="triggerCustomMessage">
        Send Custom Message
      </button>

      <button class="error-button boundary" @click="toggleRiskyComponent">
        {{ showRiskyComponent ? 'Hide' : 'Show' }} ErrorBoundary Demo
      </button>
    </div>

    <div v-if="showRiskyComponent" class="boundary-demo">
      <h3>ErrorBoundary Demo</h3>
      <ErrorBoundary
        @error="handleBoundaryError"
        @reset="handleBoundaryReset"
        :tags="{ feature: 'error-boundary-demo' }"
      >
        <template #default>
          <RiskyComponent />
        </template>
        <template #fallback="{ error, reset }">
          <div class="error-fallback">
            <h4>Something went wrong!</h4>
            <p>{{ error.message }}</p>
            <button @click="reset">Try Again</button>
          </div>
        </template>
      </ErrorBoundary>
    </div>
  </div>
</template>

<style scoped>
.error-test {
  padding: 20px 0;
}

h2 {
  color: #e74c3c;
  margin-bottom: 20px;
}

.description {
  color: #666;
  margin-bottom: 20px;
  line-height: 1.6;
}

.status-message {
  background: #d4edda;
  color: #155724;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  border: 1px solid #c3e6cb;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 30px;
}

.error-button {
  padding: 15px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
  color: white;
}

.error-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.error-button.sync {
  background: #e74c3c;
}

.error-button.async {
  background: #9b59b6;
}

.error-button.network {
  background: #3498db;
}

.error-button.type {
  background: #e67e22;
}

.error-button.message {
  background: #1abc9c;
}

.error-button.boundary {
  background: #34495e;
}

.boundary-demo {
  margin-top: 30px;
  padding: 20px;
  background: #f8f8f8;
  border-radius: 8px;
  border: 2px dashed #ddd;
}

.boundary-demo h3 {
  margin-bottom: 15px;
  color: #333;
}

.risky-component {
  padding: 20px;
  background: white;
  border-radius: 6px;
}

.risky-component button {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.error-fallback {
  padding: 20px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  text-align: center;
}

.error-fallback h4 {
  color: #c00;
  margin-bottom: 10px;
}

.error-fallback p {
  color: #666;
  margin-bottom: 15px;
}

.error-fallback button {
  background: #42b883;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
