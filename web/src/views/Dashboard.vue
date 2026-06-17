<template>
  <div class="page-container">
    <div class="dashboard-hero">
      <div>
        <p class="eyebrow">LINGSHAN AI GUIDE</p>
        <h2>灵山胜境运营工作台</h2>
        <span>实时服务概览、游客意图与热门内容反馈</span>
      </div>
      <div class="hero-actions">
        <el-button @click="loadTrend(30)" :loading="loading">
          <el-icon><Calendar /></el-icon>
          近30天
        </el-button>
        <el-button type="primary" @click="refreshAll">
          <el-icon><Odometer /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <div class="dashboard-grid">
      <section class="main-column">
        <div class="kpi-strip">
          <div class="stat-card" v-for="card in kpiCards" :key="card.label">
            <div class="stat-icon" :style="{ background: card.bg, color: card.color }">
              <el-icon :size="20"><component :is="card.iconComp" /></el-icon>
            </div>
            <div class="stat-body">
              <div class="stat-value">
                {{ card.value }}
                <span v-if="card.trend" :class="['trend-badge', card.trend > 0 ? 'up' : 'down']">
                  {{ card.trend > 0 ? '+' : '' }}{{ card.trend }}%
                </span>
              </div>
              <div class="stat-label">{{ card.label }}</div>
            </div>
          </div>
        </div>

        <div class="card-box chart-box trend-panel">
          <div class="section-heading">
            <div>
              <h3>服务人次趋势</h3>
              <span>近30天实时访问与咨询增长</span>
            </div>
            <div class="avatar-stack">
              <span>运</span><span>客</span><span>AI</span>
            </div>
          </div>
          <div ref="trendChart" class="chart trend-chart"></div>
        </div>

        <div class="lower-grid">
          <div class="card-box chart-box">
            <div class="section-heading compact">
              <h3>热门问答 Top 10</h3>
            </div>
            <div v-if="summary.hotQA && summary.hotQA.length > 0" ref="hotQaChart" class="chart small-chart"></div>
            <el-empty v-else description="暂无问答数据" :image-size="60" />
          </div>
          <div class="card-box task-board">
            <div class="section-heading compact">
              <h3>服务任务池</h3>
              <span>今日跟进</span>
            </div>
            <div class="task-list">
              <article v-for="task in serviceTasks" :key="task.title" :class="['task-card', task.tone]">
                <div class="task-tags">
                  <span>{{ task.tag }}</span>
                  <el-icon><MoreFilled /></el-icon>
                </div>
                <h4>{{ task.title }}</h4>
                <p>{{ task.desc }}</p>
                <div class="task-meta">
                  <span>{{ task.owner }}</span>
                  <strong>{{ task.progress }}</strong>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <aside class="side-column">
        <div class="card-box chart-box">
          <div class="section-heading compact">
            <h3>意图分类分布</h3>
            <span>游客问题结构</span>
          </div>
          <div v-if="summary.intentDist && summary.intentDist.length > 0" ref="intentChart" class="chart donut-chart"></div>
          <el-empty v-else description="暂无数据" :image-size="60" />
        </div>

        <div class="card-box team-panel">
          <div class="section-heading compact">
            <h3>运营协同</h3>
            <span>7 人在线</span>
          </div>
          <div class="message-list">
            <article v-for="item in teamMessages" :key="item.name" class="message-item">
              <div class="message-avatar">{{ item.name.slice(0, 1) }}</div>
              <div>
                <strong>{{ item.name }}</strong>
                <p>{{ item.text }}</p>
                <span>{{ item.time }}</span>
              </div>
            </article>
          </div>
        </div>

        <div class="card-box chart-box">
          <div class="section-heading compact">
            <h3>热点景点关注度</h3>
          </div>
          <div v-if="summary.hotSpots && summary.hotSpots.length > 0" ref="spotChart" class="chart small-chart"></div>
          <el-empty v-else description="暂无数据" :image-size="60" />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, nextTick, markRaw } from 'vue'
