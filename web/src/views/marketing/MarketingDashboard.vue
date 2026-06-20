<template>
  <div class="page-container">
    <div class="page-header">
      <h2>
        <el-icon><TrendCharts /></el-icon>
        营销分析看板
      </h2>
      <p>基于灵山景区游客消费行为数据，辅助营销决策</p>
    </div>

    <div v-if="loading" class="loading-wrap">
      <el-skeleton :rows="8" animated />
    </div>

    <template v-else-if="hasData">
      <!-- KPI 卡片 -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">灵山游客总数</div>
          <div class="kpi-value">{{ stats.totalVisitors }}<small>人</small></div>
          <div class="kpi-sub">灵山胜境 + 灵山大佛 + 拈花湾</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">人均消费</div>
          <div class="kpi-value">¥{{ stats.avgTotalCost.toFixed(0) }}<small></small></div>
          <div class="kpi-sub">含门票/餐饮/购物/交通/娱乐</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">平均满意度</div>
          <div class="kpi-value">{{ stats.avgSatisfaction.toFixed(2) }}<small>/5</small></div>
          <div class="kpi-sub">{{ getSatisfactionLabel(stats.avgSatisfaction) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">游客回头率</div>
          <div class="kpi-value">{{ stats.returnRate.toFixed(1) }}<small>%</small></div>
          <div class="kpi-sub">同一游客多次到访灵山</div>
        </div>
      </div>

      <!-- 图表区 -->
      <div class="charts-row">
        <!-- 消费趋势 -->
        <div class="chart-card">
          <div class="chart-title">消费趋势（月度）</div>
          <div ref="trendChart" class="chart-box"></div>
        </div>
        <!-- 消费结构 -->
        <div class="chart-card">
          <div class="chart-title">消费结构占比</div>
          <div ref="pieChart" class="chart-box"></div>
        </div>
      </div>

      <div class="charts-row">
        <!-- 满意度分布 -->
        <div class="chart-card">
          <div class="chart-title">满意度分布</div>
          <div ref="satisfactionChart" class="chart-box"></div>
        </div>
        <!-- 景点对比 -->
        <div class="chart-card">
          <div class="chart-title">三景点核心指标对比</div>
          <div ref="compareChart" class="chart-box"></div>
        </div>
      </div>

      <div class="charts-row">
        <!-- 游客年龄分布 -->
        <div class="chart-card">
          <div class="chart-title">游客年龄分布</div>
          <div ref="ageChart" class="chart-box"></div>
        </div>
        <!-- 性别 + 团队规模 -->
        <div class="chart-card">
          <div class="chart-title">性别比例 & 团队规模</div>
          <div ref="profileChart" class="chart-box"></div>
        </div>
      </div>

      <!-- 营销建议 -->
      <div class="insight-card">
        <div class="insight-title">
          <el-icon><WarningFilled /></el-icon>
          智能营销建议
        </div>
        <div class="insight-list">
          <div v-for="(insight, idx) in insights" :key="idx" class="insight-item">
            <span class="insight-dot" :style="{ background: insight.color }"></span>
            <div>
              <strong>{{ insight.title }}</strong>
              <p>{{ insight.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <el-empty v-else description="暂无消费数据，请先将灵山数据导入 CloudBase sales_data 集合" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import marketingAPI from '../../api/marketing'
import { TrendCharts, WarningFilled } from '@element-plus/icons-vue'

const loading = ref(true)
const rawData = ref([])

const trendChart = ref(null)
const pieChart = ref(null)
const satisfactionChart = ref(null)
const compareChart = ref(null)
const ageChart = ref(null)
const profileChart = ref(null)

const hasData = computed(() => rawData.value.length > 0)

const stats = computed(() => marketingAPI.computeStats(rawData.value))
const costStructure = computed(() => marketingAPI.computeCostStructure(rawData.value))
const monthlyTrend = computed(() => marketingAPI.computeMonthlyTrend(rawData.value))
const spotComparison = computed(() => marketingAPI.computeSpotComparison(rawData.value))

function getSatisfactionLabel(score) {
  if (score >= 4) return '整体满意'
  if (score >= 3) return '中等偏上'
  return '需提升'
}

const insights = computed(() => {
  const s = stats.value
  const cs = costStructure.value
  const sc = spotComparison.value
  const result = []

  // 满意度分析
  if (s.avgSatisfaction < 3.2) {
    result.push({
      color: '#e74c3c',
      title: '满意度偏低(3.06/5)，需重点关注服务体验',
      desc: '灵山三个景点满意度均在 3.0-3.1 之间，无一超过 3.2。建议加强导游服务培训、优化排队等候体验、提升餐饮品质。'
    })
  }

  // 消费结构分析
  const maxCategory = Object.entries(cs).sort((a, b) => b[1] - a[1])[0]
  result.push({
    color: '#f39c12',
    title: `「${getCategoryName(maxCategory[0])}」占消费主导(${maxCategory[1]}%)，可深挖增长空间`,
    desc: maxCategory[0] === 'shopping'
      ? '购物消费占比最高，建议在香月花街增设灵山文创专柜、限量版祈福纪念品，推出季节性限定商品吸引游客消费。'
      : maxCategory[0] === 'food'
        ? '餐饮消费占比最高，建议引入禅意素食套餐、灵山特色茶点，提升客单价与品牌溢价。'
        : `建议在${getCategoryName(maxCategory[0])}领域增加特色产品，提升客单价。`
  })

  // 拈花湾分析
  if (sc['禅意小镇·拈花湾']) {
    const nwh = sc['禅意小镇·拈花湾']
    if (nwh.avgCost > s.avgTotalCost) {
      result.push({
        color: '#3498db',
        title: '拈花湾人均消费最高(¥957)，可作为高端产品试验田',
        desc: `拈花湾购物${nwh.costStructure.shopping}%+餐饮${nwh.costStructure.food}%占比领先，建议优先在此推出高端禅意体验套餐、VIP 导览服务，测试市场反应后推广至灵山胜境。`
      })
    }
  }

  // 季节性策略
  const peakMonths = monthlyTrend.value.filter(m => m.count > 85)
  if (peakMonths.length > 0) {
    const peakNames = peakMonths.map(m => m.month).join('、')
    result.push({
      color: '#2E8B57',
      title: `${peakNames} 为旺季，建议提前储备资源`,
      desc: '旺季月均游客 80+ 人，建议提前 1 个月做好人员排班、物料储备、营销预热；淡季（10-11 月）可推出折扣套票、反季主题活动拉动客流。'
    })
  }

  // 回头率分析
  if (s.returnRate < 10) {
    result.push({
      color: '#9b59b6',
      title: '回头率偏低，建议建立会员体系',
      desc: '游客回头率不足 10%，建议推出灵山年卡、积分兑换、生日特权等会员权益，增强游客粘性；配合小程序推送新活动信息进行二次营销。'
    })
  }

  return result.slice(0, 5)
})

function getCategoryName(key) {
  const map = { ticket: '门票', food: '餐饮', shopping: '购物', transport: '交通', entertainment: '娱乐' }
  return map[key] || key
}

// ========== 图表渲染 ==========
function renderTrendChart() {
  if (!trendChart.value) return
  const chart = echarts.init(trendChart.value)
  const data = monthlyTrend.value
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['游客量', '人均消费'], textStyle: { color: '#999' } },
    grid: { left: 50, right: 50, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: data.map(d => d.month), axisLabel: { color: '#999' } },
    yAxis: [
      { type: 'value', name: '游客量(人)', nameTextStyle: { color: '#999' }, axisLabel: { color: '#999' } },
      { type: 'value', name: '人均消费(¥)', nameTextStyle: { color: '#999' }, axisLabel: { color: '#999' } }
    ],
    series: [
      {
        name: '游客量', type: 'line', data: data.map(d => d.count),
        smooth: true, lineStyle: { width: 3, color: '#3498db' },
        itemStyle: { color: '#3498db' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(52,152,219,0.3)' }, { offset: 1, color: 'rgba(52,152,219,0.02)' }
        ])}
      },
      {
        name: '人均消费', type: 'line', yAxisIndex: 1, data: data.map(d => d.avgCost),
        smooth: true, lineStyle: { width: 2, color: '#e74c3c', type: 'dashed' },
        itemStyle: { color: '#e74c3c' }
      }
    ]
  })
  return chart
}

