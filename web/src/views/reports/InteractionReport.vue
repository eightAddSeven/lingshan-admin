<template>
  <div class="page-container">
    <div class="page-header">
      <h2>
        <el-icon><DataAnalysis /></el-icon>
        交互概览
      </h2>
      <p>AI 导游对话数据统计与分析</p>
    </div>

    <!-- 概览卡片 -->
    <el-row :gutter="14">
      <el-col :span="6" v-for="card in overviewCards" :key="card.label">
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

    <!-- 时间筛选 -->
    <div class="card-box" style="margin-top: 14px">
      <div class="filter-bar">
        <span style="color: var(--text-regular); font-weight: 500">时间范围：</span>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          @change="loadData"
        />
        <el-button type="primary" @click="loadData">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
      </div>
    </div>

    <!-- 趋势图 -->
    <el-row :gutter="14" style="margin-top: 14px">
      <el-col :span="16">
        <div class="card-box chart-box">
          <h3 class="chart-title">
            <el-icon><TrendCharts /></el-icon>
            日对话量趋势
          </h3>
          <div ref="trendChart" style="height: 300px"></div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="card-box chart-box">
          <h3 class="chart-title">
            <el-icon><PieChart /></el-icon>
            景点提问分布
          </h3>
          <div ref="spotPie" style="height: 300px"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 意图分布 -->
    <div class="card-box chart-box" style="margin-top: 14px">
      <h3 class="chart-title">
        <el-icon><Histogram /></el-icon>
        意图分类统计
      </h3>
      <div ref="intentChart" style="height: 280px"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import reportsAPI from '../../api/reports'
import { DataAnalysis, TrendCharts, PieChart, Histogram, Search, ChatDotRound, Timer, User, Refresh } from '@element-plus/icons-vue'

const dateRange = ref([])
const overviewCards = ref([
  { label: '总对话次数', value: '--', iconComp: ChatDotRound, bg: 'rgba(59,130,246,.16)', color: '#3b82f6' },
  { label: '日均对话', value: '--', iconComp: Timer, bg: 'rgba(34,197,94,.14)', color: '#22c55e' },
  { label: '独立用户数', value: '--', iconComp: User, bg: 'rgba(234,179,8,.15)', color: '#eab308' },
  { label: '平均对话轮次', value: '--', iconComp: Refresh, bg: 'rgba(236,72,153,.16)', color: '#ec4899' }
])

const trendChart = ref(null)
const spotPie = ref(null)
const intentChart = ref(null)
let charts = []

function initChart(refEl, option) {
  if (!refEl.value) return
  const chart = echarts.init(refEl.value)
  chart.setOption(option)
  charts.push(chart)
}

const BRAND_GREEN = '#3d7a5c'
const CHART_COLORS = ['#3d7a5c', '#6ba386', '#8fc4a8', '#64748b', '#94a3b8', '#475569', '#b3d9c4', '#cbd5e1']

async function loadData() {
  try {
    const res = await reportsAPI.getOverview({
      startDate: dateRange.value?.[0],
      endDate: dateRange.value?.[1]
    })

    if (res?.summary) {
      overviewCards.value[0].value = res.summary.totalChats ?? '--'
      overviewCards.value[1].value = res.summary.dailyAvg ?? '--'
      overviewCards.value[2].value = res.summary.uniqueUsers ?? '--'
      overviewCards.value[3].value = res.summary.avgRounds ?? '--'
    }

    if (res?.daily) {
      initChart(trendChart, {
        tooltip: { trigger: 'axis', backgroundColor: '#fffaf0', borderColor: 'rgba(31,29,23,.12)', textStyle: { color: '#181814', fontSize: 12 } },
        grid: { left: 48, right: 24, top: 24, bottom: 32 },
        xAxis: { type: 'category', data: res.daily.map(d => d.date), axisLine: { lineStyle: { color: 'rgba(31,29,23,.12)' } }, axisTick: { show: false }, axisLabel: { color: '#817c70', fontSize: 11 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(31,29,23,.08)' } }, axisLabel: { color: '#817c70', fontSize: 11 } },
        series: [{
          data: res.daily.map(d => d.count),
          type: 'bar',
          barWidth: '60%',
          itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#7dba9a' }, { offset: 1, color: BRAND_GREEN }]), borderRadius: [4, 4, 0, 0] }
        }]
      })
    }

    if (res?.spotDist) {
      initChart(spotPie, {
        tooltip: { trigger: 'item', backgroundColor: '#fffaf0', borderColor: 'rgba(31,29,23,.12)', textStyle: { color: '#181814', fontSize: 12 } },
        color: CHART_COLORS,
        series: [{
          type: 'pie', radius: ['50%', '78%'], center: ['50%', '52%'],
          data: res.spotDist.map(s => ({ name: s.name, value: s.count })),
          label: { color: '#817c70', fontSize: 11 }
        }]
      })
    }

    if (res?.intentDist) {
      initChart(intentChart, {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#fffaf0', borderColor: 'rgba(31,29,23,.12)', textStyle: { color: '#181814', fontSize: 12 } },
        grid: { left: 100, right: 40, top: 10, bottom: 20 },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(31,29,23,.08)' } }, axisLabel: { color: '#817c70', fontSize: 11 } },
        yAxis: { type: 'category', inverse: true, data: res.intentDist.map(i => i.name), axisLabel: { color: '#4c4a42', fontSize: 11 }, axisTick: { show: false } },
        series: [{
          type: 'bar', data: res.intentDist.map(i => i.count),
          itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#858ca3' }, { offset: 1, color: '#858ca3' }]), borderRadius: [0, 4, 4, 0] },
          barWidth: 14
        }]
      })
    }
  } catch (e) {
    console.error('加载报告失败', e)
  }
}

onMounted(() => loadData())
onUnmounted(() => charts.forEach(c => c.dispose()))
</script>

<style scoped>
.chart-box {
  margin-bottom: 0;
}
</style>
