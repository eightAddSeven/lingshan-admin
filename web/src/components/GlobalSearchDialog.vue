<template>
  <el-dialog
    v-model="visible"
    title=""
    width="560px"
    :show-close="false"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    class="search-dialog"
    @opened="handleOpened"
  >
    <!-- 搜索输入区 -->
    <div class="search-input-wrap">
      <el-icon class="search-icon" :size="20"><Search /></el-icon>
      <input
        ref="inputRef"
        v-model="keyword"
        class="search-input"
        placeholder="搜索模块、景点、FAQ..."
        @input="handleSearch"
        @keydown.enter="navigateFirstResult"
        @keydown.arrow-down.prevent="moveSelection(1)"
        @keydown.arrow-up.prevent="moveSelection(-1)"
        @keydown.escape="visible = false"
      />
      <el-button
        v-if="keyword"
        text
        size="small"
        class="clear-btn"
        @click="clearSearch"
      >
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results" v-if="keyword && keyword.trim()">
      <template v-if="hasResults">
        <!-- 模块 -->
        <div v-if="filteredModules.length" class="result-group">
          <div class="group-label">模块</div>
          <div
            v-for="(item, idx) in filteredModules"
            :key="'mod-' + item.path"
            class="result-item"
            :class="{ active: isActive('mod', idx) }"
            @click="navigateTo(item.path)"
            @mouseenter="setActive('mod', idx)"
          >
            <el-icon :size="16"><component :is="item.icon" /></el-icon>
            <span class="item-title">{{ item.title }}</span>
            <span class="item-path">{{ item.path }}</span>
          </div>
        </div>

        <!-- 景点知识 -->
        <div v-if="filteredSpots.length" class="result-group">
          <div class="group-label">景点知识</div>
          <div
            v-for="(item, idx) in filteredSpots"
            :key="'spot-' + item._id"
            class="result-item"
            :class="{ active: isActive('spot', idx) }"
            @click="navigateToSpot(item._id)"
            @mouseenter="setActive('spot', idx)"
          >
            <el-icon :size="16"><LocationFilled /></el-icon>
            <span class="item-title">{{ item.name }}</span>
            <span class="item-desc">{{ item.title }}</span>
          </div>
        </div>

        <!-- FAQ -->
        <div v-if="filteredFaqs.length" class="result-group">
          <div class="group-label">FAQ</div>
          <div
            v-for="(item, idx) in filteredFaqs"
            :key="'faq-' + item._id"
            class="result-item"
            :class="{ active: isActive('faq', idx) }"
            @click="navigateToFAQ()"
            @mouseenter="setActive('faq', idx)"
          >
            <el-icon :size="16"><ChatLineSquare /></el-icon>
            <span class="item-title">{{ item.q }}</span>
          </div>
        </div>
      </template>

      <!-- 无结果 -->
      <div v-else class="no-results">
        <el-empty description="未找到匹配结果" :image-size="60" />
      </div>
    </div>

    <!-- 默认状态：快捷导航 -->
    <div class="search-default" v-else>
      <div class="default-hint">
        <el-icon><Promotion /></el-icon>
        <span>输入关键词搜索，支持模块名、景点名、FAQ 问题</span>
      </div>
      <div class="quick-links">
        <div class="group-label">常用模块</div>
        <div
          v-for="item in quickLinks"
          :key="item.path"
          class="result-item"
          @click="navigateTo(item.path)"
        >
          <el-icon :size="16"><component :is="item.icon" /></el-icon>
          <span class="item-title">{{ item.title }}</span>
          <span class="item-path">{{ item.path }}</span>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search, Close, LocationFilled, ChatLineSquare, Promotion,
  Odometer, Collection, UserFilled, Histogram, TrendCharts, Money
} from '@element-plus/icons-vue'
import knowledgeAPI from '../api/knowledge'
import faqAPI from '../api/faq'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const router = useRouter()
const inputRef = ref(null)
const keyword = ref('')
const spots = ref([])
const faqs = ref([])
const activeGroup = ref('mod')
const activeIdx = ref(0)

// 静态模块列表（与路由表保持一致）
const modules = [
  { path: '/dashboard', title: '数据大屏', icon: Odometer },
  { path: '/knowledge', title: '知识库管理', icon: Collection },
  { path: '/faq', title: 'FAQ 管理', icon: ChatLineSquare },
  { path: '/digital-human', title: '数字人配置', icon: UserFilled },
  { path: '/reports/interaction', title: '交互概览', icon: Histogram },
  { path: '/reports/sentiment', title: '情感趋势', icon: TrendCharts },
  { path: '/marketing', title: '营销分析', icon: Money }
]

// 未搜索时显示的快捷链接
const quickLinks = modules.filter(m => m.path !== '/marketing')

// 过滤模块
const filteredModules = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return []
  return modules.filter(m =>
    m.title.toLowerCase().includes(kw) ||
    m.path.toLowerCase().includes(kw)
  )
})

// 过滤景点
const filteredSpots = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return []
  return spots.value.filter(s =>
    (s.name && s.name.toLowerCase().includes(kw)) ||
    (s.title && s.title.toLowerCase().includes(kw))
  ).slice(0, 8)
})

// 过滤FAQ
const filteredFaqs = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return []
  return faqs.value.filter(f =>
    (f.q && f.q.toLowerCase().includes(kw)) ||
    (f.a && f.a.toLowerCase().includes(kw))
  ).slice(0, 8)
})