function renderPieChart() {
  if (!pieChart.value) return
  const chart = echarts.init(pieChart.value)
  const cs = costStructure.value
  const data = Object.entries(cs).map(([k, v]) => ({ name: getCategoryName(k), value: v }))
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    legend: { bottom: 0, textStyle: { color: '#999' } },
    series: [{
      type: 'pie', radius: ['45%', '75%'], center: ['50%', '45%'],
      data, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } },
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 }
    }]
  })
  return chart
}

function renderSatisfactionChart() {
  if (!satisfactionChart.value) return
  const chart = echarts.init(satisfactionChart.value)
  const dist = marketingAPI.computeSatisfactionDist(rawData.value)
  const data = Object.entries(dist).map(([k, v]) => ({ name: k + '分', value: v }))
  const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#27ae60']
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: data.map(d => d.name), axisLabel: { color: '#999' } },
    yAxis: { type: 'value', name: '人数', nameTextStyle: { color: '#999' }, axisLabel: { color: '#999' } },
    series: [{
      type: 'bar', data: data.map((d, i) => ({ value: d.value, itemStyle: { color: colors[i], borderRadius: [4, 4, 0, 0] } })),
      barWidth: '50%', label: { show: true, position: 'top', color: '#666' }
    }]
  })
  return chart
}

