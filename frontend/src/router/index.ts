import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/practice',
      name: 'practice',
      component: () => import('../views/PracticeView.vue'),
    },
    {
      path: '/view',
      name: 'view',
      component: () => import('../views/AllQuestionsView.vue'),
    },
    {
      path: '/view/:pid',
      name: 'viewQuestion',
      component: () => import('../views/AllQuestionsView.vue'),
      props: true,
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('../views/SearchView.vue'),
    },
    {
      path: '/test',
      name: 'test',
      component: () => import('../views/TestView.vue'),
    },
    {
      path: '/star',
      name: 'star',
      component: () => import('../views/StarView.vue'),
    },
    {
      path: '/stat',
      name: 'stat',
      component: () => import('../views/StatView.vue'),
    },
    {
      path: '/export',
      name: 'export',
      component: () => import('../views/ExportView.vue'),
    },
    {
      path: '/faq',
      name: 'faq',
      component: () => import('../views/FAQView.vue'),
    },
    {
      path: '/advanced',
      name: 'advanced',
      component: () => import('../views/AdvancedView.vue'),
    },
    {
      path: '/admin',
      redirect: '/admin/subjects',
    },
    {
      path: '/admin/subjects',
      name: 'adminSubjects',
      component: () => import('../views/AdminView.vue'),
    },
    {
      path: '/admin/users',
      name: 'adminUsers',
      component: () => import('../views/AdminView.vue'),
    },
    {
      path: '/admin/crawl',
      name: 'adminCrawl',
      component: () => import('../views/AdminView.vue'),
    },
    {
      path: '/about',
      name: 'adout',
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/debug',
      name: 'debug',
      component: () => import('../views/DebugView.vue'),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'notFound',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

export default router
