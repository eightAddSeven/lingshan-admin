/**
 * 知识库 API
 *
 * 优先通过云函数（quickstartFunctions）读写 knowledge/knowledge_full 集合，
 * 云函数享有管理员权限，不受匿名用户安全规则限制。
 * 云函数不可用时降级为直接数据库操作。
 *
 * 注意：文档字段用 { doc: {...} } 包裹传给云函数，
 * 避免文档中的 type 等字段与云函数 dispatch 的 type 冲突。
 *
 * 每次写入后自动回读验证，Console 输出完整诊断链路。
 */
import { app, db, isCloudBaseReady } from './cloudbase'
import { wrapError, extractErrorMessage } from './utils'

const VALID_COLLECTIONS = ['knowledge', 'knowledge_full']

function log(...args) {
  console.log('[Knowledge]', ...args)
}

// ==================== 读取 ====================

export async function getList({ collection = 'knowledge', page = 1, pageSize = 20 } = {}) {
  if (!VALID_COLLECTIONS.includes(collection)) {
    throw new Error(`无效的集合名: ${collection}`)
  }

  log('📋 获取列表 | 集合:', collection, '| 页码:', page, '| CloudBase就绪:', isCloudBaseReady())

  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getKnowledgeList', collection, page, pageSize }
      })
      const result = res.result || {}
      if (result.code === 200) {
        log('✅ 云函数查询成功, total:', result.total)
        return { list: result.list || [], total: result.total || 0, page, pageSize }
      }
      log('⚠️ 云函数返回非200:', JSON.stringify(result))
    } catch (err) {
      log('⚠️ 云函数调用失败，降级直接DB:', err?.message || err)
    }
  }

  try {
    const coll = db.collection(collection)
    const countRes = await coll.count()
    const total = countRes.total || 0
    const { data } = await coll.skip((page - 1) * pageSize).limit(pageSize).get()
    log('✅ 直接DB查询成功, total:', total)
    return { list: data || [], total, page, pageSize }
  } catch (err) {
    log('❌ 直接DB查询失败:', extractErrorMessage(err))
    return { list: [], total: 0, page, pageSize }
  }
}

export async function getDetail(collection, id) {
  if (!id) throw new Error('缺少文档 ID')
  if (!VALID_COLLECTIONS.includes(collection)) {
    throw new Error(`无效的集合名: ${collection}`)
  }

  log('🔍 获取详情 | 集合:', collection, '| id:', id)

  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'getKnowledgeDetail', collection, id }
      })
      const result = res.result || {}
      if (result.code === 200 && result.data) {
        log('✅ 云函数获取详情成功')
        return result.data
      }
      log('⚠️ 云函数获取详情失败:', JSON.stringify(result))
    } catch (err) {
      log('⚠️ 云函数调用失败，降级直接DB:', err?.message || err)
    }
  }

  try {
    const { data } = await db.collection(collection).doc(id).get()
    if (!data || data.length === 0) throw new Error('知识条目不存在')
    log('✅ 直接DB获取详情成功')
    return data[0]
  } catch (err) {
    log('❌ 获取详情失败:', extractErrorMessage(err))
    throw wrapError(err, '获取知识详情失败')
  }
}

// ==================== 写入 ====================