function renderCompareChart() {
  if (!compareChart.value) return
  const chart = echarts.init(compareChart.value)
  const sc = spotComparison.value
  const names = Object.keys(sc)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['游客量', '人均消费(¥)', '满意度×100'], textStyle: { color: '#999' } },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: names, axisLabel: { color: '#999', rotate: 15 } },
    yAxis: { type: 'value', axisLabel: { color: '#999' } },
    series: [
      { name: '游客量', type: 'bar', data: names.map(n => sc[n].count), barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#3498db' } },
      { name: '人均消费(¥)', type: 'bar', data: names.map(n => sc[n].avgCost.toFixed(0)), barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#2ecc71' } },
      { name: '满意度×100', type: 'bar', data: names.map(n => (sc[n].avgSatisfaction * 100).toFixed(0)), barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#f39c12' } }
    ]
  })
  return chart
}

function renderAgeChart() {
  if (!ageChart.value) return
  const chart = echarts.init(ageChart.value)
  const profile = marketingAPI.computeVisitorProfile(rawData.value)
  const data = Object.entries(profile.ageGroups).map(([k, v]) => ({ name: k, value: v }))
  chart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 人' },
    legend: { bottom: 0, textStyle: { color: '#999' } },
    series: [{
      type: 'pie', radius: ['40%', '70%'], center: ['50%', '45%'],
      data, roseType: 'area',
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 }
    }]
  })
  return chart
}

function renderProfileChart() {
  if (!profileChart.value) return
  const chart = echarts.init(profileChart.value)
  const profile = marketingAPI.computeVisitorProfile(rawData.value)
  const genderData = Object.entries(profile.genderCount).map(([k, v]) => ({ name: k, value: v }))
  const groupData = Object.entries(profile.groupSizeCount).sort((a, b) => a[0] - b[0])

  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, textStyle: { color: '#999' } },
    grid: [{ left: 30, right: '55%', top: 10, bottom: 50 }, { left: '55%', right: 30, top: 10, bottom: 50 }],
    series: [
      {
        name: '性别', type: 'pie', center: ['25%', '45%'], radius: ['30%', '55%'],
        data: genderData, label: { formatter: '{b}\n{c}人' },
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 }
      },
      {
        name: '团队规模', type: 'bar', xAxisIndex: 1, yAxisIndex: 1,
        data: groupData.map(([k, v]) => ({ name: k + '人', value: v })),
        barWidth: '60%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#9b59b6' },
        label: { show: true, position: 'top', color: '#666' }
      }
    ],
    xAxis: [
      { show: false },
      { type: 'category', data: groupData.map(([k]) => k + '人'), axisLabel: { color: '#999' }, gridIndex: 1 }
    ],
    yAxis: [
      { show: false },
      { type: 'value', gridIndex: 1, axisLabel: { color: '#999' } }
    ]
  })
  return chart
}

// ========== 生命周期 ==========
let chartInstances = []

onMounted(async () => {
  loading.value = true
  rawData.value = await marketingAPI.getAllSales()
  loading.value = false

  await nextTick()
  chartInstances = [
    renderTrendChart(),
    renderPieChart(),
    renderSatisfactionChart(),
    renderCompareChart(),
    renderAgeChart(),
    renderProfileChart()
  ].filter(Boolean)

  // 窗口大小变化时自适应
  window.addEventListener('resize', () => chartInstances.forEach(c => c.resize()))
})
</script>

<style scoped>
.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.kpi-card {
  background: var(--bg-card, #fff);
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.kpi-label { font-size: 13px; color: #999; margin-bottom: 6px; }
.kpi-value { font-size: 32px; font-weight: 700; color: #15130f; }
.kpi-value small { font-size: 14px; font-weight: 400; color: #999; margin-left: 4px; }
.kpi-sub { font-size: 12px; color: #bbb; margin-top: 4px; }

.charts-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.chart-card {
  background: var(--bg-card, #fff);
  border-radius: 12px;
  padding: 20px 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}
.chart-box { width: 100%; height: 320px; }

.insight-card {
  background: var(--bg-card, #fff);
  border-radius: 12px;
  padding: 20px 24px;
  margin-top: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  border-left: 3px solid #f39c12;
}
.insight-title {
  font-size: 15px;
  font-weight: 700;
  color: #333;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.insight-list { display: grid; gap: 12px; }
.insight-item { display: flex; gap: 12px; align-items: flex-start; }
.insight-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.insight-item strong { font-size: 13px; color: #333; }
.insight-item p { font-size: 12px; color: #888; margin-top: 2px; line-height: 1.5; }

.loading-wrap { padding: 40px 0; }

@media (max-width: 1100px) {
  .kpi-row { grid-template-columns: repeat(2, 1fr); }
  .charts-row { grid-template-columns: 1fr; }
}
</style>
