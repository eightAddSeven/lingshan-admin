/**
 * FAQ API — 直接操作 CloudBase faqs 集合
 *
 * 每条 FAQ 是 faqs 集合中的一个独立文档：
 *   { _id, q, a, createTime, updateTime }
 *
 * 数据库不可用时降级到内置默认 FAQ（与小程序云函数 hardAnswers 一致）
 */
import { db } from './cloudbase'
import { wrapError, extractErrorMessage } from './utils'

// 内置默认 FAQ（数据库不可用时的兜底显示 + 首次自动写入数据库的种子数据）
const DEFAULT_FAQ = [
  { _id: '_default_1', q: '佛教文化博览馆讲解时间', a: '佛教文化博览馆提供免费讲解服务，讲解时段为9:30、11:00、14:30、16:00，无需预约，在一层入口集合即可。' },
  { _id: '_default_2', q: '博物馆讲解时间', a: '佛教文化博览馆的免费讲解时段为9:30、11:00、14:30、16:00，在一层入口集合，无需预约～' },
  { _id: '_default_3', q: '博览馆有免费讲解吗', a: '有的！博览馆每天有4场免费讲解，分别是9:30、11:00、14:30、16:00，在一层入口集合即可，无需预约。' },
  { _id: '_default_4', q: '灵山大佛多高', a: '灵山大佛通高88米，佛体79米，莲花瓣9米，总高101.5米，是世界最高露天青铜释迦牟尼立像。' }
]

// 用于写入数据库的种子数据（不含 _id，让数据库自动生成）
const SEED_FAQ = DEFAULT_FAQ.map(({ q, a }) => ({ q, a }))

const COLLECTION = 'faqs'

/**
 * 获取全部 FAQ 列表
 */
export async function getFAQList() {
  try {
    const { data } = await db.collection(COLLECTION).limit(200).get()
    if (data && data.length > 0) return data

    // 数据库可访问但集合为空 → 自动写入 4 条默认 FAQ
    console.log('[FAQ] faqs 集合为空，自动写入默认数据...')
    const now = new Date()
    for (const item of SEED_FAQ) {
      await db.collection(COLLECTION).add({
        q: item.q,
        a: item.a,
        createTime: now,
        updateTime: now
      })
    }
    console.log('[FAQ] 默认 FAQ 已写入数据库')
    // 重新读取，返回带 _id 的文档
    const { data: seeded } = await db.collection(COLLECTION).limit(200).get()
    return seeded || [...DEFAULT_FAQ]
  } catch (err) {
    const msg = extractErrorMessage(err)
    console.warn('[FAQ] 数据库访问失败，使用内置默认 FAQ:', msg)
    return [...DEFAULT_FAQ]
  }
}

/**
 * 新增 FAQ
 */
export async function addFAQ({ q, a }) {
  try {
    const res = await db.collection(COLLECTION).add({
      q: q.trim(),
      a: a.trim(),
      createTime: new Date(),
      updateTime: new Date()
    })
    return { _id: res.id }
  } catch (err) {
    throw wrapError(err, '新增FAQ失败')
  }
}

/**
 * 更新 FAQ
 */
export async function updateFAQ(id, { q, a }) {
  try {
    await db.collection(COLLECTION).doc(id).update({
      q: q.trim(),
      a: a.trim(),
      updateTime: new Date()
    })
    return { success: true }
  } catch (err) {
    throw wrapError(err, '更新FAQ失败')
  }
}

/**
 * 删除 FAQ
 */
export async function removeFAQ(id) {
  try {
    await db.collection(COLLECTION).doc(id).remove()
    return { success: true }
  } catch (err) {
    throw wrapError(err, '删除FAQ失败')
  }
}

const faqAPI = { getFAQList, addFAQ, updateFAQ, removeFAQ }
export default faqAPI
