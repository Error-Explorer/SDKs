<script setup lang="ts">
import { useErrorExplorer, useUserContext } from '@error-explorer/vue';
import { onMounted } from 'vue';

const { setTag } = useErrorExplorer();

// Set user context for error tracking (id must be UUID or integer)
useUserContext({
  id: '123',
  email: 'demo@vue-example.com',
  name: 'Vue Demo User',
});

onMounted(() => {
  // Set app-wide tags
  setTag('app', 'vue-example');
  setTag('version', '1.0.0');
});
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>Error Explorer - Vue Example</h1>
      <nav>
        <router-link to="/">Home</router-link>
        <router-link to="/about">About</router-link>
        <router-link to="/error-test">Error Test</router-link>
      </nav>
    </header>

    <main class="main">
      <router-view />
    </main>

    <footer class="footer">
      <p>Vue 3 + Error Explorer SDK Example</p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  background: #42b883;
  color: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.header h1 {
  margin-bottom: 10px;
  font-size: 24px;
}

.header nav {
  display: flex;
  gap: 15px;
}

.header nav a {
  color: white;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background 0.2s;
}

.header nav a:hover,
.header nav a.router-link-active {
  background: rgba(255, 255, 255, 0.2);
}

.main {
  background: white;
  padding: 20px;
  border-radius: 8px;
  min-height: 400px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.footer {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
}
</style>
