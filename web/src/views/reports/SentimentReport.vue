<template>
  <div class="page-container">
    <div class="page-header">
      <h2>
        <el-icon><TrendCharts /></el-icon>
        情感趋势与盲区分析
      </h2>
      <p>用户真实情绪分布、知识库覆盖盲区、评论情感监控</p>
    </div>

    <!-- 概览卡片 -->
    <el-row :gutter="14">
      <el-col :span="6" v-for="card in cards" :key="card.label">
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

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" style="margin-top: 14px">
      <el-tab-pane label="用户评分 👍👎" name="rating" />
      <el-tab-pane label="AI 情感" name="trend" />
      <el-tab-pane label="评论情感" name="comment" />
      <el-tab-pane label="用户反馈" name="feedback" />
    </el-tabs>

    <!-- ========== 用户评分 Tab（纯 👍👎 驱动，不依赖 AI） ========== -->
    <template v-if="activeTab === 'rating'">
      <el-row :gutter="14" style="margin-bottom: 14px">
        <el-col :span="6" v-for="card in ratingCards" :key="card.label">
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

      <el-row :gutter="14">
        <el-col :span="12">
          <div class="card-box chart-box">
            <h3 class="chart-title">
              <el-icon><PieChart /></el-icon>
              用户评分分布
            </h3>
            <div ref="ratingPieChart" style="height: 300px"></div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="card-box chart-box">
            <h3 class="chart-title">
              <el-icon><TrendCharts /></el-icon>
              每日评分趋势
            </h3>
            <div ref="ratingTrendChart" style="height: 300px"></div>
          </div>
        </el-col>
      </el-row>

      <div class="card-box" style="margin-top: 14px; text-align: center; padding: 24px">
        <p style="color: #817c70; font-size: 13px; margin: 0">
          💡 此数据完全来自用户在对话结束后主动点击的 <strong>👍 赞</strong> 和 <strong>👎 踩</strong>，不依赖任何第三方 AI 分析。
        </p>
      </div>
    </template>

    <!-- 情感趋势 Tab -->
    <template v-if="activeTab === 'trend'">
      <!-- 图表行 -->
      <el-row :gutter="14">
        <el-col :span="8">
          <div class="card-box chart-box">
            <h3 class="chart-title">
              <el-icon><PieChart /></el-icon>
              用户情感分布
            </h3>
            <div ref="pieChart" style="height: 280px"></div>
          </div>
        </el-col>
        <el-col :span="16">
          <div class="card-box chart-box">
            <h3 class="chart-title">
              <el-icon><TrendCharts /></el-icon>
              近7天情感趋势
            </h3>
            <div ref="sentimentChart" style="height: 280px"></div>
          </div>
        </el-col>
      </el-row>

      <!-- 盲区 -->
      <el-row :gutter="14" style="margin-top: 14px">
        <el-col :span="12">
          <div class="card-box chart-box">
            <h3 class="chart-title">
              <el-icon><WarningFilled /></el-icon>
              知识库盲区 Top 10
            </h3>
            <div ref="blindChart" style="height: 300px"></div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="card-box" style="height: 340px; overflow-y: auto;">
            <h3 class="chart-title" style="margin-bottom: 16px">
              <el-icon><QuestionFilled /></el-icon>
              近期未满足问题
            </h3>
            <el-table :data="unmetList" stripe size="small">
              <template #empty>
                <el-empty description="暂无未满足问题" :image-size="60" />
              </template>
              <el-table-column prop="question" label="问题" min-width="200" show-overflow-tooltip />
              <el-table-column prop="count" label="次数" width="60" align="center">
                <template #default="{ row }">
                  <el-tag type="warning" effect="plain" size="small">{{ row.count }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="90" align="center">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click="quickAddFAQ(row)">
                    补充知识
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-col>
      </el-row>
    </template>

    <!-- 评论情感 Tab -->
    <template v-if="activeTab === 'comment'">
      <el-row :gutter="14">
        <el-col :span="8">
          <div class="card-box chart-box">
            <h3 class="chart-title">
              <el-icon><PieChart /></el-icon>
              评论情感分布
            </h3>
            <div ref="commentPieChart" style="height: 280px"></div>
          </div>
        </el-col>
        <el-col :span="16">
          <div class="card-box">
            <h3 class="chart-title" style="margin-bottom: 16px">
              <el-icon><ChatLineSquare /></el-icon>
              近期评论列表
            </h3>
            <el-table :data="recentComments" stripe size="small" max-height="320">
              <template #empty>
                <el-empty description="暂无评论数据" :image-size="60" />
              </template>
              <el-table-column prop="content" label="评论内容" min-width="280" show-overflow-tooltip />
              <el-table-column label="情感" width="90" align="center">
                <template #default="{ row }">
                  <el-tag
                    :type="row.sentiment === 'positive' ? 'success' : row.sentiment === 'negative' ? 'danger' : 'info'"
                    effect="plain" size="small"
                  >{{ row.label }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="time" label="时间" width="160">
                <template #default="{ row }">
                  <span class="time-cell">{{ formatDate(row.time) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-col>
      </el-row>
    </template>

    <!-- 用户反馈 Tab -->
    <template v-if="activeTab === 'feedback'">
      <div class="card-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px">
          <h3 class="chart-title" style="margin: 0">
            <el-icon><ChatLineSquare /></el-icon>
            用户反馈列表
          </h3>
          <el-select v-model="feedbackFilter" placeholder="状态筛选" size="small" style="width: 140px" @change="loadFeedbacks">
            <el-option label="全部" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="已处理" value="resolved" />
          </el-select>
        </div>
        <el-table :data="feedbackList" stripe size="small">
          <template #empty>
            <el-empty description="暂无反馈" :image-size="60" />
          </template>
          <el-table-column prop="category" label="分类" width="100">
            <template #default="{ row }">
              <el-tag effect="plain" size="small" type="info">{{ row.category || '其他' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="content" label="内容" min-width="280" show-overflow-tooltip />
          <el-table-column prop="contact" label="联系方式" width="140" show-overflow-tooltip />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 'resolved' ? 'success' : 'warning'" effect="plain" size="small">
                {{ row.status === 'resolved' ? '已处理' : '待处理' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTimeStr" label="提交时间" width="170" />
          <el-table-column label="操作" width="90" align="center">
            <template #default="{ row }">
              <el-button
                v-if="row.status !== 'resolved'"
                type="primary" link size="small"
                @click="resolveFeedback(row)"
              >标记已处理</el-button>
              <span v-else style="color: #9eaa68; font-size: 12px">—</span>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-top: 16px; text-align: right">
          <el-pagination
            v-model:current-page="feedbackPage"
            :page-size="20"
            :total="feedbackTotal"
            layout="prev, pager, next"
            small
            @current-change="loadFeedbacks"
          />
        </div>
      </div>
    </template>

    <!-- 快速补充知识对话框 -->
    <el-dialog v-model="faqDialogVisible" title="补充知识库" width="560px" @close="resetFaqForm">
      <el-form :model="faqForm" label-position="top">
        <el-form-item label="问题">
          <el-input v-model="faqForm.question" placeholder="未满足的问题" />
        </el-form-item>
        <el-form-item label="答案">
          <el-input v-model="faqForm.answer" type="textarea" :rows="5" placeholder="请输入答案内容…" />
        </el-form-item>
        <el-form-item label="存入集合">
          <el-radio-group v-model="faqForm.targetCollection">
            <el-radio value="faqs">FAQ 集合</el-radio>
            <el-radio value="knowledge">知识库</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="faqDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFaq" :loading="faqSubmitting">
          <el-icon><MagicStick /></el-icon>
          AI 生成建议答案
        </el-button>
        <el-button type="success" @click="submitFaq" :loading="faqSubmitting">
          直接保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import reportsAPI from '../../api/reports'
import { app } from '../../api/cloudbase'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  TrendCharts, WarningFilled, QuestionFilled, CircleCheckFilled,
  CircleCloseFilled, StarFilled, PieChart, ChatLineSquare, MagicStick
} from '@element-plus/icons-vue'

// ---- 状态 ----
const activeTab = ref('trend')
const cards = ref([
  { label: '已回答问题', value: '--', iconComp: CircleCheckFilled, bg: 'rgba(156,199,221,.28)', color: '#6099b8' },
  { label: '未满足问题', value: '--', iconComp: CircleCloseFilled, bg: 'rgba(240,214,111,.22)', color: '#a98621' },
  { label: '用户满意度', value: '--', iconComp: StarFilled, bg: 'rgba(223,159,201,.24)', color: '#b75693' },
  { label: '评论好评率', value: '--', iconComp: ChatLineSquare, bg: 'rgba(158,170,104,.22)', color: '#9eaa68' }
])

const unmetList = ref([])
const recentComments = ref([])
const feedbackList = ref([])
const feedbackTotal = ref(0)
const feedbackPage = ref(1)
const feedbackFilter = ref('')

// 用户评分卡片和图表
const ratingCards = ref([
  { label: '👍 好评', value: '--', iconComp: CircleCheckFilled, bg: 'rgba(158,170,104,.22)', color: '#7f8b4c' },
  { label: '👎 差评', value: '--', iconComp: CircleCloseFilled, bg: 'rgba(232,139,139,.20)', color: '#c0392b' },
  { label: '总评分数', value: '--', iconComp: ChatLineSquare, bg: 'rgba(156,199,221,.28)', color: '#6099b8' },
  { label: '好评率', value: '--', iconComp: StarFilled, bg: 'rgba(223,159,201,.24)', color: '#b75693' }
])

// 图表 refs
const sentimentChart = ref(null)
const blindChart = ref(null)
const pieChart = ref(null)
const commentPieChart = ref(null)
const ratingPieChart = ref(null)
const ratingTrendChart = ref(null)

// FAQ 对话框
const faqDialogVisible = ref(false)
const faqSubmitting = ref(false)
const faqForm = ref({ question: '', answer: '', targetCollection: 'faqs' })

let charts = []

// ---- 工具 ----
const SKY = '#9cc7dd'
const ACCENT = '#df9fc9'
const BRAND = '#9eaa68'
const WARM = '#f0d66f'
const RED = '#e88b8b'

function initChart(refEl, option) {
  if (!refEl.value) return
  const existing = echarts.getInstanceByDom(refEl.value)
  if (existing) existing.dispose()
  const chart = echarts.init(refEl.value)
  chart.setOption(option)
  charts.push(chart)
}

function formatDate(d) {
  if (!d) return '—'
  const t = new Date(d)
  const m = (t.getMonth() + 1).toString().padStart(2, '0')
  const day = t.getDate().toString().padStart(2, '0')
  const h = t.getHours().toString().padStart(2, '0')
  const min = t.getMinutes().toString().padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}

// ---- 数据加载 ----
async function loadSentimentData() {
  try {
    const res = await reportsAPI.getSentiment()

    if (res?.summary) {
      cards.value[0].value = res.summary.answered ?? '--'
      cards.value[1].value = res.summary.unmet ?? '--'
      cards.value[2].value = res.summary.satisfaction ? res.summary.satisfaction + '%' : '--'
    }

    unmetList.value = res?.unmetList || []

    // 情感分布饼图
    if (res?.dailySentiment && res.dailySentiment.length > 0) {
      const last = res.dailySentiment[res.dailySentiment.length - 1]
      const pieData = [
        { value: last.positive || 0, name: '正面 😊' },
        { value: last.neutral || 0, name: '中性 😐' },
        { value: last.negative || 0, name: '负面 😞' }
      ].filter(d => d.value > 0)

      if (pieData.length > 0) {
        initChart(pieChart, {
          tooltip: { trigger: 'item', backgroundColor: '#fffaf0', borderColor: 'rgba(31,29,23,.12)', textStyle: { color: '#181814', fontSize: 12 } },
          series: [{
            type: 'pie',
            radius: ['55%', '78%'],
            center: ['50%', '50%'],
            data: pieData,
            label: { color: '#4c4a42', fontSize: 12 },
            itemStyle: {
              color: params => [BRAND, SKY, ACCENT][params.dataIndex]
            },
            emphasis: {
              label: { fontSize: 16, fontWeight: 'bold' }
            }
          }]
        })
      }
    }

    // 每日情感趋势堆叠图
    if (res?.dailySentiment) {
      initChart(sentimentChart, {
        tooltip: { trigger: 'axis', backgroundColor: '#fffaf0', borderColor: 'rgba(31,29,23,.12)', textStyle: { color: '#181814', fontSize: 12 } },
        grid: { left: 48, right: 24, top: 20, bottom: 32 },
        legend: { data: ['正面', '中性', '负面', '满意', '未满足'], bottom: 0, textStyle: { color: '#817c70', fontSize: 11 } },
        xAxis: { type: 'category', data: res.dailySentiment.map(d => d.date), axisLine: { lineStyle: { color: 'rgba(31,29,23,.12)' } }, axisTick: { show: false }, axisLabel: { color: '#817c70', fontSize: 11 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(31,29,23,.08)' } }, axisLabel: { color: '#817c70', fontSize: 11 } },
        series: [
          { name: '正面', type: 'bar', stack: 'sentiment', data: res.dailySentiment.map(d => d.positive || 0), itemStyle: { color: BRAND }, barWidth: 20 },
          { name: '中性', type: 'bar', stack: 'sentiment', data: res.dailySentiment.map(d => d.neutral || 0), itemStyle: { color: SKY } },
          { name: '负面', type: 'bar', stack: 'sentiment', data: res.dailySentiment.map(d => d.negative || 0), itemStyle: { color: ACCENT } },
          { name: '满意', type: 'line', data: res.dailySentiment.map(d => d.answered || 0), smooth: true, itemStyle: { color: BRAND }, lineStyle: { width: 2, color: BRAND } },
          { name: '未满足', type: 'line', data: res.dailySentiment.map(d => d.unmet || 0), smooth: true, itemStyle: { color: RED }, lineStyle: { width: 2, color: RED, type: 'dashed' } }
        ]
      })
    }

    // 盲区柱状图
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

async function loadCommentData() {
  try {
    const res = await reportsAPI.getCommentSentiment()
    cards.value[3].value = res.positiveRate ? res.positiveRate + '%' : '--'
    recentComments.value = res.recentComments || []

    // 评论情感饼图
    if (res.total > 0) {
      initChart(commentPieChart, {
        tooltip: { trigger: 'item', backgroundColor: '#fffaf0', borderColor: 'rgba(31,29,23,.12)', textStyle: { color: '#181814', fontSize: 12 } },
        series: [{
          type: 'pie',
          radius: ['50%', '75%'],
          center: ['50%', '50%'],
          data: [
            { value: res.positive, name: '好评 👍' },
            { value: res.neutral, name: '中性 😐' },
            { value: res.negative, name: '差评 👎' }
          ].filter(d => d.value > 0),
          label: { color: '#4c4a42', fontSize: 12 },
          itemStyle: {
            color: params => [BRAND, SKY, ACCENT][params.dataIndex]
          }
        }]
      })
    }
  } catch (e) {
    console.error('加载评论情感失败', e)
  }
}

// ---- 用户评分数据（纯 👍👎 驱动） ----
async function loadRatingData() {
  try {
    const res = await reportsAPI.getRatingSentiment()
    ratingCards.value[0].value = res.totalGood ?? '--'
    ratingCards.value[1].value = res.totalBad ?? '--'
    ratingCards.value[2].value = res.total ?? '--'
    ratingCards.value[3].value = res.goodRate ? res.goodRate + '%' : '--'

    // 评分分布饼图
    if (res.total > 0) {
      initChart(ratingPieChart, {
        tooltip: { trigger: 'item', backgroundColor: '#fffaf0', borderColor: 'rgba(31,29,23,.12)', textStyle: { color: '#181814', fontSize: 12 } },
        series: [{
          type: 'pie',
          radius: ['55%', '78%'],
          center: ['50%', '50%'],
          data: [
            { value: res.totalGood, name: '👍 好评' },
            { value: res.totalBad, name: '👎 差评' }
          ].filter(d => d.value > 0),
          label: { color: '#4c4a42', fontSize: 13 },
          itemStyle: { color: params => params.dataIndex === 0 ? BRAND : ACCENT }
        }]
      })
    }

    // 每日评分趋势
    if (res.dailyList && res.dailyList.length > 0) {
      initChart(ratingTrendChart, {
        tooltip: { trigger: 'axis', backgroundColor: '#fffaf0', borderColor: 'rgba(31,29,23,.12)', textStyle: { color: '#181814', fontSize: 12 } },
        grid: { left: 48, right: 24, top: 20, bottom: 32 },
        legend: { data: ['👍 好评', '👎 差评'], bottom: 0, textStyle: { color: '#817c70', fontSize: 12 } },
        xAxis: { type: 'category', data: res.dailyList.map(d => d.date), axisLine: { lineStyle: { color: 'rgba(31,29,23,.12)' } }, axisTick: { show: false }, axisLabel: { color: '#817c70', fontSize: 11 } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(31,29,23,.08)' } }, axisLabel: { color: '#817c70', fontSize: 11 } },
        series: [
          { name: '👍 好评', type: 'bar', data: res.dailyList.map(d => d.good || 0), itemStyle: { color: BRAND }, barWidth: 24, barGap: '20%' },
          { name: '👎 差评', type: 'bar', data: res.dailyList.map(d => d.bad || 0), itemStyle: { color: ACCENT } }
        ]
      })
    }
  } catch (e) {
    console.error('加载评分数据失败', e)
  }
}

async function loadFeedbacks() {
  try {
    const res = await reportsAPI.getFeedbacks({ page: feedbackPage.value, status: feedbackFilter.value })
    feedbackList.value = res.list || []
    feedbackTotal.value = res.total || 0
  } catch (e) {
    console.error('加载反馈失败', e)
  }
}

async function resolveFeedback(row) {
  try {
    await ElMessageBox.confirm('确认将此反馈标记为"已处理"？', '确认', { type: 'info' })
    const res = await reportsAPI.updateFeedbackStatus(row._id, 'resolved')
    if (res.code === 200) {
      ElMessage.success('已标记为已处理')
      loadFeedbacks()
    }
  } catch { /* 取消 */ }
}

// ---- FAQ 快速补充 ----
function quickAddFAQ(row) {
  faqForm.value = { question: row.question, answer: '', targetCollection: 'faqs' }
  faqDialogVisible.value = true
}

function resetFaqForm() {
  faqForm.value = { question: '', answer: '', targetCollection: 'faqs' }
}

async function submitFaq() {
  if (!faqForm.value.question.trim() || !faqForm.value.answer.trim()) {
    ElMessage.warning('问题和答案不能为空')
    return
  }
  faqSubmitting.value = true
  try {
    let result
    if (faqForm.value.targetCollection === 'faqs') {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'addFAQ',
          q: faqForm.value.question.trim(),
          a: faqForm.value.answer.trim()
        }
      })
      result = res.result || {}
    } else {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'createKnowledge',
          collection: 'knowledge',
          doc: {
            name: faqForm.value.question.trim(),
            detail: faqForm.value.answer.trim()
          }
        }
      })
      result = res.result || {}
    }

    if (result.code === 200) {
      ElMessage.success('已成功添加到知识库')
      faqDialogVisible.value = false
      resetFaqForm()
    } else {
      ElMessage.error(result.msg || '保存失败')
    }
  } catch (e) {
    console.error('保存失败', e)
    ElMessage.error('保存失败: ' + (e.message || '未知错误'))
  } finally {
    faqSubmitting.value = false
  }
}

// ---- 生命周期 ----
watch(activeTab, (val) => {
  if (val === 'rating') loadRatingData()
  if (val === 'comment') loadCommentData()
  if (val === 'feedback') loadFeedbacks()
})

onMounted(() => {
  loadSentimentData()
  loadCommentData()
})

onUnmounted(() => charts.forEach(c => c.dispose()))
</script>

<style scoped>
.chart-box {
  margin-bottom: 0;
}

.time-cell {
  font-size: 12px;
  color: #817c70;
}
</style>
