/**
 * 报告 API — 交互概览 & 情感趋势
 * 数据来源: analytics 集合（云函数 saveChatHistory 自动更新）
 */
import { db } from './cloudbase'

// 将 "7-3" 或 "7-03" 格式归一化为 "7-03"
function normalizeDateKey(key) {
  const parts = key.split('-')
  if (parts.length === 2) {
    return `${parts[0]}-${String(parseInt(parts[1], 10)).padStart(2, '0')}`
  }
  return key
}

// 合并 daily/dailySentiment 中同一天的双键数据（云函数格式切换过渡期）
function mergeDailyEntries(rawObj) {
  const merged = {}
  for (const [key, val] of Object.entries(rawObj)) {
    const normKey = normalizeDateKey(key)
    if (typeof val === 'number') {
      merged[normKey] = (merged[normKey] || 0) + val
    } else if (typeof val === 'object' && val !== null) {
      if (!merged[normKey]) merged[normKey] = {}
      for (const [subKey, subVal] of Object.entries(val)) {
        merged[normKey][subKey] = (merged[normKey][subKey] || 0) + (typeof subVal === 'number' ? subVal : 0)
      }
    }
  }
  return merged
}

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
      const rawDaily = inner.daily || {}
      // 合并双键（"7-3"+"7-03"→"7-03"），然后转为 ISO 日期
      const daily = mergeDailyEntries(rawDaily)
      const totalChats = inner.totalConversations || 0
      const uniqueUsers = (inner.uniqueOpenids || []).length
      const dayCount = Object.keys(daily).length || 1
      const dailyAvg = Math.round(totalChats / dayCount)

      // 按天聚合
      const dailyList = Object.entries(daily)
        .map(([date, count]) => {
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

      // 每日情感趋势（合并双键后再展示）
      const dailySentRaw = inner.dailySentiment || {}
      const dailySent = mergeDailyEntries(dailySentRaw)
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

// 客户端关键词情感判断（不依赖任何外部 API）
function guessSentiment(text) {
  const content = text || ''
  if (/好|棒|赞|喜欢|不错|推荐|漂亮|美|值得|满意|开心|太棒|很好|真好|赞了/.test(content)) {
    return { sentiment: 'positive', label: '好评' }
  }
  if (/差|烂|坑|骗|失望|垃圾|糟糕|后悔|不值|不行|太差|不好/.test(content)) {
    return { sentiment: 'negative', label: '差评' }
  }
  return { sentiment: 'neutral', label: '中性' }
}

/**
 * 评论情感分析数据
 * 优先读云函数分析结果，数据不足时客户端关键词兜底
 */
export async function getCommentSentiment() {
  try {
    const $ = db.command

    // 先查有 AI 情感标签的评论
    const { data: analyzed } = await db.collection('comments')
      .where({ sentiment: $.exists(true) })
      .orderBy('createTime', 'desc')
      .limit(200)
      .get()

    let all = (analyzed || []).map(c => ({
      content: (c.content || '').slice(0, 80),
      sentiment: c.sentiment || 'neutral',
      label: c.sentimentLabel || '中性',
      time: c.sentimentTime || c.createTime
    }))

    // 如果 AI 分析的数据不足，拉全部评论用关键词兜底
    if (all.length < 5) {
      const { data: allComments } = await db.collection('comments')
        .orderBy('createTime', 'desc')
        .limit(200)
        .get()

      const existingIds = new Set(analyzed ? analyzed.map(c => c._id) : [])
      const unanalyzed = (allComments || [])
        .filter(c => !existingIds.has(c._id))
        .map(c => {
          const guess = guessSentiment(c.content)
          return {
            content: (c.content || '').slice(0, 80),
            sentiment: guess.sentiment,
            label: guess.label + '（推测）',
            time: c.createTime
          }
        })

      all = [...all, ...unanalyzed]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 20)
    }

    let positive = 0, negative = 0, neutral = 0
    all.forEach(c => {
      if (c.sentiment === 'positive') positive++
      else if (c.sentiment === 'negative') negative++
      else neutral++
    })

    return {
      total: all.length,
      positive,
      negative,
      neutral,
      positiveRate: all.length ? Math.round((positive / all.length) * 100) : 0,
      recentComments: all
    }
  } catch (err) {
    console.warn('[Reports] 评论情感查询失败:', err.message)
    return { total: 0, positive: 0, negative: 0, neutral: 0, positiveRate: 0, recentComments: [] }
  }
}

/**
 * 获取反馈列表
 */
export async function getFeedbacks({ page = 1, pageSize = 20, status = '' } = {}) {
  try {
    let query = db.collection('feedbacks')
    if (status) query = query.where({ status })
    const countRes = await query.count()
    const { data } = await query
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()
    return {
      total: countRes.total || 0,
      list: (data || []).map(f => ({
        ...f,
        createTimeStr: f.createTime ? new Date(f.createTime).toLocaleString('zh-CN') : ''
      })),
      page,
      pageSize
    }
  } catch (err) {
    console.warn('[Reports] 反馈查询失败:', err.message)
    return { total: 0, list: [], page, pageSize }
  }
}

/**
 * 更新反馈状态
 */
export async function updateFeedbackStatus(id, status) {
  try {
    await db.collection('feedbacks').doc(id).update({ status, updateTime: new Date() })
    return { code: 200, msg: '更新成功' }
  } catch (err) {
    console.error('[Reports] 更新反馈状态失败:', err.message)
    return { code: 500, msg: '更新失败' }
  }
}

/**
 * 用户评分情感数据（纯 👍👎 驱动，不依赖任何 AI）
 */
export async function getRatingSentiment() {
  try {
    const { data } = await db.collection('analytics').doc('summary').get()

    if (data && data.length > 0) {
      const inner = data[0].data || data[0]
      const dailyRating = inner.dailyRating || {}

      // 合并双键格式
      const merged = mergeDailyEntries(dailyRating)

      // 计算总计
      let totalGood = 0, totalBad = 0
      const dailyList = Object.entries(merged)
        .map(([date, val]) => {
          const good = val.good || 0
          const bad = val.bad || 0
          totalGood += good
          totalBad += bad
          return { date, good, bad, total: good + bad }
        })
        .sort((a, b) => a.date.localeCompare(b.date))

      const total = totalGood + totalBad
      return {
        totalGood,
        totalBad,
        total,
        goodRate: total ? Math.round((totalGood / total) * 100) : 0,
        dailyList
      }
    }
  } catch (err) {
    console.warn('[Reports] 评分情感查询失败:', err.message)
  }
  return { totalGood: 0, totalBad: 0, total: 0, goodRate: 0, dailyList: [] }
}

const reportsAPI = { getOverview, getSentiment, getCommentSentiment, getFeedbacks, updateFeedbackStatus, getRatingSentiment }
export default reportsAPI