import * as echarts from 'echarts'
import dashboardAPI from '../api/dashboard'
import {
  Calendar, MoreFilled, Odometer, TrendCharts,
  User, Timer, Tickets, Medal
} from '@element-plus/icons-vue'

const loading = ref(false)

// KPI 卡片
const kpiCards = ref([
  { label: '今日服务人次', value: '--', trend: null, iconComp: markRaw(User), bg: 'rgba(223,159,201,.28)', color: '#b75693' },
  { label: '本周服务人次', value: '--', trend: null, iconComp: markRaw(Timer), bg: 'rgba(156,199,221,.28)', color: '#6099b8' },
  { label: '累计服务人次', value: '--', trend: null, iconComp: markRaw(Tickets), bg: 'rgba(245,158,11,.15)', color: '#f59e0b' },
  { label: '活跃用户数', value: '--', trend: null, iconComp: markRaw(TrendCharts), bg: 'rgba(223,159,201,.22)', color: '#b75693' },
  { label: '满意度率', value: '--', trend: null, iconComp: markRaw(Medal), bg: 'rgba(158,170,104,.20)', color: '#7f8b4c' }
])

// 汇总数据
const summary = reactive({
  hotQA: [],
  intentDist: [],
  hotSpots: []
})

// 服务任务（静态运营数据）
const serviceTasks = [
  { tag: '#内容', title: '更新梵宫讲解词', desc: '补充夜场开放与动线提示。', owner: '知识库', progress: '76%', tone: 'purple' },
  { tag: '#预警', title: '门票咨询高峰', desc: '午后问询量上升，需检查 FAQ 命中率。', owner: '客服', progress: '42%', tone: 'yellow' },
  { tag: '#巡检', title: '数字人播报测试', desc: '确认移动端语音播报链路。', owner: '导览', progress: '88%', tone: 'cyan' }
]

// 协同消息（静态）
const teamMessages = [
  { name: '运营', text: '九龙灌浴表演时间的咨询正在升高。', time: '09:26' },
  { name: '内容', text: '已同步新版路线推荐，等待审核。', time: '10:12' },
  { name: '客服', text: '建议把门票问题置顶到 FAQ。', time: '11:04' }
]

// 图表 refs
const trendChart = ref(null)
const intentChart = ref(null)
const hotQaChart = ref(null)
const spotChart = ref(null)
let charts = []

function initChart(refEl, option) {
  if (!refEl.value) return null
  const chart = echarts.init(refEl.value)
  chart.setOption(option)
  charts.push(chart)
  return chart
}

function disposeAllCharts() {
  charts.forEach(c => {
    try { c.dispose() } catch (e) { /* ignore */ }
  })
  charts = []
}

const BRAND = '#9eaa68'
const ACCENT = '#df9fc9'
const SKY = '#9cc7dd'
const CHART_COLORS = ['#9eaa68', '#df9fc9', '#9cc7dd', '#f0d66f', '#82b58c', '#d59b74', '#8b8f7a']

// 渲染趋势图
function renderTrend(daily) {
  if (!trendChart.value) return
  initChart(trendChart, {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fffaf0',
      borderColor: 'rgba(31,29,23,.12)',
      textStyle: { color: '#181814', fontSize: 12 }
    },
    grid: { left: 48, right: 24, top: 24, bottom: 32 },
    xAxis: {
      type: 'category',
      data: daily.map(d => d.date),
      axisLine: { lineStyle: { color: 'rgba(31,29,23,.12)' } },
      axisTick: { show: false },
      axisLabel: { color: '#817c70', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(31,29,23,.08)' } },
      axisLabel: { color: '#817c70', fontSize: 11 }
    },
    series: [{
      data: daily.map(d => d.count),
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(158,170,104,0.24)' },
          { offset: 0.52, color: 'rgba(156,199,221,0.18)' },
          { offset: 1, color: 'rgba(223,159,201,0.02)' }
        ])
      },
      lineStyle: { color: SKY, width: 3 },
      itemStyle: { color: ACCENT }
    }]
  })
}

