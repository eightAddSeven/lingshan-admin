<template>
  <div class="sidebar">
    <div class="sidebar-logo">
      <div class="brand-mark">
        <el-icon :size="22"><Monitor /></el-icon>
      </div>
      <div class="brand-copy">
        <span class="logo-text">灵山管理后台</span>
        <small>AI Guide Console</small>
      </div>
    </div>

    <div class="quick-search" @click="$emit('open-search')">
      <el-icon><Search /></el-icon>
      <span>搜索模块</span>
    </div>

    <el-menu
      :default-active="activeMenu"
      :router="true"
      :collapse="false"
      background-color="transparent"
      text-color="rgba(255,250,240,0.68)"
      active-text-color="#15130f"
    >
      <el-menu-item index="/dashboard">
        <el-icon><Odometer /></el-icon>
        <span>数据大屏</span>
      </el-menu-item>

      <el-menu-item index="/knowledge">
        <el-icon><Collection /></el-icon>
        <span>知识库管理</span>
      </el-menu-item>

      <el-menu-item index="/faq">
        <el-icon><ChatLineSquare /></el-icon>
        <span>FAQ 管理</span>
      </el-menu-item>

      <el-menu-item index="/digital-human">
        <el-icon><UserFilled /></el-icon>
        <span>数字人配置</span>
      </el-menu-item>

      <el-menu-item index="/reports/interaction">
        <el-icon><Histogram /></el-icon>
        <span>交互概览</span>
      </el-menu-item>

      <el-menu-item index="/reports/sentiment">
        <el-icon><TrendCharts /></el-icon>
        <span>情感趋势</span>
      </el-menu-item>

      <el-menu-item index="/marketing">
        <el-icon><Money /></el-icon>
        <span>营销分析</span>
      </el-menu-item>
    </el-menu>

    <div class="sidebar-footer">
      <div class="system-card">
        <div>
          <strong>导览服务</strong>
          <span>当前在线 326</span>
        </div>
        <el-icon><Moon /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Monitor, Moon, Money, Search,
  Odometer, Collection, ChatLineSquare, UserFilled, Histogram, TrendCharts
} from '@element-plus/icons-vue'

defineEmits(['open-search'])

const route = useRoute()
const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/knowledge')) return '/knowledge'
  return path
})
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-sidebar);
  user-select: none;
}

.sidebar-logo {
  padding: 26px 18px 18px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: #15130f;
  background: #f1b7db;
  box-shadow: 0 12px 28px rgba(241, 183, 219, 0.24);
}

.brand-copy {
  display: grid;
  gap: 2px;
}

.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #fffaf0;
}

.brand-copy small {
  color: rgba(255, 250, 240, 0.46);
  font-size: 11px;
}

.quick-search {
  height: 40px;
  margin: 6px 16px 18px;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(156, 199, 221, 0.22);
  border-radius: 999px;
  background: rgba(255, 250, 240, 0.06);
  color: rgba(255, 250, 240, 0.66);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.quick-search:hover {
  border-color: rgba(156, 199, 221, 0.5);
  background: rgba(255, 250, 240, 0.1);
}

.el-menu {
  flex: 1;
  padding-top: 4px;
  overflow-y: auto;
  overflow-x: hidden;
}

.el-menu::-webkit-scrollbar {
  width: 3px;
}
.el-menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.sidebar-footer {
  padding: 16px;
}

.system-card {
  min-height: 76px;
  padding: 14px;
  border: 1px solid rgba(156, 199, 221, 0.26);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fffaf0;
  background:
    linear-gradient(135deg, rgba(156, 199, 221, 0.16), rgba(255, 250, 240, 0.045)),
    rgba(255, 250, 240, 0.06);
}

.system-card div {
  display: grid;
  gap: 4px;
}

.system-card strong {
  font-size: 13px;
}

.system-card span {
  color: rgba(255, 250, 240, 0.54);
  font-size: 11px;
}

@media (max-width: 980px) {
  .brand-copy,
  .quick-search span,
  .sidebar-footer,
  .el-menu :deep(.el-menu-item span) {
    display: none;
  }

  .sidebar-logo {
    justify-content: center;
    padding: 20px 0 12px;
  }

  .quick-search {
    justify-content: center;
    margin: 6px 14px 12px;
    padding: 0;
  }
}
</style>
