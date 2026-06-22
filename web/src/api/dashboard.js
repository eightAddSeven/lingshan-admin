/**
 * 数据大屏 API — 优先读取 analytics 预聚合，降级时从 chat_history 实时计算
 *
 * 主方案：analytics/summary 文档（云函数 saveChatHistory 自动维护）
 * 降级方案：chat_history 集合全量读取 + 客户端聚合
 */
import { db } from './cloudbase'

// ========== 意图关键词映射（与云函数 detectIntent 保持一致） ==========
const INTENT_KEYWORDS = [
  { intent: '景点介绍', keys: ['介绍', '是什么', '有什么', '有什么特色', '怎么样', '讲讲', '了解', '讲解', '描述'] },
  { intent: '路线规划', keys: ['路线', '怎么走', '怎么去', '交通', '导航', '步行', '多远', '多久到', '游览顺序'] },
  { intent: '演出时间', keys: ['时间', '几点', '什么时候', '演出', '表演', '场次', '开放时间', '关门', '几点开'] },
  { intent: '门票价格', keys: ['门票', '价格', '多少钱', '票价', '收费', '免费', '费用', '购票'] },
  { intent: '餐饮美食', keys: ['吃', '餐厅', '美食', '素斋', '素面', '小吃', '饭店', '饮食', '用餐'] },
  { intent: '祈福朝拜', keys: ['祈福', '拜佛', '烧香', '许愿', '朝拜', '礼佛', '法会', '供奉'] },
  { intent: '拍照打卡', keys: ['拍照', '打卡', '摄影', '机位', '取景', '拍照点', '合影'] },
  { intent: '住宿停车', keys: ['住宿', '酒店', '住', '停车', '行李', '寄存'] },
  { intent: '天气穿着', keys: ['天气', '穿', '衣服', '防晒', '雨', '冷', '热'] },
  { intent: '其他', keys: [] }
]

function detectIntent(question) {
  const q = question || ''
  for (const item of INTENT_KEYWORDS) {
    if (item.keys.length === 0) continue
    if (item.keys.some(k => q.includes(k))) return item.intent
  }
  return '其他'
}

// 景点名称列表（与云函数 allSpotNames 保持一致）
const ALL_SPOT_NAMES = [
  "灵山大照壁","五明桥","佛足坛","五智门","菩提大道","九龙灌浴","降魔浮雕",
  "阿育王柱","百子戏弥勒","祥符禅寺","灵山大佛","佛教文化博览馆","灵山梵宫",
  "五印坛城","曼飞龙塔","无尽意斋","拈花广场","梵天花海","香月花街","拈花堂",
  "五灯湖","鹿鸣谷"
].sort((a, b) => b.length - a.length)

function detectSpots(question) {
  const found = []
  const q = question || ''
  for (const name of ALL_SPOT_NAMES) {
    if (q.includes(name)) found.push(name)
    if (found.length >= 5) break
  }
  return found
}