// 渲染意图饼图
function renderIntent(intentDist) {
  if (!intentChart.value) return
  initChart(intentChart, {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fffaf0',
      borderColor: 'rgba(31,29,23,.12)',
      textStyle: { color: '#181814', fontSize: 12 }
    },
    color: CHART_COLORS,
    series: [{
      type: 'pie',
      radius: ['55%', '80%'],
      center: ['50%', '52%'],
      data: intentDist,
      label: { color: '#4c4a42', fontSize: 11 },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(0,0,0,0.12)' } }
    }]
  })
}

// 渲染热门问答
function renderHotQA(hotQA) {
  if (!hotQaChart.value) return
  const reversed = [...hotQA].reverse()
  initChart(hotQaChart, {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#fffaf0',
      borderColor: 'rgba(31,29,23,.12)',
      textStyle: { color: '#181814', fontSize: 12 }
    },
    grid: { left: 120, right: 40, top: 10, bottom: 20 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(31,29,23,.08)' } }, axisLabel: { color: '#817c70', fontSize: 11 } },
    yAxis: {
      type: 'category', inverse: true,
      data: reversed.map(q => q.question),
      axisLabel: { width: 100, overflow: 'truncate', color: '#4c4a42', fontSize: 11 },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: reversed.map(q => q.count),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: ACCENT },
          { offset: 0.55, color: SKY },
          { offset: 1, color: BRAND }
        ]),
        borderRadius: [0, 4, 4, 0]
      },
      barWidth: 14
    }]
  })
}

// 渲染景点热度
function renderHotSpots(hotSpots) {
  if (!spotChart.value) return
  const reversed = [...hotSpots].reverse()
  initChart(spotChart, {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#fffaf0',
      borderColor: 'rgba(31,29,23,.12)',
      textStyle: { color: '#181814', fontSize: 12 }
    },
    grid: { left: 100, right: 40, top: 10, bottom: 20 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(31,29,23,.08)' } }, axisLabel: { color: '#817c70', fontSize: 11 } },
    yAxis: {
      type: 'category', inverse: true,
      data: reversed.map(s => s.name),
      axisLabel: { color: '#4c4a42', fontSize: 11 },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: reversed.map(s => s.count),
      itemStyle: { color: SKY, borderRadius: [0, 4, 4, 0] },
      barWidth: 14
    }]
  })
}

// 加载汇总数据
async function loadSummary() {
  try {
    const res = await dashboardAPI.getSummary()
    if (!res) return

    // 更新 KPI 卡片
    const kpi = res.kpi
    kpiCards.value[0].value = kpi.todayCount ?? '--'
    kpiCards.value[1].value = kpi.weekCount ?? '--'
    kpiCards.value[2].value = kpi.totalCount ?? '--'
    kpiCards.value[3].value = kpi.activeUsers ?? '--'
    kpiCards.value[4].value = kpi.satisfactionRate ?? '--'

    // 更新汇总数据
    summary.hotQA = res.hotQA || []
    summary.intentDist = res.intentDist || []
    summary.hotSpots = res.hotSpots || []

    // 更新图表
    await nextTick()
    if (summary.intentDist.length > 0) renderIntent(summary.intentDist)
    if (summary.hotQA.length > 0) renderHotQA(summary.hotQA)
    if (summary.hotSpots.length > 0) renderHotSpots(summary.hotSpots)
  } catch (err) {
    console.error('加载大屏汇总失败:', err)
  }
}

