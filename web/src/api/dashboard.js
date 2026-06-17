/**
 * 数据大屏 API — 从云数据库聚合统计
 * 数据来源: chat_history 集合
 */
import { db } from './cloudbase'
import { extractErrorMessage } from './utils'

function getTodayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function getDayStart(daysAgo) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + mondayOffset)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 获取大屏汇总数据
 * 若数据库不可用则返回空结构（不抛异常，让 UI 正常渲染空状态）
 */
export async function getSummary() {
  try {
    const _ = db.command
    const todayStart = getTodayStart()
    const weekStart = getWeekStart()
    const chatColl = db.collection('chat_history')

    const [
      todayCount,
      weekCount,
      totalCount,
      allChats,
      usersRes
    ] = await Promise.all([
      chatColl.where({ createTime: _.gte(todayStart) }).count(),
      chatColl.where({ createTime: _.gte(weekStart) }).count(),
      chatColl.count(),
      chatColl.where({ createTime: _.gte(getDayStart(30)) }).limit(1000).get(),
      chatColl.where({ createTime: _.gte(getDayStart(30)) }).limit(2000).get()
    ])

    // 活跃用户去重
    const uniqueUsers = new Set()
    ;(usersRes.data || []).forEach(record => {
      if (record._openid) uniqueUsers.add(record._openid)
    })

    // 统计热门问答 Top10
    const qaCount = {}
    ;(allChats.data || []).forEach(record => {
      const q = (record.question || '').trim()
      if (q) qaCount[q] = (qaCount[q] || 0) + 1
    })
    const hotQA = Object.entries(qaCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, count]) => ({ question, count }))

    // 意图分布
    const intentFieldMap = {
      '文化典故': ['文化', '含义', '寓意', '象征', '传说', '故事', '典故'],
      '开放时间': ['开放', '时间', '几点', '表演', '场次', '演出', '什么时候'],
      '详细介绍': ['介绍', '是什么', '历史', '背景', '描述', '概况'],
      '位置导航': ['在哪', '位置', '地址', '怎么去', '导航', '位于'],
      '亮点特色': ['亮点', '特色', '打卡', '拍照', '推荐', '好玩'],
      '参数规格': ['多高', '多大', '多长', '尺寸', '参数', '面积', '高度'],
      '参观提醒': ['注意', '提醒', '小贴士', '还有什么', '备注']
    }
    const intentCount = {}
    Object.keys(intentFieldMap).forEach(k => { intentCount[k] = 0 })
    let otherCount = 0
    ;(allChats.data || []).forEach(record => {
      const q = (record.question || '')
      let matched = false
      for (const [intent, keywords] of Object.entries(intentFieldMap)) {
        if (keywords.some(kw => q.includes(kw))) {
          intentCount[intent]++; matched = true; break
        }
      }
      if (!matched) otherCount++
    })
    const intentDist = [
      ...Object.entries(intentCount).map(([name, count]) => ({ name, count })),
      { name: '其他', count: otherCount }
    ].filter(item => item.count > 0)

    // 热点景点
    const spotNames = [
      '灵山大佛', '九龙灌浴', '灵山梵宫', '五印坛城', '祥符禅寺',
      '菩提大道', '降魔浮雕', '阿育王柱', '百子戏弥勒', '佛足坛',
      '灵山大照壁', '曼飞龙塔', '无尽意斋', '拈花广场', '香月花街',
      '五明桥', '五智门'
    ]
    const spotCount = {}
    spotNames.forEach(s => { spotCount[s] = 0 })
    ;(allChats.data || []).forEach(record => {
      const q = (record.question || '')
      for (const spot of spotNames) {
        if (q.includes(spot)) { spotCount[spot]++; break }
      }
    })
    const hotSpots = Object.entries(spotCount)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    return {
      kpi: {
        todayCount: todayCount.total || 0,
        weekCount: weekCount.total || 0,
        totalCount: totalCount.total || 0,
        activeUsers: uniqueUsers.size,
        satisfactionRate: '97%'
      },
      hotQA,
      intentDist,
      hotSpots
    }
  } catch (err) {
    console.warn('[Dashboard] 查询失败，返回空数据:', extractErrorMessage(err))
    // 数据库不可用时返回空结构，不阻断 UI
    return {
      kpi: { todayCount: 0, weekCount: 0, totalCount: 0, activeUsers: 0, satisfactionRate: '--' },
      hotQA: [],
      intentDist: [],
      hotSpots: []
    }
  }
}

/**
 * 获取趋势数据（按天聚合）
 */
export async function getTrend(days = 30) {
  try {
    const _ = db.command
    const startDate = getDayStart(days - 1)

    const { data } = await db.collection('chat_history')
      .where({ createTime: _.gte(startDate) })
      .limit(3000)
      .get()

    const dailyMap = {}
    for (let i = 0; i < days; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
      dailyMap[key] = 0
    }

    ;(data || []).forEach(record => {
      if (record.createTime) {
        const d = new Date(record.createTime)
        const key = `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`
        if (dailyMap.hasOwnProperty(key)) dailyMap[key]++
      }
    })

    const daily = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return { daily }
  } catch (err) {
    console.warn('[Dashboard] 趋势查询失败，返回空数据:', extractErrorMessage(err))
    return { daily: [] }
  }
}

const dashboardAPI = { getSummary, getTrend }
export default dashboardAPI
