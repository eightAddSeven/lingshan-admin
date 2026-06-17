<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="bg-pattern"></div>

    <!-- CloudBase 连接状态 -->
    <div v-if="!cbConnected" class="cb-warning">
      <el-icon><WarningFilled /></el-icon>
      <span>CloudBase 未连接 — 数据库功能不可用。请确认控制台已开启「匿名登录」并添加安全域名</span>
    </div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <div class="login-header">
        <div class="login-brand">
          <el-icon :size="36"><Monitor /></el-icon>
        </div>
        <h1>灵山胜境管理后台</h1>
        <p>AI 导览服务管理系统</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入管理员用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
            :prefix-icon="Lock"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>

      <p v-if="errorMsg" class="error-text">{{ errorMsg }}</p>

      <div class="login-footer">
        <span>灵山胜境 · 智慧文旅</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { isCloudBaseReady } from '../api/cloudbase'
import { User, Lock, WarningFilled, Monitor } from '@element-plus/icons-vue'

const router = useRouter()
const authStore = useAuthStore()

const cbConnected = ref(false)

const formRef = ref(null)
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  username: 'linghsn',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  errorMsg.value = ''
  try {
    await authStore.login(form.username, form.password)
    router.push('/dashboard')
  } catch (err) {
    const rawMsg = err.message || ''
    // 将 CloudBase 底层错误转为友好提示
    if (rawMsg.includes('permission denied') || rawMsg.includes('not authenticated')) {
      errorMsg.value = '云环境连接失败：请确认已在 CloudBase 控制台开启匿名登录，并将 localhost:3000 加入安全域名白名单'
    } else if (rawMsg.includes('env') && rawMsg.includes('not')) {
      errorMsg.value = '云环境配置错误：请检查环境 ID 是否正确'
    } else {
      errorMsg.value = rawMsg || '登录失败，请检查用户名和密码'
    }
  } finally {
    loading.value = false
  }
}

// 页面挂载后检查 CloudBase 连接状态
onMounted(() => {
  cbConnected.value = isCloudBaseReady()
  if (!cbConnected.value) {
    console.warn('[Login] CloudBase 尚未连接，数据库功能不可用')
  }
})
</script>

<style scoped>
/* CloudBase 连接警告横幅 */
.cb-warning {
  position: absolute;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 10px;
  color: #fbbf24;
  font-size: 13px;
  z-index: 10;
}
.cb-warning .el-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
  position: relative;
  overflow: hidden;
}

/* 背景纹理 */
.bg-pattern {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(18, 18, 15, 0.06) 1px, transparent 1px),
    linear-gradient(180deg, rgba(18, 18, 15, 0.06) 1px, transparent 1px);
  background-size: 42px 42px;
  opacity: 0.35;
  pointer-events: none;
}

/* 卡片 */
.login-card {
  width: 420px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: 44px 40px 36px;
  box-shadow: var(--shadow-lg);
  border: 2px solid rgba(18, 18, 15, 0.68);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.login-brand {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  color: #15130f;
  background: #f1b7db;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-header h1 {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 4px;
  letter-spacing: 0;
}

.login-header p {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
  border-radius: var(--radius-sm);
  margin-top: 4px;
}

/* 错误文字 */
.error-text {
  color: var(--danger);
  text-align: center;
  font-size: 13px;
  margin-top: -8px;
  padding: 6px 12px;
  background: var(--danger-light);
  border-radius: var(--radius-sm);
}

/* 底部 */
.login-footer {
  text-align: center;
  margin-top: 28px;
  font-size: 12px;
  color: var(--text-placeholder);
  letter-spacing: 0;
}
</style>
