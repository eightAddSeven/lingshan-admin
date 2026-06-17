<template>
  <el-container class="layout-container">
    <el-aside width="248px">
      <Sidebar />
    </el-aside>

    <el-container class="workspace-shell">
      <el-header height="76px">
        <HeaderBar />
      </el-header>

      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import Sidebar from '../components/Sidebar.vue'
import HeaderBar from '../components/HeaderBar.vue'
</script>

<style scoped>
.layout-container {
  height: 100vh;
  padding: 22px;
  background: var(--bg-page);
  overflow: hidden;
}

.el-aside {
  background: var(--bg-sidebar);
  overflow-x: hidden;
  border: 2px solid rgba(18, 18, 15, 0.68);
  border-right: 0;
  border-radius: 18px 0 0 18px;
  box-shadow: var(--shadow-lg);
}

.workspace-shell {
  min-width: 0;
  border: 2px solid rgba(18, 18, 15, 0.68);
  border-left: 0;
  border-radius: 0 18px 18px 0;
  background:
    linear-gradient(180deg, rgba(255, 250, 240, 0.96), rgba(248, 240, 226, 0.96)),
    var(--bg-shell);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.el-header {
  background: rgba(255, 250, 240, 0.82);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 28px;
  z-index: 10;
  backdrop-filter: blur(16px);
}

.el-main {
  background: transparent;
  padding: 0;
  overflow-y: auto;
}

@media (max-width: 980px) {
  .layout-container {
    padding: 10px;
  }

  .el-aside {
    width: 76px !important;
    border-radius: 16px 0 0 16px;
  }

  .workspace-shell {
    border-radius: 0 16px 16px 0;
  }
}
</style>
