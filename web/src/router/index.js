import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '管理员登录' }
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '数据大屏', icon: 'Odometer' }
      },
      {
        path: 'knowledge',
        name: 'KnowledgeList',
        component: () => import('../views/knowledge/KnowledgeList.vue'),
        meta: { title: '知识库管理', icon: 'Collection' }
      },
      {
        path: 'knowledge/edit/:id?',
        name: 'KnowledgeEdit',
        component: () => import('../views/knowledge/KnowledgeEdit.vue'),
        meta: { title: '编辑知识', hidden: true }
      },
      {
        path: 'faq',
        name: 'FAQManage',
        component: () => import('../views/knowledge/FAQManage.vue'),
        meta: { title: 'FAQ管理', icon: 'ChatLineSquare' }
      },
      {
        path: 'digital-human',
        name: 'HumanConfig',
        component: () => import('../views/digitalHuman/HumanConfig.vue'),
        meta: { title: '数字人配置', icon: 'UserFilled' }
      },
      {
        path: 'migrate-spots',
        name: 'MigrateSpots',
        component: () => import('../views/knowledge/MigrateSpots.vue'),
        meta: { title: '景点字段迁移', hidden: true }
      },
      {
        path: 'reports/interaction',
        name: 'InteractionReport',
        component: () => import('../views/reports/InteractionReport.vue'),
        meta: { title: '交互概览', icon: 'DataAnalysis' }
      },
      {
        path: 'reports/sentiment',
        name: 'SentimentReport',
        component: () => import('../views/reports/SentimentReport.vue'),
        meta: { title: '情感趋势', icon: 'TrendCharts' }
      },
      {
        path: 'marketing',
        name: 'MarketingDashboard',
        component: () => import('../views/marketing/MarketingDashboard.vue'),
        meta: { title: '营销分析', icon: 'TrendCharts' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫：未登录重定向到登录页
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 访问登录页 — 已登录则跳转到 dashboard
  if (to.path === '/login') {
    if (authStore.isLoggedIn) {
      return next('/dashboard')
    }
    return next()
  }

  // 访问需要认证的页面 — 未登录则跳转到登录页
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!authStore.isLoggedIn) {
      return next('/login')
    }
  }

  next()
})

export default router