// 加载趋势
async function loadTrend(days) {
  loading.value = true
  try {
    const res = await dashboardAPI.getTrend(days)
    if (res?.daily && res.daily.length > 0) {
      await nextTick()
      renderTrend(res.daily)
    }
  } catch (err) {
    console.error('加载趋势失败:', err)
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await Promise.all([loadSummary(), loadTrend(30)])
}

onMounted(() => refreshAll())
onUnmounted(() => disposeAllCharts())
</script>

<style scoped>
.dashboard-hero {
  min-height: 104px;
  margin-bottom: 16px;
  padding: 8px 2px 18px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.eyebrow {
  margin-bottom: 8px;
  color: #6099b8;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.dashboard-hero h2 {
  color: var(--text-primary);
  font-size: 28px;
  line-height: 1.2;
  font-weight: 800;
}

.dashboard-hero span {
  display: inline-block;
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
}

.main-column,
.side-column {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 16px;
}

.kpi-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(140px, 1fr));
  gap: 12px;
}

.trend-panel {
  padding-bottom: 16px;
}

.section-heading {
  margin-bottom: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.section-heading h3 {
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 800;
}

.section-heading span {
  color: var(--text-secondary);
  font-size: 12px;
}

.section-heading.compact {
  align-items: center;
  margin-bottom: 10px;
}

.section-heading.compact h3 {
  font-size: 15px;
}

.avatar-stack {
  display: flex;
  align-items: center;
}

.avatar-stack span {
  width: 30px;
  height: 30px;
  margin-left: -8px;
  border: 2px solid var(--bg-card-solid);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #15130f;
  background: var(--sky);
  font-size: 11px;
  font-weight: 700;
}

.chart {
  width: 100%;
}

.trend-chart {
  height: 320px;
}

.donut-chart {
  height: 265px;
}

.small-chart {
  height: 270px;
}

.lower-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 16px;
}

.task-board {
  overflow: hidden;
}

.task-list {
  display: grid;
  gap: 10px;
}

.task-card {
  min-height: 112px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 250, 240, 0.58);
}

.task-card.purple {
  background: linear-gradient(145deg, rgba(223, 159, 201, 0.26), rgba(255, 250, 240, 0.58));
}

.task-card.yellow {
  background: linear-gradient(145deg, rgba(245, 158, 11, 0.18), rgba(255, 250, 240, 0.58));
}

.task-card.cyan {
  background: linear-gradient(145deg, rgba(156, 199, 221, 0.28), rgba(255, 250, 240, 0.58));
}

.task-tags,
.task-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.task-tags span {
  padding: 2px 8px;
  border-radius: 999px;
  color: #15130f;
  background: rgba(156, 199, 221, 0.72);
  font-size: 11px;
  font-weight: 700;
}

.task-card h4 {
  margin-top: 10px;
  color: var(--text-primary);
  font-size: 14px;
}

.task-card p {
  margin-top: 5px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.task-meta {
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.task-meta strong {
  color: var(--text-primary);
}

.team-panel {
  min-height: 272px;
}

.message-list {
  display: grid;
  gap: 12px;
}

.message-item {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #15130f;
  background: #9cc7dd;
  font-weight: 700;
}

.message-item strong {
  color: var(--text-primary);
  font-size: 13px;
}

.message-item p {
  margin: 4px 0;
  padding: 9px 10px;
  border-radius: 10px;
  color: var(--text-regular);
  background: rgba(18, 18, 15, 0.045);
  font-size: 12px;
  line-height: 1.5;
}

.message-item span {
  color: var(--text-secondary);
  font-size: 11px;
}

.trend-badge {
  font-size: 12px;
  font-weight: 600;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 4px;
  display: inline-block;
  vertical-align: middle;
}
.trend-badge.up {
  color: var(--success);
  background: var(--success-light);
}
.trend-badge.down {
  color: var(--danger);
  background: var(--danger-light);
}

.stat-card .stat-value {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
}

@media (max-width: 1280px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .side-column {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .kpi-strip,
  .lower-grid,
  .side-column {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .dashboard-hero,
  .hero-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .kpi-strip,
  .lower-grid,
  .side-column {
    grid-template-columns: 1fr;
  }
  .dashboard-hero h2 {
    font-size: 23px;
  }
}
</style>