export async function create(data) {
  const { collection = 'knowledge', ...fields } = data
  if (!VALID_COLLECTIONS.includes(collection)) {
    throw new Error(`无效的集合名: ${collection}`)
  }

  log('➕ 创建知识 | 集合:', collection, '| name:', fields.name, '| CloudBase就绪:', isCloudBaseReady())
  let savedOk = false
  let newId = null

  // ── 路径 1：云函数 ──
  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'createKnowledge', collection, doc: fields }
      })
      const result = res.result || {}
      if (result.code === 200) {
        newId = result._id
        savedOk = true
        log('✅ 云函数创建成功, _id:', newId)
      } else {
        log('⚠️ 云函数返回非200:', JSON.stringify(result))
      }
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('未匹配到接口类型') || msg.includes('not match')) {
        log('⚠️ 云函数未部署 knowledge handler，降级直接DB')
      } else {
        log('⚠️ 云函数调用失败，降级直接DB:', msg)
      }
    }
  } else {
    log('⚠️ CloudBase 未就绪，跳过云函数')
  }

  // ── 路径 2：直接数据库 ──
  if (!savedOk) {
    try {
      const res = await db.collection(collection).add({
        ...fields,
        createTime: new Date(),
        updateTime: new Date()
      })
      newId = res.id
      savedOk = true
      log('✅ 直接DB创建成功, _id:', newId)
    } catch (err) {
      const msg = extractErrorMessage(err)
      log('❌ 直接DB创建失败:', msg)
      if (msg.includes('unauthenticated') || msg.includes('permission denied') || msg.includes('denied')) {
        throw new Error(
          '数据库写入权限不足。请二选一：\n' +
          '①（推荐）部署云函数：微信开发者工具 → cloudfunctions/quickstartFunctions → 右键 → 上传并部署\n' +
          '② 修改集合权限：CloudBase 控制台 → 数据库 → knowledge → 权限 → 设为"所有用户可读写"'
        )
      }
      throw wrapError(err, '创建知识失败')
    }
  }

  // ── 保存后回读验证 ──
  if (newId) {
    try {
      const { data } = await db.collection(collection).doc(newId).get()
      if (data && data.length > 0) {
        const doc = data[0]
        log('🔎 验证通过：文档已存在, name:', doc.name, '| createTime:', doc.createTime)
        if (!doc.createTime) {
          log('❌ 写入疑似静默失败：createTime 未设置！')
          throw new Error(
            '数据未能真正写入数据库（CloudBase 权限静默拒绝）。\n\n' +
            '👉 解决方法：CloudBase 控制台 → 云函数 → 权限设置 → 开启「未登录用户可访问云函数」'
          )
        }
        // 验证关键字段匹配
        if (doc.name !== fields.name) {
          log('❌ 验证失败：name 不匹配！期望:', fields.name, '实际:', doc.name)
          throw new Error('创建验证失败：数据库中的 name 与提交值不一致')
        }
      } else {
        log('❌ 验证失败：创建后未找到文档！')
        throw new Error(
          '创建后无法读取文档。请检查：\n' +
          '① CloudBase 控制台 → 数据库 → knowledge → 权限 → "read"设为"auth != null"\n' +
          '② CloudBase 控制台 → 云函数 → 开启"未登录用户可访问"'
        )
      }
    } catch (e) {
      // 我们自己抛出的错误直接向上传播
      if (e.message && (e.message.includes('数据未能真正写入') || e.message.includes('验证失败') || e.message.includes('无法读取'))) {
        throw e
      }
      log('⚠️ 验证读取失败（可能权限不足）:', e?.message || e)
    }
  }

  return { _id: newId }
}

export async function update(data) {
  const { id, collection = 'knowledge', _id, ...fields } = data
  const docId = id || _id
  if (!docId) throw new Error('缺少文档 ID')
  if (!VALID_COLLECTIONS.includes(collection)) {
    throw new Error(`无效的集合名: ${collection}`)
  }

  log('✏️ 更新知识 | 集合:', collection, '| docId:', docId, '| name:', fields.name, '| CloudBase就绪:', isCloudBaseReady())
  let savedOk = false

  // ── 路径 1：云函数 ──
  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'updateKnowledge', id: docId, collection, doc: fields }
      })
      const result = res.result || {}
      if (result.code === 200) {
        savedOk = true
        log('✅ 云函数更新成功')
      } else {
        log('⚠️ 云函数返回非200:', JSON.stringify(result))
      }
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('未匹配到接口类型') || msg.includes('not match')) {
        log('⚠️ 云函数未部署 knowledge handler，降级直接DB')
      } else {
        log('⚠️ 云函数调用失败，降级直接DB:', msg)
      }
    }
  } else {
    log('⚠️ CloudBase 未就绪，跳过云函数')
  }

  // ── 路径 2：直接数据库 ──
  const updateTime = new Date()
  if (!savedOk) {
    try {
      await db.collection(collection).doc(docId).update({
        ...fields,
        updateTime
      })
      savedOk = true
      log('✅ 直接DB update() 返回成功')
    } catch (err) {
      const msg = extractErrorMessage(err)
      log('❌ 直接DB更新失败:', msg)
      if (msg.includes('unauthenticated') || msg.includes('permission denied') || msg.includes('denied')) {
        throw new Error(
          '数据库写入权限不足。请二选一：\n' +
          '①（推荐）开启云函数访问：CloudBase 控制台 → 云函数 → 权限 → 开启"未登录用户可访问"\n' +
          '② 修改集合权限：CloudBase 控制台 → 数据库 → knowledge → 权限 → 设为"所有用户可读写"'
        )
      }
      throw wrapError(err, '更新知识失败')
    }
  }

  // ── 保存后回读验证（检测静默失败）───
  try {
    const { data } = await db.collection(collection).doc(docId).get()
    if (data && data.length > 0) {
      const doc = data[0]
      log('🔎 验证回读 name:', doc.name, '| updateTime:', doc.updateTime)

      // 关键检测：如果 updateTime 没变，说明写入被 CloudBase 静默拒绝
      if (!doc.updateTime || new Date(doc.updateTime).getTime() < updateTime.getTime() - 1000) {
        log('❌ 写入疑似静默失败：updateTime 未更新！')
        throw new Error(
          '数据未能真正写入数据库（CloudBase 权限静默拒绝）。\n\n' +
          '👉 解决方法：CloudBase 控制台 → 云函数 → 权限设置 → 开启「未登录用户可访问云函数」\n' +
          '   这样管理端就能通过云函数（管理员权限）写入知识库，不再依赖匿名用户权限。'
        )
      }

      if (doc.name === fields.name) {
        log('✅ 验证通过：数据库已更新')
      } else {
        log('❌ 验证失败：name 不匹配！期望:', fields.name, '实际:', doc.name)
      }
    } else {
      log('❌ 验证失败：文档不存在！')
    }
  } catch (e) {
    // 如果是我们自己抛出的静默失败错误，继续抛出
    if (e.message && e.message.includes('数据未能真正写入')) {
      throw e
    }
    log('⚠️ 验证读取失败（可能权限不足）:', e?.message || e)
  }

  return { success: true }
}

