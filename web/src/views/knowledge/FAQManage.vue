<template>
  <div class="page-container">
    <div class="page-header">
      <h2>
        <el-icon><ChatLineSquare /></el-icon>
        FAQ 管理
      </h2>
      <p>管理高频问答对 — 修改后实时生效，小程序端同步更新（60秒内）</p>
    </div>

    <div class="card-box">
      <div class="toolbar">
        <el-tag type="info" effect="plain" size="large">
          共 {{ faqList.length }} 条 FAQ
        </el-tag>
        <el-button type="primary" @click="openAddDialog">
          <el-icon><Plus /></el-icon>
          新增 FAQ
        </el-button>
      </div>

      <el-table :data="faqList" stripe style="width: 100%; margin-top: 16px" v-loading="loading">
        <template #empty>
          <el-empty description="暂无 FAQ 数据" :image-size="80" />
        </template>
        <el-table-column prop="q" label="问题" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="faq-question">{{ row.q }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="a" label="回答" min-width="380" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-divider direction="vertical" />
            <el-popconfirm
              title="确定删除该 FAQ？"
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
    </div>

    <!-- FAQ 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑 FAQ' : '新增 FAQ'" width="560px">
      <el-form :model="editForm" label-width="60px">
        <el-form-item label="问题">
          <el-input v-model="editForm.q" placeholder="用户可能提出的问题" />
        </el-form-item>
        <el-form-item label="回答">
          <el-input v-model="editForm.a" type="textarea" :rows="5" placeholder="对应的系统回答" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">
          <el-icon><Check /></el-icon>
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import faqAPI from '../../api/faq'
import { ChatLineSquare, Plus, Check } from '@element-plus/icons-vue'

const faqList = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)      // 正在编辑的 FAQ 的 _id，null 表示新增
const editForm = ref({ q: '', a: '' })

async function loadFAQ() {
  loading.value = true
  try {
    faqList.value = await faqAPI.getFAQList()
  } catch (err) {
    console.error('加载FAQ失败:', err)
    ElMessage.error(err.message || '加载FAQ失败')
  } finally {
    loading.value = false
  }
}

function openAddDialog() {
  editingId.value = null
  editForm.value = { q: '', a: '' }
  dialogVisible.value = true
}

function openEditDialog(row) {
  editingId.value = row._id
  editForm.value = { q: row.q, a: row.a }
  dialogVisible.value = true
}

async function handleSave() {
  if (!editForm.value.q.trim() || !editForm.value.a.trim()) {
    ElMessage.warning('问题和回答不能为空')
    return
  }

  saving.value = true
  try {
    if (editingId.value) {
      // 更新已有 FAQ
      await faqAPI.updateFAQ(editingId.value, {
        q: editForm.value.q.trim(),
        a: editForm.value.a.trim()
      })
      ElMessage.success('FAQ 已更新')
    } else {
      // 新增 FAQ
      await faqAPI.addFAQ({
        q: editForm.value.q.trim(),
        a: editForm.value.a.trim()
      })
      ElMessage.success('FAQ 已添加')
    }
    dialogVisible.value = false
    await loadFAQ()
  } catch (err) {
    console.error('保存FAQ失败:', err)
    ElMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  try {
    await faqAPI.removeFAQ(id)
    ElMessage.success('FAQ 已删除')
    await loadFAQ()
  } catch (err) {
    console.error('删除FAQ失败:', err)
    ElMessage.error(err.message || '删除失败')
  }
}

onMounted(() => loadFAQ())
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

.faq-question {
  font-weight: 500;
  color: var(--text-primary);
}
</style>
