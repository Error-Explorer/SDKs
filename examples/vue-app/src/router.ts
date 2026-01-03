/**
 * Vue Router configuration
 */

import { createRouter, createWebHistory } from 'vue-router';
import Home from './views/Home.vue';
import About from './views/About.vue';
import ErrorTest from './views/ErrorTest.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/about',
      name: 'about',
      component: About,
    },
    {
      path: '/error-test',
      name: 'error-test',
      component: ErrorTest,
    },
  ],
});

export default router;
