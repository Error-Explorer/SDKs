<script setup lang="ts">
import { useComponentBreadcrumbs } from '@error-explorer/vue';

// Track component lifecycle
useComponentBreadcrumbs();
</script>

<template>
  <div class="about">
    <h2>About This Example</h2>

    <section class="section">
      <h3>Error Explorer Vue SDK</h3>
      <p>
        The @error-explorer/vue SDK provides seamless integration between Vue 3
        applications and the Error Explorer error tracking platform. It offers:
      </p>
      <ul>
        <li>Automatic error capturing through Vue's error handlers</li>
        <li>Navigation breadcrumbs via Vue Router integration</li>
        <li>ErrorBoundary component for graceful error handling</li>
        <li>Composition API composables for flexible error tracking</li>
      </ul>
    </section>

    <section class="section">
      <h3>How It Works</h3>
      <p>
        When an error occurs in your Vue application, the SDK automatically:
      </p>
      <ol>
        <li>Captures the error with full stack trace</li>
        <li>Collects user context and breadcrumbs</li>
        <li>Includes Vue-specific information (component name, lifecycle hook)</li>
        <li>Sends the error to your Error Explorer instance</li>
      </ol>
    </section>

    <section class="section">
      <h3>Getting Started</h3>
      <pre class="code"><code>import { createErrorExplorerPlugin } from '@error-explorer/vue';

const app = createApp(App);

app.use(createErrorExplorerPlugin({
  token: 'your_token',
  environment: 'production',
}));

app.mount('#app');</code></pre>
    </section>
  </div>
</template>

<style scoped>
.about {
  padding: 20px 0;
}

h2 {
  color: #42b883;
  margin-bottom: 20px;
}

.section {
  margin-bottom: 30px;
}

.section h3 {
  color: #333;
  margin-bottom: 10px;
  font-size: 18px;
}

.section p {
  color: #666;
  line-height: 1.6;
  margin-bottom: 10px;
}

.section ul,
.section ol {
  padding-left: 20px;
  color: #666;
  line-height: 1.8;
}

.code {
  background: #2d2d2d;
  color: #f8f8f2;
  padding: 15px;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 14px;
  line-height: 1.5;
}
</style>
