/**
 * 数据大屏 API — 从 analytics 集合读取预聚合统计
 *
 * 统计数据由云函数 saveChatHistory 在每次 AI 对话时自动更新。
 * analytics/summary 文档包含计数器、意图分布、热点景点等预计算字段。
 * 管理后台直接读取，不需要遍历全量 chat_history。
 */
import { db } from './cloudbase'

/**
 * 获取大屏汇总数据
 * 若 analytics 集合中尚无数据则返回空结构
 */
export async function getSummary() {
  try {
    const { data } = await db.collection('analytics').doc('summary').get()

    if (data && data.length > 0) {
      const doc = data[0]

      // 计算今日和本周的对话量
      const daily = doc.daily || {}
      const todayKey = getTodayKey()
      const weekKeys = getWeekKeys()
      const todayCount = daily[todayKey] || 0
      const weekCount = weekKeys.reduce((sum, k) => sum + (daily[k] || 0), 0)

      // 热门问答 Top10（从统计中提取）
      const qCounts = doc.questionCounts || {}
      const hotQA = Object.entries(qCounts)
        .map(([q, count]) => ({ question: decodeURIComponent(q), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // 意图分布
      const intentCounts = doc.intentCounts || {}
      const intentDist = Object.entries(intentCounts)
        .map(([name, count]) => ({ name, count }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)

      // 热点景点
      const spotCounts = doc.spotCounts || {}
      const hotSpots = Object.entries(spotCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      return {
        kpi: {
          todayCount,
          weekCount,
          totalCount: doc.totalConversations || 0,
          activeUsers: (doc.uniqueOpenids || []).length,
          satisfactionRate: doc.totalConversations
            ? Math.round(((doc.answeredCount || 0) / doc.totalConversations) * 100) + '%'
            : '--'
        },
        hotQA,
        intentDist,
        hotSpots
      }
    }
  } catch (err) {
    console.warn('[Dashboard] analytics 查询失败，返回空数据:', err.message)
  }

  // 数据库不可用或无数据时返回空结构
  return {
    kpi: { todayCount: 0, weekCount: 0, totalCount: 0, activeUsers: 0, satisfactionRate: '--' },
    hotQA: [],
    intentDist: [],
    hotSpots: []
  }
}

/**
 * 获取趋势数据（按天聚合）
 */
export async function getTrend(days = 30) {
  try {
    const { data } = await db.collection('analytics').doc('summary').get()

    if (data && data.length > 0) {
      const daily = data[0].daily || {}

      // 生成最近 N 天的日期键
      const dailyList = []
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
        dailyList.push({ date: key, count: daily[key] || 0 })
      }

      return { daily: dailyList }
    }
  } catch (err) {
    console.warn('[Dashboard] 趋势查询失败，返回空数据:', err.message)
  }
  return { daily: [] }
}

// ========== 工具函数 ==========

function getTodayKey() {
  const d = new Date()
  return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekKeys() {
  const keys = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    keys.push(`${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return keys
}

const dashboardAPI = { getSummary, getTrend }
export default dashboardAPI
