/**
 * 知识库 API — 直接操作 CloudBase 数据库
 * 支持 knowledge 和 knowledge_full 两个集合
 *
 * 注意：CloudBase Web SDK 不支持 db.RegExp，搜索改为前端过滤。
 */
import { db } from './cloudbase'
import { wrapError, extractErrorMessage } from './utils'

const VALID_COLLECTIONS = ['knowledge', 'knowledge_full']

/**
 * 获取知识列表（分页）
 * 关键词搜索由前端 KnowledgeList.vue 做客户端过滤
 *
 * 若数据库不可用（权限不足、未登录等），返回空列表而非抛出异常，
 * 让页面能正常渲染空状态，而不是崩溃报错。
 */
export async function getList({ collection = 'knowledge', page = 1, pageSize = 20 } = {}) {
  try {
    if (!VALID_COLLECTIONS.includes(collection)) {
      throw new Error(`无效的集合名: ${collection}`)
    }

    const coll = db.collection(collection)

    const countRes = await coll.count()
    const total = countRes.total || 0

    const { data } = await coll
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return { list: data || [], total, page, pageSize }
  } catch (err) {
    const msg = extractErrorMessage(err)
    console.warn('[Knowledge] 查询失败（可能需在 CloudBase 控制台配置数据库权限）:', msg)
    // 返回空列表，不阻断页面渲染
    return { list: [], total: 0, page, pageSize }
  }
}

/**
 * 获取单条知识详情
 */
export async function getDetail(collection, id) {
  try {
    if (!id) throw new Error('缺少文档 ID')
    if (!VALID_COLLECTIONS.includes(collection)) {
      throw new Error(`无效的集合名: ${collection}`)
    }
    const { data } = await db.collection(collection).doc(id).get()
    if (!data || data.length === 0) {
      throw new Error('知识条目不存在')
    }
    return data[0]
  } catch (err) {
    const msg = extractErrorMessage(err)
    if (msg.includes('unauthenticated') || msg.includes('permission denied')) {
      console.warn('[Knowledge] 数据库权限不足，请在 CloudBase 控制台将 knowledge 集合设为所有用户可读')
    }
    throw wrapError(err, '获取知识详情失败')
  }
}

/**
 * 创建新知识
 */
export async function create(data) {
  try {
    const { collection = 'knowledge', ...fields } = data
    if (!VALID_COLLECTIONS.includes(collection)) {
      throw new Error(`无效的集合名: ${collection}`)
    }
    const res = await db.collection(collection).add({
      ...fields,
      createTime: new Date(),
      updateTime: new Date()
    })
    return { _id: res.id }
  } catch (err) {
    const msg = extractErrorMessage(err)
    if (msg.includes('unauthenticated') || msg.includes('permission denied')) {
      console.warn('[Knowledge] 写入权限不足，请在 CloudBase 控制台配置数据库写权限')
    }
    throw wrapError(err, '创建知识失败')
  }
}

/**
 * 更新知识
 */
export async function update(data) {
  try {
    const { id, collection = 'knowledge', _id, ...fields } = data
    const docId = id || _id
    if (!docId) throw new Error('缺少文档 ID')
    if (!VALID_COLLECTIONS.includes(collection)) {
      throw new Error(`无效的集合名: ${collection}`)
    }
    await db.collection(collection).doc(docId).update({
      ...fields,
      updateTime: new Date()
    })
    return { success: true }
  } catch (err) {
    const msg = extractErrorMessage(err)
    if (msg.includes('unauthenticated') || msg.includes('permission denied')) {
      console.warn('[Knowledge] 写入权限不足，请在 CloudBase 控制台配置数据库写权限')
    }
    throw wrapError(err, '更新知识失败')
  }
}

/**
 * 删除知识条目
 */
export async function remove(collection, id) {
  try {
    if (!id) throw new Error('缺少文档 ID')
    if (!VALID_COLLECTIONS.includes(collection)) {
      throw new Error(`无效的集合名: ${collection}`)
    }
    await db.collection(collection).doc(id).remove()
    return { success: true }
  } catch (err) {
    const msg = extractErrorMessage(err)
    if (msg.includes('unauthenticated') || msg.includes('permission denied')) {
      console.warn('[Knowledge] 写入权限不足，请在 CloudBase 控制台配置数据库写权限')
    }
    throw wrapError(err, '删除知识失败')
  }
}

const knowledgeAPI = { getList, getDetail, create, update, remove }
export default knowledgeAPI