// 结果分组顺序
const resultGroups = computed(() => {
  const groups = []
  if (filteredModules.value.length) groups.push({ key: 'mod', items: filteredModules.value })
  if (filteredSpots.value.length) groups.push({ key: 'spot', items: filteredSpots.value })
  if (filteredFaqs.value.length) groups.push({ key: 'faq', items: filteredFaqs.value })
  return groups
})

const hasResults = computed(() => resultGroups.value.length > 0)

// 判断当前激活项
function isActive(group, idx) {
  return activeGroup.value === group && activeIdx.value === idx
}

function setActive(group, idx) {
  activeGroup.value = group
  activeIdx.value = idx
}

// 键盘上下移动选择
function moveSelection(delta) {
  const groups = resultGroups.value
  if (!groups.length) return

  const currentGroupIdx = groups.findIndex(g => g.key === activeGroup.value)
  if (currentGroupIdx === -1) {
    activeGroup.value = groups[0].key
    activeIdx.value = 0
    return
  }

  const group = groups[currentGroupIdx]
  const newIdx = activeIdx.value + delta

  if (newIdx >= 0 && newIdx < group.items.length) {
    // 在当前分组内移动
    activeIdx.value = newIdx
  } else if (delta > 0 && currentGroupIdx < groups.length - 1) {
    // 移到下一个分组的第一项
    activeGroup.value = groups[currentGroupIdx + 1].key
    activeIdx.value = 0
  } else if (delta < 0 && currentGroupIdx > 0) {
    // 移到上一个分组的最后一项
    const prevGroup = groups[currentGroupIdx - 1]
    activeGroup.value = prevGroup.key
    activeIdx.value = prevGroup.items.length - 1
  }
}

// 回车导航到第一个结果
function navigateFirstResult() {
  const groups = resultGroups.value
  if (!groups.length) return

  const group = groups.find(g => g.key === activeGroup.value) || groups[0]
  const item = group.items[activeIdx.value] || group.items[0]

  if (group.key === 'mod') {
    navigateTo(item.path)
  } else if (group.key === 'spot') {
    navigateToSpot(item._id)
  } else if (group.key === 'faq') {
    navigateToFAQ()
  }
}

function navigateTo(path) {
  visible.value = false
  router.push(path)
}

function navigateToSpot(id) {
  visible.value = false
  router.push({ path: `/knowledge/edit/${id}`, query: { collection: 'knowledge' } })
}

function navigateToFAQ() {
  visible.value = false
  router.push('/faq')
}

function clearSearch() {
  keyword.value = ''
  activeGroup.value = 'mod'
  activeIdx.value = 0
  nextTick(() => inputRef.value?.focus())
}

function handleSearch() {
  // 搜索词变化时重置选中
  activeGroup.value = resultGroups.value[0]?.key || 'mod'
  activeIdx.value = 0
}

// 对话框打开时聚焦输入框并预加载数据
async function handleOpened() {
  keyword.value = ''
  activeGroup.value = 'mod'
  activeIdx.value = 0
  nextTick(() => inputRef.value?.focus())

  // 预加载知识库和FAQ数据用于搜索
  if (!spots.value.length) {
    try {
      const res = await knowledgeAPI.getList({ collection: 'knowledge', page: 1, pageSize: 200 })
      spots.value = res.list || []
    } catch (e) {
      console.warn('预加载知识库失败:', e)
      spots.value = []
    }
  }
  if (!faqs.value.length) {
    try {
      faqs.value = await faqAPI.getFAQList()
    } catch (e) {
      console.warn('预加载FAQ失败:', e)
      faqs.value = []
    }
  }
}
</script>

<style scoped>
.search-dialog :deep(.el-dialog) {
  border-radius: 18px;
  background: #fffaf0;
  box-shadow: 0 24px 64px rgba(18, 18, 15, 0.24);
}

.search-dialog :deep(.el-dialog__header) {
  display: none;
}

.search-dialog :deep(.el-dialog__body) {
  padding: 20px 24px 24px;
}

/* 搜索输入区 */
.search-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border: 2px solid rgba(96, 153, 184, 0.28);
  border-radius: 14px;
  background: rgba(255, 250, 240, 0.6);
  transition: border-color 0.2s;
}

.search-input-wrap:focus-within {
  border-color: #6099b8;
  box-shadow: 0 0 0 3px rgba(96, 153, 184, 0.12);
}

.search-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-primary);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.clear-btn {
  flex-shrink: 0;
  color: var(--text-secondary);
}

/* 默认提示 */
.search-default {
  margin-top: 20px;
}

.default-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 10px;
  background: rgba(96, 153, 184, 0.06);
  color: var(--text-secondary);
  font-size: 13px;
}

.quick-links {
  margin-top: 16px;
}

/* 搜索结果 */
.search-results {
  margin-top: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.result-group {
  margin-bottom: 8px;
}

.group-label {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-regular);
  transition: background 0.15s, color 0.15s;
}

.result-item:hover,
.result-item.active {
  background: rgba(96, 153, 184, 0.12);
  color: var(--text-primary);
}

.result-item .item-title {
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-item .item-path {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
  flex-shrink: 0;
}

.result-item .item-desc {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.no-results {
  margin-top: 24px;
}
</style>