// ========== 从 chat_history 实时计算汇总数据（降级方案） ==========
async function computeFromChatHistory() {
  console.log('[Dashboard] analytics 无数据，从 chat_history 实时计算...')
  try {
    // 全量拉取 chat_history（最多 500 条，够 Dashboard 展示用）
    const { data } = await db.collection('chat_history')
      .orderBy('createTime', 'desc')
      .limit(500)
      .get()

    if (!data || data.length === 0) {
      console.log('[Dashboard] chat_history 也为空，返回零数据')
      return null
    }

    console.log(`[Dashboard] 从 chat_history 读取到 ${data.length} 条记录`)

    const dailyMap = {}
    const questionCountMap = {}
    const intentCountMap = {}
    const spotCountMap = {}
    const openidSet = new Set()
    let answeredCount = 0

    for (const record of data) {
      const q = record.question || ''
      const createTime = record.createTime
      const openid = record._openid
      const isMet = record.isMet !== false // 默认 true

      // 日期键
      let dateKey = ''
      if (createTime) {
        const d = new Date(createTime)
        dateKey = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
      }

      // 每日计数
      if (dateKey) {
        dailyMap[dateKey] = (dailyMap[dateKey] || 0) + 1
      }

      // 问题计数（截断编码）
      const encodedQ = encodeURIComponent(q.slice(0, 30))
      questionCountMap[encodedQ] = (questionCountMap[encodedQ] || 0) + 1

      // 意图分类
      const intent = detectIntent(q)
      intentCountMap[intent] = (intentCountMap[intent] || 0) + 1

      // 景点检测
      const spots = detectSpots(q)
      for (const spot of spots) {
        spotCountMap[spot] = (spotCountMap[spot] || 0) + 1
      }

      // 去重 openid
      if (openid) openidSet.add(openid)

      // 已回答计数
      if (isMet) answeredCount++
    }

    const totalConversations = data.length
    const todayKey = getTodayKey()
    const weekKeys = getWeekKeys()
    const todayCount = dailyMap[todayKey] || 0
    const weekCount = weekKeys.reduce((sum, k) => sum + (dailyMap[k] || 0), 0)

    // 热门问答 Top10
    const hotQA = Object.entries(questionCountMap)
      .map(([q, count]) => ({ question: decodeURIComponent(q), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 意图分布
    const intentDist = Object.entries(intentCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // 热点景点
    const hotSpots = Object.entries(spotCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      kpi: {
        todayCount,
        weekCount,
        totalCount: totalConversations,
        activeUsers: openidSet.size,
        satisfactionRate: totalConversations
          ? Math.round((answeredCount / totalConversations) * 100) + '%'
          : '--'
      },
      hotQA,
      intentDist,
      hotSpots,
      daily: dailyMap  // 也返回 daily 供趋势图使用
    }
  } catch (err) {
    console.error('[Dashboard] chat_history 查询失败:', err.message)
    return null
  }
}

// ========== 主 API ==========

/**
 * 获取大屏汇总数据
 * 优先读取 analytics/summary，无数据时降级到 chat_history 实时计算
 */
export async function getSummary() {
  // —— 主方案：analytics 预聚合 ——
  try {
    const { data } = await db.collection('analytics').doc('summary').get()
    console.log('[Dashboard] analytics 查询结果:', data)

    if (data && data.length > 0) {
      const doc = data[0]
      // 云函数将数据嵌套在 data 字段下，做兼容解包
      const inner = doc.data || doc

      console.log('[Dashboard] analytics 内层数据 keys:', Object.keys(inner))
      console.log('[Dashboard] intentCounts:', inner.intentCounts)

      // 计算今日和本周的对话量
      const daily = inner.daily || {}
      const todayKey = getTodayKey()
      const weekKeys = getWeekKeys()
      const todayCount = daily[todayKey] || 0
      const weekCount = weekKeys.reduce((sum, k) => sum + (daily[k] || 0), 0)

      // 热门问答 Top10
      const qCounts = inner.questionCounts || {}
      const hotQA = Object.entries(qCounts)
        .map(([q, count]) => ({ question: decodeURIComponent(q), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      // 意图分布
      const intentCounts = inner.intentCounts || {}
      const intentDist = Object.entries(intentCounts)
        .map(([name, count]) => ({ name, count }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count)

      // 热点景点
      const spotCounts = inner.spotCounts || {}
      const hotSpots = Object.entries(spotCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const result = {
        kpi: {
          todayCount,
          weekCount,
          totalCount: inner.totalConversations || 0,
          activeUsers: (inner.uniqueOpenids || []).length,
          satisfactionRate: inner.totalConversations
            ? Math.round(((inner.answeredCount || 0) / inner.totalConversations) * 100) + '%'
            : '--'
        },
        hotQA,
        intentDist,
        hotSpots
      }

      // 如果 analytics 数据全为零，降级到 chat_history
      if (result.kpi.totalCount === 0) {
        console.log('[Dashboard] analytics 数据全为零，降级到 chat_history')
        const fallback = await computeFromChatHistory()
        if (fallback) return fallback
      }

      return result
    }
  } catch (err) {
    console.warn('[Dashboard] analytics 查询失败，降级到 chat_history:', err.message)
  }

  // —— 降级方案：从 chat_history 实时计算 ——
  const fallback = await computeFromChatHistory()
  if (fallback) return fallback

  // 最终兜底
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
  // —— 主方案：analytics ——
  try {
    const { data } = await db.collection('analytics').doc('summary').get()

    if (data && data.length > 0) {
      const inner = data[0].data || data[0]
      const daily = inner.daily || {}

      // 检查是否有数据
      if (Object.keys(daily).length > 0) {
        const dailyList = []
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
          dailyList.push({ date: key, count: daily[key] || 0 })
        }
        return { daily: dailyList }
      }
    }
  } catch (err) {
    console.warn('[Dashboard] 趋势查询失败，降级到 chat_history:', err.message)
  }

  // —— 降级方案：从 chat_history 聚合 ——
  try {
    const { data } = await db.collection('chat_history')
      .orderBy('createTime', 'desc')
      .limit(500)
      .get()

    if (data && data.length > 0) {
      const dailyMap = {}
      for (const record of data) {
        if (record.createTime) {
          const d = new Date(record.createTime)
          const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
          dailyMap[key] = (dailyMap[key] || 0) + 1
        }
      }

      const dailyList = []
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
        dailyList.push({ date: key, count: dailyMap[key] || 0 })
      }
      return { daily: dailyList }
    }
  } catch (err) {
    console.warn('[Dashboard] 趋势降级查询也失败:', err.message)
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
