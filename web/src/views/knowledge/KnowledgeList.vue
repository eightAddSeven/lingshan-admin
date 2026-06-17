<template>
  <div class="page-container">
    <div class="page-header">
      <h2>
        <el-icon><Collection /></el-icon>
        知识库管理
      </h2>
      <p>管理 AI 导游知识库，支持 knowledge 和 knowledge_full 两个集合</p>
    </div>

    <div class="card-box">
      <!-- 操作栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-radio-group v-model="collection" size="default" @change="loadData">
            <el-radio-button value="knowledge">knowledge (基础)</el-radio-button>
            <el-radio-button value="knowledge_full">knowledge_full (完整)</el-radio-button>
          </el-radio-group>
          <el-input
            v-model="keyword"
            placeholder="搜索景点名或标题..."
            clearable
            style="width: 260px"
            @clear="loadData"
            @keyup.enter="loadData"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="loadData">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-button @click="goCreate">
            <el-icon><Plus /></el-icon>
            新增知识
          </el-button>
        </div>
      </div>

      <!-- 数据表格 -->
      <el-table :data="list" v-loading="loading" stripe style="width: 100%; margin-top: 16px">
        <template #empty>
          <el-empty description="暂无数据" :image-size="80" />
        </template>
        <el-table-column prop="name" label="景点名" width="140">
          <template #default="{ row }">
            <span class="spot-name">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="location" label="位置" width="180" show-overflow-tooltip />
        <el-table-column prop="openInfo" label="开放信息" width="200" show-overflow-tooltip />
        <el-table-column label="更新时间" width="160">
          <template #default="{ row }">
            <span class="time-cell">{{ formatTime(row.updateTime || row.createTime) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goEdit(row._id)">编辑</el-button>
            <el-divider direction="vertical" />
            <el-popconfirm
              title="确定删除该知识条目？"
              confirm-button-text="确认删除"
              cancel-button-text="取消"
              @confirm="handleDelete(row._id)"
            >
              <template #reference>
                <el-button type="danger" link size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadData"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import knowledgeAPI from '../../api/knowledge'
import { Search, Collection, Plus } from '@element-plus/icons-vue'

const router = useRouter()
const collection = ref('knowledge')
const keyword = ref('')
const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

function formatTime(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch (e) {
    return dateStr
  }
}

async function loadData() {
  loading.value = true
  try {
    // 从服务端拿分页数据（不传 keyword，搜索由前端过滤）
    const res = await knowledgeAPI.getList({
      collection: collection.value,
      page: page.value,
      pageSize: pageSize.value
    })

    // 前端关键词过滤
    let filteredList = res.list
    if (keyword.value && keyword.value.trim()) {
      const kw = keyword.value.trim().toLowerCase()
      filteredList = res.list.filter(item =>
        (item.name && item.name.toLowerCase().includes(kw)) ||
        (item.title && item.title.toLowerCase().includes(kw))
      )
    }

    list.value = filteredList
    // 有搜索词时 total 用过滤后数量，否则用服务端返回的 total
    total.value = keyword.value ? filteredList.length : res.total
  } catch (err) {
    console.error('加载知识列表失败:', err)
    ElMessage.error(err.message || '加载数据失败')
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function goCreate() {
  router.push({ path: '/knowledge/edit', query: { collection: collection.value } })
}

function goEdit(id) {
  router.push({ path: `/knowledge/edit/${id}`, query: { collection: collection.value } })
}

async function handleDelete(id) {
  try {
    await knowledgeAPI.remove(collection.value, id)
    ElMessage.success('删除成功')
    loadData()
  } catch (err) {
    console.error('删除失败:', err)
    ElMessage.error('删除失败: ' + (err.message || '未知错误'))
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.card-box {
  overflow: hidden;
}

.toolbar {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 250, 240, 0.58);
}

.card-box :deep(.el-table) {
  --el-table-bg-color: #fffaf0;
  --el-table-tr-bg-color: #fffaf0;
  --el-table-header-bg-color: rgba(158, 170, 104, 0.12);
  --el-table-row-hover-bg-color: var(--sky-wash);
  --el-table-border-color: var(--border-light);
  color: var(--text-regular);
  background: #fffaf0 !important;
  border: 1px solid var(--border);
}

.card-box :deep(.el-table__inner-wrapper),
.card-box :deep(.el-table__body-wrapper),
.card-box :deep(.el-scrollbar),
.card-box :deep(.el-scrollbar__view),
.card-box :deep(.el-table__fixed-right),
.card-box :deep(.el-table__fixed-right-patch) {
  background: #fffaf0 !important;
}

.card-box :deep(.el-table th.el-table__cell) {
  color: var(--text-regular);
  background: rgba(158, 170, 104, 0.12) !important;
  border-bottom-color: var(--border);
}

.card-box :deep(.el-table td.el-table__cell) {
  color: var(--text-primary);
  background: #fffaf0 !important;
  border-bottom-color: var(--border-light);
}

.card-box :deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
  background: rgba(158, 170, 104, 0.055) !important;
}

.card-box :deep(.el-table__body tr.hover-row > td.el-table__cell),
.card-box :deep(.el-table__body tr:hover > td.el-table__cell) {
  color: var(--text-primary);
  background: var(--sky-wash) !important;
}

.card-box :deep(.el-table__empty-block) {
  background: #fffaf0;
}

.spot-name {
  font-weight: 600;
  color: var(--text-primary);
}

.time-cell {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
