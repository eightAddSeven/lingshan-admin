/**
 * 营销分析 API — 从 sales_data 集合读取消费行为数据
 *
 * 数据来源：景点景区旅游数据行为分析数据(1).xlsx 中筛选的灵山相关记录
 * 已通过 scripts/import-sales.py 导出为 JSON，需在 CloudBase 控制台导入
 *
 * 777 条数据量较小，前端做全部聚合计算，无需后端分页
 */
import { db } from './cloudbase'

const COLLECTION = 'sales_data'

/**
 * 获取灵山所有消费数据（777 条，前端聚合）
 */
export async function getAllSales() {
  try {
    // CloudBase 单次查询最多 1000 条，777 条一次拿完
    const { data } = await db.collection(COLLECTION).limit(1000).get()
    return data || []
  } catch (err) {
    console.warn('[Marketing] sales_data 查询失败:', err.message)
    return []
  }
}

/**
 * 按景点名称筛选
 */
export async function getSalesBySpot(attractionName) {
  try {
    const { data } = await db.collection(COLLECTION)
      .where({ attraction_name: attractionName })
      .limit(500)
      .get()
    return data || []
  } catch (err) {
    console.warn('[Marketing] 按景点筛选失败:', err.message)
    return []
  }
}

/**
 * 聚合统计数据（供看板 KPI 卡片使用）
 */
export function computeStats(salesData) {
  if (!salesData || salesData.length === 0) {
    return {
      totalVisitors: 0,
      avgTotalCost: 0,
      avgSatisfaction: 0,
      returnRate: 0,
      totalData: 0
    }
  }

  const totalVisitors = salesData.length
  const totalCost = salesData.reduce((sum, r) => sum + (r.total_cost || 0), 0)
  const avgTotalCost = totalCost / totalVisitors
  const totalSatisfaction = salesData.reduce((sum, r) => sum + (r.satisfaction || 0), 0)
  const avgSatisfaction = totalSatisfaction / totalVisitors

  // 回头率：tourist_id 出现次数 > 1 的比例
  const idCount = {}
  salesData.forEach(r => {
    idCount[r.tourist_id] = (idCount[r.tourist_id] || 0) + 1
  })
  const returnVisitors = Object.values(idCount).filter(c => c > 1).length
  const returnRate = (returnVisitors / new Set(salesData.map(r => r.tourist_id)).size) * 100

  return {
    totalVisitors,
    avgTotalCost,
    avgSatisfaction,
    returnRate,
    totalCost
  }
}

/**
 * 消费结构占比（门票/餐饮/购物/交通/娱乐）
 */
export function computeCostStructure(salesData) {
  const structure = { ticket: 0, food: 0, shopping: 0, transport: 0, entertainment: 0 }
  if (!salesData || salesData.length === 0) return structure

  let totalAll = 0
  for (const r of salesData) {
    structure.ticket += r.ticket_cost || 0
    structure.food += r.food_cost || 0
    structure.shopping += r.shopping_cost || 0
    structure.transport += r.transport_cost || 0
    structure.entertainment += r.entertainment_cost || 0
  }
  totalAll = structure.ticket + structure.food + structure.shopping + structure.transport + structure.entertainment
  if (totalAll > 0) {
    for (const k of Object.keys(structure)) {
      structure[k] = parseFloat((structure[k] / totalAll * 100).toFixed(1))
    }
  }
  return structure
}

/**
 * 月度趋势（游客量 + 人均消费）
 */
export function computeMonthlyTrend(salesData) {
  const monthly = {}
  for (const r of salesData) {
    if (!r.visit_date) continue
    const m = r.visit_date.substring(0, 7) // "2025-01"
    if (!monthly[m]) monthly[m] = { count: 0, totalCost: 0 }
    monthly[m].count++
    monthly[m].totalCost += r.total_cost || 0
  }
  const sorted = Object.keys(monthly).sort()
  return sorted.map(m => ({
    month: m,
    count: monthly[m].count,
    avgCost: parseFloat((monthly[m].totalCost / monthly[m].count).toFixed(2))
  }))
}

/**
 * 满意度分布（1-5 分各多少人）
 */
export function computeSatisfactionDist(salesData) {
  const dist = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  for (const r of salesData) {
    const s = String(r.satisfaction || '3')
    if (dist[s] !== undefined) dist[s]++
  }
  return dist
}

/**
 * 游客画像（年龄/性别/团队规模分布）
 */
export function computeVisitorProfile(salesData) {
  // 年龄分布
  const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 }
  const genderCount = { '男': 0, '女': 0 }
  const groupSizeCount = {}

  for (const r of salesData) {
    const age = r.age || 30
    if (age <= 25) ageGroups['18-25']++
    else if (age <= 35) ageGroups['26-35']++
    else if (age <= 45) ageGroups['36-45']++
    else if (age <= 55) ageGroups['46-55']++
    else ageGroups['56+']++

    const gender = r.gender || '未知'
    if (genderCount[gender] !== undefined) genderCount[gender]++

    const gs = r.group_size || 1
    groupSizeCount[gs] = (groupSizeCount[gs] || 0) + 1
  }

  return { ageGroups, genderCount, groupSizeCount }
}

/**
 * 三个景点的对比数据
 */
export function computeSpotComparison(salesData) {
  const spots = {}
  for (const r of salesData) {
    const name = r.attraction_name
    if (!spots[name]) spots[name] = []
    spots[name].push(r)
  }

  const result = {}
  for (const [name, data] of Object.entries(spots)) {
    const stats = computeStats(data)
    const structure = computeCostStructure(data)
    result[name] = {
      count: data.length,
      avgCost: stats.avgTotalCost,
      avgSatisfaction: stats.avgSatisfaction,
      costStructure: structure
    }
  }
  return result
}

const marketingAPI = {
  getAllSales,
  getSalesBySpot,
  computeStats,
  computeCostStructure,
  computeMonthlyTrend,
  computeSatisfactionDist,
  computeVisitorProfile,
  computeSpotComparison
}

export default marketingAPI
