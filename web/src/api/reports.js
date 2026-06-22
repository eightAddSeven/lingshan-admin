/**
 * 报告 API — 交互概览 & 情感趋势
 * 数据来源: analytics 集合（云函数 saveChatHistory 自动更新）
 */
import { db } from './cloudbase'

function emptyOverview() {
  return {
    summary: { totalChats: 0, dailyAvg: 0, uniqueUsers: 0, avgRounds: 0 },
    daily: [],
    spotDist: [],
    intentDist: []
  }
}

function emptySentiment() {
  return {
    summary: { answered: 0, unmet: 0, satisfaction: 0 },
    dailySentiment: [],
    blindSpots: [],
    unmetList: []
  }
}

/**
 * 交互概览数据
 */
export async function getOverview({ startDate, endDate } = {}) {
  try {
    const { data } = await db.collection('analytics').doc('summary').get()

    if (data && data.length > 0) {
      const doc = data[0]
      // 云函数将数据嵌套在 data 字段下，做兼容解包
      const inner = doc.data || doc
      const daily = inner.daily || {}
      const totalChats = inner.totalConversations || 0
      const uniqueUsers = (inner.uniqueOpenids || []).length
      const dayCount = Object.keys(daily).length || 1
      const dailyAvg = Math.round(totalChats / dayCount)

      // 按天聚合
      const dailyList = Object.entries(daily)
        .map(([date, count]) => {
          // 将 '6-17' 格式转为 '2026-06-17'
          const [m, d] = date.split('-')
          const iso = `2026-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
          return { date: iso, count }
        })
        .sort((a, b) => a.date.localeCompare(b.date))

      // 景点分布
      const spotCounts = inner.spotCounts || {}
      const spotDist = Object.entries(spotCounts)
        .map(([name, count]) => ({ name, count }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)

      // 意图分布
      const intentCounts = inner.intentCounts || {}
      const intentDist = Object.entries(intentCounts)
        .map(([name, count]) => ({ name, count }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)

      return {
        summary: { totalChats, dailyAvg, uniqueUsers, avgRounds: 1 },
        daily: dailyList,
        spotDist,
        intentDist
      }
    }
  } catch (err) {
    console.warn('[Reports] 交互概览查询失败，返回空数据:', err.message)
  }
  return emptyOverview()
}

/**
 * 情感趋势与盲区
 */
export async function getSentiment() {
  try {
    const { data } = await db.collection('analytics').doc('summary').get()

    if (data && data.length > 0) {
      const doc = data[0]
      // 云函数将数据嵌套在 data 字段下，做兼容解包
      const inner = doc.data || doc
      const answered = inner.answeredCount || 0
      const unmet = inner.unmetCount || 0
      const total = answered + unmet || 1
      const satisfaction = Math.round((answered / total) * 100)

      // 每日情感趋势
      const dailySent = inner.dailySentiment || {}
      const dailySentiment = Object.entries(dailySent)
        .map(([date, val]) => ({ date, ...val }))
        .sort((a, b) => a.date.localeCompare(b.date))

      // 未命中问题 Top10
      const unmetQuestions = inner.unmetQuestions || {}
      const blindSpots = Object.entries(unmetQuestions)
        .map(([q, count]) => ({ keyword: decodeURIComponent(q), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // 未命中列表 Top20
      const unmetList = Object.entries(unmetQuestions)
        .map(([question, count]) => ({
          question: decodeURIComponent(question),
          count,
          lastTime: '—'
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)

      return {
        summary: { answered, unmet, satisfaction },
        dailySentiment,
        blindSpots,
        unmetList
      }
    }
  } catch (err) {
    console.warn('[Reports] 情感查询失败，返回空数据:', err.message)
  }
  return emptySentiment()
}

const reportsAPI = { getOverview, getSentiment }
export default reportsAPI
