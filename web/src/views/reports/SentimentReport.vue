<template>
  <div class="page-container">
    <div class="page-header">
      <h2>
        <el-icon><TrendCharts /></el-icon>
        情感趋势与盲区分析
      </h2>
      <p>知识库覆盖盲区提示、未满足问题统计</p>
    </div>

    <!-- 概览卡片 -->
    <el-row :gutter="14">
      <el-col :span="8" v-for="card in cards" :key="card.label">
        <div class="stat-card">
          <div class="stat-icon" :style="{ background: card.bg, color: card.color }">
            <el-icon :size="20"><component :is="card.iconComp" /></el-icon>
          </div>
          <div class="stat-body">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表行 -->
    <el-row :gutter="14" style="margin-top: 14px">
      <el-col :span="12">
        <div class="card-box chart-box">
          <h3 class="chart-title">
            <el-icon><TrendCharts /></el-icon>
            近7天满意度趋势
          </h3>
          <div ref="sentimentChart" style="height: 300px"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="card-box chart-box">
          <h3 class="chart-title">
            <el-icon><WarningFilled /></el-icon>
            知识库盲区 Top 10
          </h3>
          <div ref="blindChart" style="height: 300px"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 未满足问题列表 -->
    <div class="card-box" style="margin-top: 14px">
      <h3 class="chart-title" style="margin-bottom: 16px">
        <el-icon><QuestionFilled /></el-icon>
        近期未满足问题（可能需补充知识库）
      </h3>
      <el-table :data="unmetList" stripe>
        <template #empty>
          <el-empty description="暂无未满足问题" :image-size="80" />
        </template>
        <el-table-column prop="question" label="问题" min-width="320" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="unmet-question">{{ row.question }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="count" label="出现次数" width="110" align="center">
          <template #default="{ row }">
            <el-tag type="warning" effect="plain" size="small">{{ row.count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastTime" label="最近出现" width="170" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import reportsAPI from '../../api/reports'
import { TrendCharts, WarningFilled, QuestionFilled, CircleCheckFilled, CircleCloseFilled, StarFilled } from '@element-plus/icons-vue'

const cards = ref([
  { label: '已回答问题', value: '--', iconComp: CircleCheckFilled, bg: 'rgba(156,199,221,.28)', color: '#6099b8' },
  { label: '未满足问题', value: '--', iconComp: CircleCloseFilled, bg: 'rgba(240,214,111,.22)', color: '#a98621' },
  { label: '用户满意度', value: '--', iconComp: StarFilled, bg: 'rgba(223,159,201,.24)', color: '#b75693' }
])

const unmetList = ref([])
const sentimentChart = ref(null)
const blindChart = ref(null)
let charts = []

function initChart(refEl, option) {
  if (!refEl.value) return
  const existing = echarts.getInstanceByDom(refEl.value)
  if (existing) existing.dispose()
  const chart = echarts.init(refEl.value)
  chart.setOption(option)
  charts.push(chart)
}

const SKY = '#9cc7dd'
const ACCENT = '#df9fc9'
const BRAND = '#9eaa68'
const WARM = '#f0d66f'

async function loadData() {
  try {
    const res = await reportsAPI.getSentiment()

    if (res?.summary) {
      cards.value[0].value = res.summary.answered ?? '--'
      cards.value[1].value = res.summary.unmet ?? '--'
      cards.value[2].value = res.summary.satisfaction ? res.summary.satisfaction + '%' : '--'
    }

    unmetList.value = res?.unmetList || []

    if (res?.dailySentiment) {
      initChart(sentimentChart, {
        tooltip: { trigger: 'axis', backgroundColor: '#fffaf0', borderColor: 'rgba(31,29,23,.12)', textStyle: { color: '#181814', fontSize: 12 } },
        grid: { left: 48, right: 24, top: 30, bottom: 32 },
        legend: { data: ['满意', '一般', '未满足'], bottom: 0, textStyle: { color: '#817c70', fontSize: 12 } },
        xAxis: { type: 'category', data: res.dailySentiment.map(d => d.date), axisLine: { lineStyle: { color: 'rgba(31,29,23,.12)' } }, axisTick: { show: false }, axisLabel: { color: '#817c70', fontSize: 11 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(31,29,23,.08)' } }, axisLabel: { color: '#817c70', fontSize: 11 } },
        series: [
          { name: '满意', type: 'line', data: res.dailySentiment.map(d => d.good), stack: 'total', smooth: true, areaStyle: { opacity: 0.42 }, itemStyle: { color: SKY }, lineStyle: { width: 2, color: SKY } },
          { name: '一般', type: 'line', data: res.dailySentiment.map(d => d.fair), stack: 'total', smooth: true, areaStyle: { opacity: 0.42 }, itemStyle: { color: WARM }, lineStyle: { width: 2, color: WARM } },
          { name: '未满足', type: 'line', data: res.dailySentiment.map(d => d.poor), stack: 'total', smooth: true, areaStyle: { opacity: 0.42 }, itemStyle: { color: ACCENT }, lineStyle: { width: 2, color: ACCENT } }
        ]
      })
    }

    if (res?.blindSpots) {
      initChart(blindChart, {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#fffaf0', borderColor: 'rgba(31,29,23,.12)', textStyle: { color: '#181814', fontSize: 12 } },
        grid: { left: 100, right: 40, top: 10, bottom: 20 },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(31,29,23,.08)' } }, axisLabel: { color: '#817c70', fontSize: 11 } },
        yAxis: { type: 'category', inverse: true, data: res.blindSpots.map(b => b.keyword), axisLabel: { width: 80, overflow: 'truncate', color: '#4c4a42', fontSize: 11 }, axisTick: { show: false } },
        series: [{
          type: 'bar', data: res.blindSpots.map(b => b.count),
          itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: ACCENT }, { offset: 0.52, color: SKY }, { offset: 1, color: BRAND }]), borderRadius: [0, 6, 6, 0] },
          barWidth: 14
        }]
      })
    }
  } catch (e) {
    console.error('加载情感报告失败', e)
  }
}

onMounted(() => loadData())
onUnmounted(() => charts.forEach(c => c.dispose()))
</script>

<style scoped>
.chart-box {
  margin-bottom: 0;
}

.unmet-question {
  font-weight: 500;
}
</style>
