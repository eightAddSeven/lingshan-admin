/**
 * FAQ API
 * 优先通过云函数（quickstartFunctions）读写 faqs 集合，
 * 云函数享有管理员权限，不受匿名用户安全规则限制。
 * 云函数不可用时降级为直接数据库操作。
 */
import { app, db, isCloudBaseReady } from './cloudbase'
import { wrapError, extractErrorMessage } from './utils'

const COLLECTION = 'faqs'

// 内置默认 FAQ（数据库不可用时的兜底 + 首次自动写入的种子数据）
const SEED_FAQ = [
  { q: '佛教文化博览馆讲解时间', a: '佛教文化博览馆提供免费讲解服务，讲解时段为9:30、11:00、14:30、16:00，无需预约，在一层入口集合即可。' },
  { q: '博物馆讲解时间', a: '佛教文化博览馆的免费讲解时段为9:30、11:00、14:30、16:00，在一层入口集合，无需预约～' },
  { q: '博览馆有免费讲解吗', a: '有的！博览馆每天有4场免费讲解，分别是9:30、11:00、14:30、16:00，在一层入口集合即可，无需预约。' },
  { q: '灵山大佛多高', a: '灵山大佛通高88米，佛体79米，莲花瓣9米，总高101.5米，是世界最高露天青铜释迦牟尼立像。' }
]

function log(...args) {
  console.log('[FAQ]', ...args)
}

// ==================== 读取 ====================

export async function getFAQList() {
  log('📋 获取FAQ列表 | CloudBase就绪:', isCloudBaseReady())

  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getFAQList' }
      })
      const result = res.result || {}
      if (result.code === 200) {
        log('✅ 云函数查询成功, count:', result.list?.length || 0)
        return result.list || []
      }
      log('⚠️ 云函数返回非200:', JSON.stringify(result))
    } catch (err) {
      log('⚠️ 云函数调用失败，降级直接DB:', err?.message || err)
    }
  }

  try {
    const { data } = await db.collection(COLLECTION).limit(200).get()
    if (data && data.length > 0) {
      log('✅ 直接DB查询成功, count:', data.length)
      return data
    }

    // 集合为空 → 自动写入种子数据
    log('📝 faqs 集合为空，自动写入种子数据...')
    const now = new Date()
    for (const item of SEED_FAQ) {
      await db.collection(COLLECTION).add({
        q: item.q, a: item.a,
        createTime: now, updateTime: now
      })
    }
    const { data: seeded } = await db.collection(COLLECTION).limit(200).get()
    log('✅ 种子数据写入完成, count:', seeded?.length || 0)
    return seeded || SEED_FAQ.map((item, i) => ({ _id: `_default_${i + 1}`, ...item }))
  } catch (err) {
    log('❌ 直接DB查询失败，使用内置默认FAQ:', extractErrorMessage(err))
    return SEED_FAQ.map((item, i) => ({ _id: `_default_${i + 1}`, ...item }))
  }
}

// ==================== 写入 ====================

export async function addFAQ({ q, a }) {
  if (!q?.trim() || !a?.trim()) throw new Error('问题和回答不能为空')
  log('➕ 新增FAQ | q:', q, '| CloudBase就绪:', isCloudBaseReady())

  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'addFAQ', q: q.trim(), a: a.trim() }
      })
      const result = res.result || {}
      if (result.code === 200) {
        log('✅ 云函数创建成功, _id:', result._id)
        return { _id: result._id }
      }
      log('⚠️ 云函数返回非200:', JSON.stringify(result))
    } catch (err) {
      log('⚠️ 云函数调用失败，降级直接DB:', err?.message || err)
    }
  }

  try {
    const res = await db.collection(COLLECTION).add({
      q: q.trim(), a: a.trim(),
      createTime: new Date(), updateTime: new Date()
    })
    log('✅ 直接DB创建成功, _id:', res.id)
    return { _id: res.id }
  } catch (err) {
    throw wrapError(err, '新增FAQ失败')
  }
}

export async function updateFAQ(id, { q, a }) {
  if (!id) throw new Error('缺少文档 ID')
  log('✏️ 更新FAQ | id:', id, '| CloudBase就绪:', isCloudBaseReady())

  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'updateFAQ', id, q: q.trim(), a: a.trim() }
      })
      const result = res.result || {}
      if (result.code === 200) {
        log('✅ 云函数更新成功')
        return { success: true }
      }
      log('⚠️ 云函数返回非200:', JSON.stringify(result))
    } catch (err) {
      log('⚠️ 云函数调用失败，降级直接DB:', err?.message || err)
    }
  }

  try {
    await db.collection(COLLECTION).doc(id).update({
      q: q.trim(), a: a.trim(),
      updateTime: new Date()
    })
    log('✅ 直接DB更新成功')
    return { success: true }
  } catch (err) {
    throw wrapError(err, '更新FAQ失败')
  }
}

export async function removeFAQ(id) {
  if (!id) throw new Error('缺少文档 ID')
  log('🗑️ 删除FAQ | id:', id, '| CloudBase就绪:', isCloudBaseReady())

  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'deleteFAQ', id }
      })
      const result = res.result || {}
      if (result.code === 200) {
        log('✅ 云函数删除成功')
        return { success: true }
      }
      log('⚠️ 云函数返回非200:', JSON.stringify(result))
    } catch (err) {
      log('⚠️ 云函数调用失败，降级直接DB:', err?.message || err)
    }
  }

  try {
    await db.collection(COLLECTION).doc(id).remove()
    log('✅ 直接DB删除成功')
    return { success: true }
  } catch (err) {
    throw wrapError(err, '删除FAQ失败')
  }
}

const faqAPI = { getFAQList, addFAQ, updateFAQ, removeFAQ }
export default faqAPI
