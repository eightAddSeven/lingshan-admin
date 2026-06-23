/**
 * 知识库 API
 * 优先通过云函数（quickstartFunctions）读写 knowledge/knowledge_full 集合，
 * 云函数享有管理员权限，不受匿名用户安全规则限制。
 * 云函数不可用时降级为直接数据库操作。
 *
 * 注意：文档字段用 { doc: {...} } 包裹传给云函数，
 * 避免文档中的 type、collection 等字段与云函数 dispatch 的 type 冲突。
 *
 * 支持 knowledge 和 knowledge_full 两个集合
 */
import { app, db, isCloudBaseReady } from './cloudbase'
import { wrapError, extractErrorMessage } from './utils'

const VALID_COLLECTIONS = ['knowledge', 'knowledge_full']

/**
 * 获取知识列表（分页）
 * 优先云函数，失败则降级直接数据库
 */
export async function getList({ collection = 'knowledge', page = 1, pageSize = 20 } = {}) {
  if (!VALID_COLLECTIONS.includes(collection)) {
    throw new Error(`无效的集合名: ${collection}`)
  }

  // 尝试云函数
  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getKnowledgeList', collection, page, pageSize }
      })
      const result = res.result || {}
      if (result.code === 200) {
        return { list: result.list || [], total: result.total || 0, page, pageSize }
      }
      console.warn('[Knowledge] 云函数查询失败，降级到直接数据库:', result.msg)
    } catch (err) {
      console.warn('[Knowledge] 云函数调用失败，降级到直接数据库:', err?.message || err)
    }
  }

  // 降级：直接数据库
  try {
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
    console.warn('[Knowledge] 数据库查询失败（可能需在 CloudBase 控制台配置权限）:', msg)
    return { list: [], total: 0, page, pageSize }
  }
}

/**
 * 获取单条知识详情
 */
export async function getDetail(collection, id) {
  if (!id) throw new Error('缺少文档 ID')
  if (!VALID_COLLECTIONS.includes(collection)) {
    throw new Error(`无效的集合名: ${collection}`)
  }

  // 尝试云函数
  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getKnowledgeDetail', collection, id }
      })
      const result = res.result || {}
      if (result.code === 200 && result.data) {
        return result.data
      }
      console.warn('[Knowledge] 云函数获取详情失败，降级到直接数据库:', result.msg)
    } catch (err) {
      console.warn('[Knowledge] 云函数调用失败，降级到直接数据库:', err?.message || err)
    }
  }

  // 降级：直接数据库
  try {
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
 * 创建新知识（优先云函数，降级直接数据库）
 */
export async function create(data) {
  const { collection = 'knowledge', ...fields } = data
  if (!VALID_COLLECTIONS.includes(collection)) {
    throw new Error(`无效的集合名: ${collection}`)
  }

  // 尝试云函数（doc 包裹避免 type 字段冲突）
  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'createKnowledge', collection, doc: fields }
      })
      const result = res.result || {}
      if (result.code === 200) {
        return { _id: result._id }
      }
      throw new Error(result.msg || '云函数返回异常')
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('未匹配到接口类型') || msg.includes('not match')) {
        console.warn('[Knowledge] 云函数未更新，降级到直接数据库')
      } else {
        console.warn('[Knowledge] 云函数创建失败，降级到直接数据库:', msg)
      }
    }
  }

  // 降级：直接数据库
  try {
    const res = await db.collection(collection).add({
      ...fields,
      createTime: new Date(),
      updateTime: new Date()
    })
    return { _id: res.id }
  } catch (err) {
    const msg = extractErrorMessage(err)
    if (msg.includes('unauthenticated') || msg.includes('permission denied')) {
      throw new Error(
        '数据库写入权限不足。请二选一：\n' +
        '①（推荐）部署云函数：微信开发者工具 → cloudfunctions/quickstartFunctions → 右键 → 上传并部署\n' +
        '② 修改集合权限：CloudBase 控制台 → 数据库 → knowledge → 权限 → 设为"所有用户可读写"'
      )
    }
    throw wrapError(err, '创建知识失败')
  }
}

/**
 * 更新知识（优先云函数，降级直接数据库）
 */
export async function update(data) {
  const { id, collection = 'knowledge', _id, ...fields } = data
  const docId = id || _id
  if (!docId) throw new Error('缺少文档 ID')
  if (!VALID_COLLECTIONS.includes(collection)) {
    throw new Error(`无效的集合名: ${collection}`)
  }

  // 尝试云函数（doc 包裹避免 type 字段冲突）
  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'updateKnowledge', id: docId, collection, doc: fields }
      })
      const result = res.result || {}
      if (result.code === 200) {
        return { success: true }
      }
      throw new Error(result.msg || '云函数返回异常')
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('未匹配到接口类型') || msg.includes('not match')) {
        console.warn('[Knowledge] 云函数未更新，降级到直接数据库')
      } else {
        console.warn('[Knowledge] 云函数更新失败，降级到直接数据库:', msg)
      }
    }
  }

  // 降级：直接数据库
  try {
    await db.collection(collection).doc(docId).update({
      ...fields,
      updateTime: new Date()
    })
    return { success: true }
  } catch (err) {
    const msg = extractErrorMessage(err)
    if (msg.includes('unauthenticated') || msg.includes('permission denied')) {
      throw new Error(
        '数据库写入权限不足。请二选一：\n' +
        '①（推荐）部署云函数：微信开发者工具 → cloudfunctions/quickstartFunctions → 右键 → 上传并部署\n' +
        '② 修改集合权限：CloudBase 控制台 → 数据库 → knowledge → 权限 → 设为"所有用户可读写"'
      )
    }
    throw wrapError(err, '更新知识失败')
  }
}

/**
 * 删除知识条目（优先云函数，降级直接数据库）
 */
export async function remove(collection, id) {
  if (!id) throw new Error('缺少文档 ID')
  if (!VALID_COLLECTIONS.includes(collection)) {
    throw new Error(`无效的集合名: ${collection}`)
  }

  // 尝试云函数
  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'deleteKnowledge', collection, id }
      })
      const result = res.result || {}
      if (result.code === 200) {
        return { success: true }
      }
      throw new Error(result.msg || '云函数返回异常')
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('未匹配到接口类型') || msg.includes('not match')) {
        console.warn('[Knowledge] 云函数未更新，降级到直接数据库')
      } else {
        console.warn('[Knowledge] 云函数删除失败，降级到直接数据库:', msg)
      }
    }
  }

  // 降级：直接数据库
  try {
    await db.collection(collection).doc(id).remove()
    return { success: true }
  } catch (err) {
    const msg = extractErrorMessage(err)
    if (msg.includes('unauthenticated') || msg.includes('permission denied')) {
      throw new Error(
        '数据库写入权限不足。请二选一：\n' +
        '①（推荐）部署云函数：微信开发者工具 → cloudfunctions/quickstartFunctions → 右键 → 上传并部署\n' +
        '② 修改集合权限：CloudBase 控制台 → 数据库 → knowledge → 权限 → 设为"所有用户可读写"'
      )
    }
    throw wrapError(err, '删除知识失败')
  }
}

const knowledgeAPI = { getList, getDetail, create, update, remove }
export default knowledgeAPI
