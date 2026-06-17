/**
 * 报告 API — 交互概览 & 情感趋势
 * 数据来源: chat_history 集合
 */
import { db } from './cloudbase'
import { extractErrorMessage } from './utils'

function getDayStart(daysAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(0, 0, 0, 0)
  return d
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
    const _ = db.command
    const chatColl = db.collection('chat_history')

    const timeCondition = {}
    if (startDate) {
      timeCondition.createTime = _.gte(new Date(startDate))
    } else {
      timeCondition.createTime = _.gte(getDayStart(30))
    }
    if (endDate) {
      timeCondition.createTime = _.and(
        timeCondition.createTime || _.gte(getDayStart(30)),
        _.lte(new Date(endDate + 'T23:59:59'))
      )
    }

    const { data } = await chatColl.where(timeCondition).limit(2000).get()

    if (!data || data.length === 0) return emptyOverview()

    const totalChats = data.length
    const uniqueUsers = new Set(data.map(r => r._openid).filter(Boolean)).size

    // 按天聚合
    const dayMap = {}
    data.forEach(record => {
      if (record.createTime) {
        const key = new Date(record.createTime).toISOString().slice(0, 10)
        dayMap[key] = (dayMap[key] || 0) + 1
      }
    })
    const daily = Object.entries(dayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const dayCount = Object.keys(dayMap).length || 1
    const dailyAvg = Math.round(totalChats / dayCount)

    // 景点分布
    const spotNames = [
      '灵山大佛', '九龙灌浴', '灵山梵宫', '五印坛城', '祥符禅寺',
      '菩提大道', '降魔浮雕', '阿育王柱', '百子戏弥勒', '佛足坛',
      '灵山大照壁', '曼飞龙塔', '无尽意斋', '拈花广场', '香月花街'
    ]
    const spotCount = {}
    spotNames.forEach(s => { spotCount[s] = 0 })
    data.forEach(record => {
      const q = (record.question || '')
      for (const spot of spotNames) {
        if (q.includes(spot)) { spotCount[spot]++; break }
      }
    })
    const spotDist = Object.entries(spotCount)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }))

    // 意图分类
    const intentMap = {
      '文化典故': ['文化', '含义', '寓意', '象征', '故事', '典故', '传说'],
      '开放时间': ['开放', '时间', '几点', '场次', '演出', '表演'],
      '详细介绍': ['介绍', '是什么', '历史', '背景', '描述'],
      '位置导航': ['在哪', '位置', '地址', '怎么去'],
      '亮点特色': ['亮点', '特色', '打卡', '拍照', '推荐'],
      '参数规格': ['多高', '多大', '尺寸', '参数', '面积'],
      '参观提醒': ['注意', '提醒', '贴士']
    }
    const intentCount = {}
    Object.keys(intentMap).forEach(k => { intentCount[k] = 0 })
    let other = 0
    data.forEach(record => {
      const q = (record.question || '')
      let matched = false
      for (const [intent, kws] of Object.entries(intentMap)) {
        if (kws.some(kw => q.includes(kw))) { intentCount[intent]++; matched = true; break }
      }
      if (!matched) other++
    })
    const intentDist = [
      ...Object.entries(intentCount).map(([name, count]) => ({ name, count })),
      { name: '其他', count: other }
    ].filter(item => item.count > 0)

    return { summary: { totalChats, dailyAvg, uniqueUsers, avgRounds: 1 }, daily, spotDist, intentDist }
  } catch (err) {
    console.warn('[Reports] 交互概览查询失败，返回空数据:', extractErrorMessage(err))
    return emptyOverview()
  }
}

/**
 * 情感趋势与盲区
 */
export async function getSentiment() {
  try {
    const _ = db.command
    const { data } = await db.collection('chat_history')
      .where({ createTime: _.gte(getDayStart(30)) })
      .limit(2000)
      .get()

    if (!data || data.length === 0) return emptySentiment()

    const unmetQuestions = {}
    let answeredCount = 0
    let unmetCount = 0
    const daySentMap = {}

    data.forEach(record => {
      const answer = (record.answer || '')
      const question = (record.question || '').trim()
      const date = record.createTime
        ? new Date(record.createTime).toISOString().slice(0, 10)
        : 'unknown'

      if (!daySentMap[date]) daySentMap[date] = { date, good: 0, fair: 0, poor: 0 }

      const isUnmet = answer.includes('请提供更具体') ||
                      answer.includes('暂时无法') ||
                      answer.includes('没有相关信息') ||
                      answer.length < 30

      if (isUnmet) {
        unmetCount++
        daySentMap[date].poor++
        if (question) unmetQuestions[question] = (unmetQuestions[question] || 0) + 1
      } else {
        answeredCount++
        if (answer.length > 80) daySentMap[date].good++
        else daySentMap[date].fair++
      }
    })

    const total = answeredCount + unmetCount || 1
    const satisfaction = Math.round((answeredCount / total) * 100)

    const dailySentiment = Object.values(daySentMap).sort((a, b) => a.date.localeCompare(b.date))

    const blindSpots = Object.entries(unmetQuestions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }))

    const unmetList = Object.entries(unmetQuestions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([question, count]) => ({ question, count, lastTime: '—' }))

    return { summary: { answered: answeredCount, unmet: unmetCount, satisfaction }, dailySentiment, blindSpots, unmetList }
  } catch (err) {
    console.warn('[Reports] 情感查询失败，返回空数据:', extractErrorMessage(err))
    return emptySentiment()
  }
}

const reportsAPI = { getOverview, getSentiment }
export default reportsAPI
