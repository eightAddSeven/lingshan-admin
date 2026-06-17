import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import App from './App.vue'
import router from './router'
import { initCloudBase } from './api/cloudbase'
import './assets/styles/global.css'

async function bootstrap() {
  // 先初始化 CloudBase SDK（匿名登录）
  try {
    await initCloudBase()
    console.log('[App] CloudBase 初始化完成')
  } catch (err) {
    console.error('[App] CloudBase 初始化失败，部分功能可能不可用:', err.message)
    // 即使失败也继续挂载，让用户看到登录页
  }

  const app = createApp(App)

  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)

  app.use(pinia)
  app.use(router)
  app.use(ElementPlus, { locale: zhCn })

  app.mount('#app')
}

bootstrap()
