<template>
  <div class="header-bar">
    <div class="header-left">
      <div class="search-pill" @click="$emit('open-search')">
        <el-icon><Search /></el-icon>
        <span>搜索模块、景点、FAQ</span>
        <kbd class="search-shortcut">⌘K</kbd>
      </div>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/dashboard' }">
          <el-icon><HomeFilled /></el-icon>
        </el-breadcrumb-item>
        <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path" :to="item.to ? { path: item.path } : undefined">
          {{ item.title }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="header-right">
      <div class="user-info">
        <el-avatar :size="32" class="user-avatar">
          {{ authStore.username?.charAt(0)?.toUpperCase() }}
        </el-avatar>
        <span class="username">{{ authStore.username }}</span>
      </div>
      <el-button type="danger" text size="small" @click="handleLogout">
        <el-icon><SwitchButton /></el-icon>
        <span>退出</span>
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { HomeFilled, Search, SwitchButton } from '@element-plus/icons-vue'

defineEmits(['open-search'])

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const breadcrumbs = computed(() => {
  const matched = route.matched.filter(r => r.meta?.title && r.meta?.title !== 'undefined')
  return matched.map((r, idx) => ({
    title: r.meta.title,
    path: r.path,
    to: idx < matched.length - 1
  }))
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.search-pill {
  width: min(360px, 34vw);
  height: 38px;
  padding: 0 14px;
  border: 1px solid rgba(96, 153, 184, 0.24);
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text-secondary);
  background:
    linear-gradient(90deg, rgba(156, 199, 221, 0.16), rgba(255, 250, 240, 0.86) 34%),
    rgba(255, 250, 240, 0.86);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-pill:hover {
  border-color: rgba(96, 153, 184, 0.5);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.62), 0 0 0 3px rgba(96, 153, 184, 0.08);
}

.search-shortcut {
  margin-left: auto;
  padding: 2px 7px;
  border: 1px solid var(--border);
  border-radius: 5px;
  font-size: 10px;
  font-family: inherit;
  color: var(--text-secondary);
  background: rgba(255, 250, 240, 0.7);
  letter-spacing: 0.02em;
}

/* 面包屑样式覆盖 */
.header-left :deep(.el-breadcrumb__inner) {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}
.header-left :deep(.el-breadcrumb__inner.is-link) {
  color: var(--text-regular);
}
.header-left :deep(.el-breadcrumb__inner.is-link:hover) {
  color: #6099b8;
}
.header-left :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--text-primary);
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 6px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255, 250, 240, 0.82);
}

.user-avatar {
  background: #15130f;
  color: #fffaf0;
  font-weight: 600;
  font-size: 13px;
}

.username {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 600;
}

@media (max-width: 720px) {
  .search-pill,
  .username {
    display: none;
  }
}
</style>