export async function remove(collection, id) {
  if (!id) throw new Error('缺少文档 ID')
  if (!VALID_COLLECTIONS.includes(collection)) {
    throw new Error(`无效的集合名: ${collection}`)
  }

  log('🗑️ 删除知识 | 集合:', collection, '| id:', id, '| CloudBase就绪:', isCloudBaseReady())
  let deletedOk = false

  // ── 路径 1：云函数 ──
  if (isCloudBaseReady()) {
    try {
      const res = await app.callFunction({
        name: 'quickstartFunctions',
        data: { type: 'deleteKnowledge', collection, id }
      })
      const result = res.result || {}
      if (result.code === 200) {
        deletedOk = true
        log('✅ 云函数删除成功')
      } else {
        log('⚠️ 云函数返回非200:', JSON.stringify(result))
      }
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('未匹配到接口类型') || msg.includes('not match')) {
        log('⚠️ 云函数未部署 knowledge handler，降级直接DB')
      } else {
        log('⚠️ 云函数调用失败，降级直接DB:', msg)
      }
    }
  }

  // ── 路径 2：直接数据库 ──
  if (!deletedOk) {
    try {
      await db.collection(collection).doc(id).remove()
      deletedOk = true
      log('✅ 直接DB删除成功')
    } catch (err) {
      const msg = extractErrorMessage(err)
      log('❌ 直接DB删除失败:', msg)
      if (msg.includes('unauthenticated') || msg.includes('permission denied') || msg.includes('denied')) {
        throw new Error(
          '数据库写入权限不足。请二选一：\n' +
          '①（推荐）部署云函数：微信开发者工具 → cloudfunctions/quickstartFunctions → 右键 → 上传并部署\n' +
          '② 修改集合权限：CloudBase 控制台 → 数据库 → knowledge → 权限 → 设为"所有用户可读写"'
        )
      }
      throw wrapError(err, '删除知识失败')
    }
  }

  // ── 删除后验证 ──
  try {
    const { data } = await db.collection(collection).doc(id).get()
    if (data && data.length > 0) {
      log('❌ 验证失败：文档仍然存在！删除可能被 CloudBase 静默拒绝')
      throw new Error(
        '删除未生效：文档仍然存在于数据库。\n\n' +
        '👉 解决方法：CloudBase 控制台 → 数据库 → knowledge → 权限 → "write"设为"auth != null"\n' +
        '   或开启云函数未登录访问，让删除通过云函数（管理员权限）执行。'
      )
    }
    log('✅ 验证通过：文档已删除')
  } catch (e) {
    // 我们自己抛出的错误直接传播
    if (e.message && e.message.includes('删除未生效')) {
      throw e
    }
    // 文档不存在时会抛异常，这是预期行为
    log('✅ 验证通过：文档已删除（查询报错符合预期）')
  }

  return { success: true }
}

const knowledgeAPI = { getList, getDetail, create, update, remove }
export default knowledgeAPI
