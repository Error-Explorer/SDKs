/**
 * Vue 3 App with Error Explorer Integration
 */

import { createApp } from 'vue';
import { createErrorExplorerPlugin, setupRouterIntegration } from '@error-explorer/vue';
import App from './App.vue';
import router from './router';

// Create the Vue app
const app = createApp(App);

// Initialize Error Explorer
app.use(createErrorExplorerPlugin({
  token: 'ee_22dd9d9f36944ecb31f60998b7fba65336be5713aeb6c849fbed165bb0b7',
  hmacSecret: 'c94fd86b3ab6e199d21f0a9e6b8086988f8f0244f4a73e5ec9e29655947c9e93',
  project: 'projet-de-test-vue-js',
  environment: 'development',
  release: '1.0.0',
  debug: true,
  endpoint: 'http://error-explorer.localhost/api/v1/webhook',
  vueErrorHandler: true,
  vueWarnHandler: true,
  captureComponentName: true,
  beforeVueCapture: (error, instance, info) => {
    console.log('[ErrorExplorer] Captured Vue error:', error.message, info);
    return true; // Continue with capture
  },
}));

// Use Vue Router
app.use(router);

// Setup router integration for navigation breadcrumbs
setupRouterIntegration(router, {
  trackNavigation: true,
  trackParams: false,
  trackQuery: false,
});

// Mount the app
app.mount('#app');

console.log('[Vue App] Error Explorer initialized');
