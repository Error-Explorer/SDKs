<script setup lang="ts">
import { useActionTracker, useComponentBreadcrumbs } from '@error-explorer/vue';

// Track component lifecycle
useComponentBreadcrumbs();

const { trackAction, trackInteraction } = useActionTracker();

const handleButtonClick = () => {
  trackInteraction('welcome-button', 'click');
  alert('Welcome to the Vue Error Explorer Example!');
};

const handleFeatureClick = (feature: string) => {
  trackAction(`feature_viewed`, { feature });
};
</script>

<template>
  <div class="home">
    <h2>Welcome to Error Explorer Vue SDK</h2>

    <p class="intro">
      This example demonstrates how to integrate Error Explorer with Vue 3.
      Navigate through the app to see breadcrumbs being tracked, and visit
      the Error Test page to trigger various types of errors.
    </p>

    <button class="primary-button" @click="handleButtonClick">
      Get Started
    </button>

    <div class="features">
      <h3>Features Demonstrated</h3>
      <ul>
        <li @click="handleFeatureClick('vue-plugin')">
          <strong>Vue Plugin</strong> - Automatic error capturing via errorHandler
        </li>
        <li @click="handleFeatureClick('router-integration')">
          <strong>Router Integration</strong> - Navigation breadcrumbs
        </li>
        <li @click="handleFeatureClick('error-boundary')">
          <strong>ErrorBoundary</strong> - Component-level error handling
        </li>
        <li @click="handleFeatureClick('composables')">
          <strong>Composables</strong> - Composition API integration
        </li>
        <li @click="handleFeatureClick('action-tracking')">
          <strong>Action Tracking</strong> - User interaction breadcrumbs
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.home {
  padding: 20px 0;
}

h2 {
  color: #42b883;
  margin-bottom: 20px;
}

.intro {
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
}

.primary-button {
  background: #42b883;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.primary-button:hover {
  background: #369870;
}

.features {
  margin-top: 30px;
  padding: 20px;
  background: #f8f8f8;
  border-radius: 8px;
}

.features h3 {
  margin-bottom: 15px;
  color: #333;
}

.features ul {
  list-style: none;
}

.features li {
  padding: 10px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background 0.2s;
}

.features li:hover {
  background: #fff;
}

.features li:last-child {
  border-bottom: none;
}

.features strong {
  color: #42b883;
}
</style>
